/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import useAuth from './useAuth'
import { writeBook, deleteBook, fetchBooks, processSyncQueue } from '../lib/pdsSync'
import { logActivity, bootstrapFromBooks } from '../lib/activityLog'
import { enrichSubjects } from '../lib/importers'

const STORAGE_KEY = 'shelfwise-books'
const BooksContext = createContext()

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
  } catch {
    return []
  }
}

export function BooksProvider({ children }) {
  const [books, setBooks] = useState(load)
  const auth = useAuth()
  const hasBootstrapped = useRef(false)

  // Bootstrap activity log and deduplicate on first mount
  useEffect(() => {
    if (!hasBootstrapped.current && books.length > 0) {
      hasBootstrapped.current = true
      bootstrapFromBooks(books)

      // Deduplicate existing books by title+author (keep the one with the best data)
      const seen = new Map()
      const dupeKeys = []
      for (const book of books) {
        const ta = `${(book.title || '').toLowerCase().trim()}|${(book.author || '').toLowerCase().trim()}`
        if (!ta || ta === '|') continue
        if (seen.has(ta)) {
          const existing = seen.get(ta)
          // Keep the one with more data (OL key, cover, ratings, subjects)
          const existingScore = (existing.key?.startsWith('/works/') ? 2 : 0) + (existing.coverId ? 1 : 0) + (existing.ratings?.overall ? 1 : 0) + ((existing.subjects?.length || 0) > 0 ? 1 : 0)
          const newScore = (book.key?.startsWith('/works/') ? 2 : 0) + (book.coverId ? 1 : 0) + (book.ratings?.overall ? 1 : 0) + ((book.subjects?.length || 0) > 0 ? 1 : 0)
          if (newScore > existingScore) {
            // New one is better — merge data from old, mark old as dupe
            dupeKeys.push(existing.key)
            seen.set(ta, { ...book, shelf: book.shelf || existing.shelf, ratings: { ...existing.ratings, ...book.ratings }, notes: book.notes || existing.notes, startedAt: book.startedAt || existing.startedAt, finishedAt: book.finishedAt || existing.finishedAt })
          } else {
            // Existing is better — mark new as dupe
            dupeKeys.push(book.key)
          }
        } else {
          seen.set(ta, book)
        }
      }

      if (dupeKeys.length > 0) {
        const keysToRemove = new Set(dupeKeys)
        const mergedData = new Map([...seen.values()].map((b) => [b.key, b]))
        Promise.resolve().then(() => {
          setBooks((prev) => prev
            .filter((b) => !keysToRemove.has(b.key))
            .map((b) => mergedData.has(b.key) ? { ...b, ...mergedData.get(b.key) } : b)
          )
        })
      }
    }
  }, [books])
  const hasSynced = useRef(false)

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books))
  }, [books])

  // On auth, sync from PDS and process queued writes
  useEffect(() => {
    if (!auth?.isAuthenticated || !auth.agent || !auth.did || hasSynced.current) return
    hasSynced.current = true

    async function sync() {
      try {
        // Process any pending writes first
        await processSyncQueue(auth.agent, auth.did)

        // Fetch books from PDS
        const pdsBooks = await fetchBooks(auth.agent, auth.did)

        let mergedBooks = []
        setBooks((prev) => {
          // Merge: PDS is source of truth, but keep local-only books
          const pdsKeys = new Set(pdsBooks.map((b) => b.key))
          const pdsTitles = new Set(
            pdsBooks.map((b) => `${(b.title || '').toLowerCase().trim()}|${(b.author || '').toLowerCase().trim()}`)
          )

          // Local-only: not on PDS by key AND not a title+author duplicate
          const localOnly = prev.filter((b) => {
            if (pdsKeys.has(b.key)) return false
            const ta = `${(b.title || '').toLowerCase().trim()}|${(b.author || '').toLowerCase().trim()}`
            if (ta !== '|' && pdsTitles.has(ta)) return false
            return true
          })

          mergedBooks = [...pdsBooks, ...localOnly]

          // Sync truly local-only books UP to PDS
          for (const book of localOnly) {
            writeBook(auth.agent, auth.did, book).catch(() => {})
          }

          return mergedBooks
        })

        // Background: enrich books missing subjects (genres)
        const needsEnrichment = mergedBooks.filter(
          (b) => (!b.subjects || b.subjects.length === 0) && b.title
        )
        if (needsEnrichment.length > 0) {
          enrichSubjects(needsEnrichment).then((enriched) => {
            const enrichedMap = new Map(enriched.map((b) => [b.key, b]))
            setBooks((prev) =>
              prev.map((b) => {
                const e = enrichedMap.get(b.key)
                if (e && e.subjects && e.subjects.length > 0) {
                  const updated = { ...b, subjects: e.subjects, pageCount: e.pageCount || b.pageCount }
                  if (auth?.isAuthenticated && auth.agent && auth.did) {
                    writeBook(auth.agent, auth.did, updated).catch(() => {})
                  }
                  return updated
                }
                return b
              })
            )
          }).catch(() => {})
        }
      } catch {
        // Sync failure is non-fatal — localStorage data is still good
      }
    }
    sync()
  }, [auth])

  // Returns 'added', 'updated', or 'exists' for toast feedback
  const addBook = useCallback((book) => {
    const safeKey = book.key || `/works/local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    if (!safeKey) return 'exists'

    const bookWithKey = {
      ...book,
      key: safeKey,
      ratings: book.ratings || {},
      notes: book.notes || '',
      subjects: book.subjects || [],
      pageCount: book.pageCount || null,
      addedAt: book.addedAt || new Date().toISOString(),
    }

    // Pre-check for duplicate to determine return status
    const titleLower = (book.title || '').toLowerCase().trim()
    const authorLower = (book.author || '').toLowerCase().trim()
    const isDuplicate = books.some(
      (b) => b.key === safeKey ||
        (titleLower && (b.title || '').toLowerCase().trim() === titleLower &&
         (b.author || '').toLowerCase().trim() === authorLower)
    )

    setBooks((prev) => {
      // Check by key first
      const existingByKey = prev.findIndex((b) => b.key === safeKey)
      if (existingByKey !== -1) {
        if (book.shelf) {
          return prev.map((b, i) =>
            i === existingByKey ? { ...b, shelf: book.shelf } : b
          )
        }
        return prev
      }

      // Check by title+author (catches cross-source duplicates)
      const titleLower = (book.title || '').toLowerCase().trim()
      const authorLower = (book.author || '').toLowerCase().trim()
      if (titleLower) {
        const existingByTitle = prev.findIndex(
          (b) => (b.title || '').toLowerCase().trim() === titleLower &&
                 (b.author || '').toLowerCase().trim() === authorLower
        )
        if (existingByTitle !== -1) {
          // Update the existing entry's shelf and merge any new data
          return prev.map((b, i) =>
            i === existingByTitle ? {
              ...b,
              shelf: book.shelf || b.shelf,
              coverId: book.coverId || b.coverId,
              isbn: book.isbn || b.isbn,
              subjects: (book.subjects && book.subjects.length > 0) ? book.subjects : b.subjects,
              key: safeKey.startsWith('/works/') ? safeKey : b.key, // prefer OL key
            } : b
          )
        }
      }

      return [...prev, bookWithKey]
    })

    // Log activity for streaks
    logActivity('add', safeKey)

    // PDS dual-write (fire and forget)
    if (auth?.isAuthenticated && auth.agent && auth.did) {
      writeBook(auth.agent, auth.did, bookWithKey).catch(() => {})
    }

    return isDuplicate ? 'updated' : 'added'
  }, [auth, books])

  const updateBook = useCallback((key, updates) => {
    // Log activity for streaks
    const type = updates.shelf ? 'shelf' : updates.ratings ? 'rate' : 'update'
    logActivity(type, key)

    setBooks((prev) => {
      const updated = prev.map((b) => (b.key === key ? { ...b, ...updates } : b))

      // PDS dual-write
      if (auth?.isAuthenticated && auth.agent && auth.did) {
        const book = updated.find((b) => b.key === key)
        if (book) writeBook(auth.agent, auth.did, book).catch(() => {})
      }

      return updated
    })
  }, [auth])

  const removeBook = useCallback((key) => {
    setBooks((prev) => {
      const book = prev.find((b) => b.key === key)

      // PDS dual-write
      if (book && auth?.isAuthenticated && auth.agent && auth.did) {
        deleteBook(auth.agent, auth.did, book).catch(() => {})
      }

      return prev.filter((b) => b.key !== key)
    })
  }, [auth])

  const getBooksByShelf = useCallback(
    (shelf) => books.filter((b) => b.shelf === shelf),
    [books],
  )

  const importBooks = useCallback((newBooks) => {
    setBooks((prev) => {
      const existingKeys = new Set(prev.map((b) => b.key))
      const existingTitles = new Set(
        prev.map((b) => `${(b.title || '').toLowerCase().trim()}|${(b.author || '').toLowerCase().trim()}`)
      )
      const unique = newBooks.filter((b) => {
        if (existingKeys.has(b.key)) return false
        const ta = `${(b.title || '').toLowerCase().trim()}|${(b.author || '').toLowerCase().trim()}`
        if (existingTitles.has(ta)) return false
        existingTitles.add(ta) // prevent dupes within the import itself
        return true
      })

      // PDS dual-write for imported books
      if (auth?.isAuthenticated && auth.agent && auth.did) {
        for (const book of unique) {
          writeBook(auth.agent, auth.did, book).catch(() => {})
        }
      }

      return [...prev, ...unique]
    })
  }, [auth])

  return (
    <BooksContext.Provider value={{ books, addBook, updateBook, removeBook, getBooksByShelf, importBooks }}>
      {children}
    </BooksContext.Provider>
  )
}

export default function useBooks() {
  return useContext(BooksContext)
}
