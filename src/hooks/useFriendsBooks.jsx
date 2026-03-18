/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import useAuth from './useAuth'
import useFollow from './useFollow'

const BSKY_API = 'https://bsky.social/xrpc'
const BOOK_COLLECTION = 'app.shelfwise.book'
const CACHE_KEY = 'shelfwise-friends-books'
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

const FriendsBooksContext = createContext()

function loadCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY))
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }
  } catch { /* ignore */ }
  return null
}

function saveCache(data) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
}

/**
 * Provider that caches followed users' books for quick lookups.
 * Used for "X friends read this" badges on search results.
 */
export function FriendsBooksProvider({ children }) {
  // Map of normalized "title|author" -> [{ did, handle, displayName, avatar, shelf, rating }]
  const [friendsBooks, setFriendsBooks] = useState(() => loadCache() || {})
  const [loading, setLoading] = useState(false)
  const { isAuthenticated, did } = useAuth()
  const followCtx = useFollow()
  const hasFetched = useRef('')

  // Fetch books from all followed users
  useEffect(() => {
    const follows = followCtx?.follows || []
    if (!isAuthenticated || !did || follows.length === 0) return

    // Only re-fetch if follows count changed (user followed someone new)
    const followsKey = follows.map((f) => f.did).sort().join(',')
    if (hasFetched.current === followsKey) return
    hasFetched.current = followsKey
    let cancelled = false

    async function fetchAll() {
      setLoading(true)
      const bookMap = {}
      const BATCH_SIZE = 5

      for (let i = 0; i < follows.length && i < 50; i += BATCH_SIZE) {
        if (cancelled) break
        const batch = follows.slice(i, i + BATCH_SIZE)

        await Promise.allSettled(
          batch.map(async (user) => {
            try {
              const res = await fetch(
                `${BSKY_API}/com.atproto.repo.listRecords?repo=${encodeURIComponent(user.did)}&collection=${BOOK_COLLECTION}&limit=100`
              )
              if (!res.ok) return
              const data = await res.json()

              for (const r of data.records || []) {
                const record = r.value
                if (!record?.title) continue
                const key = `${record.title.toLowerCase().trim()}|${(record.author || '').toLowerCase().trim()}`

                let ratings = {}
                if (record.ratings) {
                  try {
                    ratings = typeof record.ratings === 'string' && record.ratings.trim()
                      ? JSON.parse(record.ratings)
                      : (record.ratings || {})
                  } catch { ratings = {} }
                }

                if (!bookMap[key]) bookMap[key] = []
                bookMap[key].push({
                  did: user.did,
                  handle: user.handle,
                  displayName: user.displayName,
                  avatar: user.avatar,
                  shelf: record.shelf,
                  rating: ratings?.overall || null,
                })
              }
            } catch { /* skip failed users */ }
          })
        )
      }

      if (!cancelled) {
        setFriendsBooks(bookMap)
        saveCache(bookMap)
        setLoading(false)
      }
    }

    fetchAll()
    return () => { cancelled = true }
  }, [isAuthenticated, did, followCtx?.follows])

  /**
   * Get friends who have a specific book.
   * Returns array of { did, handle, displayName, avatar, shelf, rating }
   */
  const getFriendsForBook = useCallback((title, author) => {
    if (!title) return []
    const key = `${title.toLowerCase().trim()}|${(author || '').toLowerCase().trim()}`
    return friendsBooks[key] || []
  }, [friendsBooks])

  return (
    <FriendsBooksContext.Provider value={{ friendsBooks, getFriendsForBook, loading }}>
      {children}
    </FriendsBooksContext.Provider>
  )
}

export default function useFriendsBooks() {
  return useContext(FriendsBooksContext)
}
