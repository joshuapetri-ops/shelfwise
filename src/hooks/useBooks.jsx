/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import useAuth from './useAuth'
import { writeBook, deleteBook, fetchBooks, processSyncQueue } from '../lib/pdsSync'

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

        setBooks((prev) => {
          // Merge: PDS is source of truth, but keep local-only books
          const pdsKeys = new Set(pdsBooks.map((b) => b.key))
          const localOnly = prev.filter((b) => !pdsKeys.has(b.key))
          const merged = [...pdsBooks, ...localOnly]

          // Sync local-only books UP to PDS so they're preserved
          for (const book of localOnly) {
            writeBook(auth.agent, auth.did, book).catch(() => {})
          }

          return merged
        })
      } catch {
        // Sync failure is non-fatal — localStorage data is still good
      }
    }
    sync()
  }, [auth])

  const addBook = useCallback((book) => {
    const safeKey = book.key || `/works/local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    if (!safeKey) return

    const bookWithKey = {
      ...book,
      key: safeKey,
      ratings: book.ratings || {},
      notes: book.notes || '',
      addedAt: book.addedAt || new Date().toISOString(),
    }

    setBooks((prev) => {
      const existingIndex = prev.findIndex((b) => b.key === safeKey)
      if (existingIndex !== -1) {
        if (book.shelf) {
          return prev.map((b, i) =>
            i === existingIndex ? { ...b, shelf: book.shelf } : b
          )
        }
        return prev
      }
      return [...prev, bookWithKey]
    })

    // PDS dual-write (fire and forget)
    if (auth?.isAuthenticated && auth.agent && auth.did) {
      writeBook(auth.agent, auth.did, bookWithKey).catch(() => {})
    }
  }, [auth])

  const updateBook = useCallback((key, updates) => {
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
      const unique = newBooks.filter((b) => !existingKeys.has(b.key))
      return [...prev, ...unique]
    })
  }, [])

  return (
    <BooksContext.Provider value={{ books, addBook, updateBook, removeBook, getBooksByShelf, importBooks }}>
      {children}
    </BooksContext.Provider>
  )
}

export default function useBooks() {
  return useContext(BooksContext)
}
