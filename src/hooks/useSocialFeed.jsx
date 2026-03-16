import { useState, useEffect, useCallback } from 'react'
import useAuth from './useAuth'

const BSKY_API = 'https://public.api.bsky.app/xrpc'
const BOOK_COLLECTION = 'app.shelfwise.book'

/**
 * Fetch the user's follows from the Bluesky API.
 */
async function fetchFollows(did) {
  const follows = []
  let cursor

  do {
    const params = new URLSearchParams({ actor: did, limit: '100' })
    if (cursor) params.append('cursor', cursor)

    const res = await fetch(`${BSKY_API}/app.bsky.graph.getFollows?${params}`)
    if (!res.ok) break

    const data = await res.json()
    for (const f of data.follows || []) {
      follows.push({
        did: f.did,
        handle: f.handle,
        displayName: f.displayName || f.handle,
        avatar: f.avatar || null,
      })
    }
    cursor = data.cursor
  } while (cursor && follows.length < 200)

  return follows
}

/**
 * Fetch shelfwise book records from a user's PDS.
 */
async function fetchUserBooks(did) {
  try {
    const res = await fetch(
      `https://bsky.social/xrpc/com.atproto.repo.listRecords?repo=${encodeURIComponent(did)}&collection=${BOOK_COLLECTION}&limit=20`
    )
    if (!res.ok) return []

    const data = await res.json()
    return (data.records || []).map((r) => ({
      uri: r.uri,
      record: r.value,
      createdAt: r.value.createdAt,
    }))
  } catch {
    return []
  }
}

/**
 * Convert a book record into a feed event.
 */
function toFeedEvent(user, bookRecord) {
  const record = bookRecord.record
  const shelf = record.shelf

  let action = ''
  if (shelf === 'read') action = 'finished'
  else if (shelf === 'reading') action = 'started reading'
  else if (shelf === 'wantToRead') action = 'wants to read'
  else if (shelf === 'dnf') action = "couldn't finish"
  else action = 'added a book'

  return {
    user: {
      name: user.displayName,
      handle: user.handle,
      avatar: user.avatar,
    },
    action,
    book: {
      title: record.title || 'Unknown',
      author: record.author || '',
      coverId: record.coverId || null,
    },
    timestamp: bookRecord.createdAt
      ? formatTimeAgo(new Date(bookRecord.createdAt))
      : '',
    sortTime: bookRecord.createdAt || '',
  }
}

function formatTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

/**
 * Hook for fetching the social feed.
 * When authenticated, fetches book records directly from followers' PDSes.
 * Falls back to mock data when unauthenticated.
 */
export default function useSocialFeed() {
  const { isAuthenticated, did } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchFeed = useCallback(async () => {
    if (!isAuthenticated || !did) return

    setLoading(true)
    setError(null)

    try {
      // Get who the user follows
      const follows = await fetchFollows(did)

      // Fetch shelfwise books from each followed user (in parallel, max 10 at a time)
      const allEvents = []
      const BATCH_SIZE = 10

      for (let i = 0; i < follows.length; i += BATCH_SIZE) {
        const batch = follows.slice(i, i + BATCH_SIZE)
        const results = await Promise.allSettled(
          batch.map(async (user) => {
            const books = await fetchUserBooks(user.did)
            return books.map((b) => toFeedEvent(user, b))
          })
        )
        for (const result of results) {
          if (result.status === 'fulfilled') {
            allEvents.push(...result.value)
          }
        }
      }

      // Sort by most recent first (using ISO date, not display string)
      allEvents.sort((a, b) => {
        const ta = a.sortTime || ''
        const tb = b.sortTime || ''
        return tb.localeCompare(ta)
      })

      setEvents(allEvents)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, did])

  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])

  return {
    events,
    loading,
    error,
    refresh: fetchFeed,
    isLive: isAuthenticated,
  }
}
