import { useState, useEffect, useCallback, useRef } from 'react'
import useAuth from './useAuth'

const API_URL = import.meta.env.VITE_API_URL || ''

/**
 * Format a feed event from the server into a display-friendly shape.
 */
function formatFeedEvent(event) {
  const record = event.record || {}
  const collection = event.collection

  let action = ''
  let book = null

  if (collection === 'app.shelfwise.book') {
    const shelf = record.shelf
    if (shelf === 'read') action = 'finished'
    else if (shelf === 'reading') action = 'started reading'
    else if (shelf === 'wantToRead') action = 'wants to read'
    else if (shelf === 'dnf') action = "couldn't finish"
    else action = `shelved (${shelf})`

    book = {
      title: record.title || 'Unknown',
      author: record.author || '',
      coverId: record.coverId || null,
    }
  } else if (collection === 'app.shelfwise.review') {
    action = 'reviewed a book'
  } else if (collection === 'app.shelfwise.challenge') {
    action = `created a challenge: "${record.title}"`
  }

  return {
    user: {
      name: event.displayName || event.handle || event.did,
      handle: event.handle || event.did,
      avatar: event.avatarUrl || null,
    },
    action,
    book,
    timestamp: event.eventTime
      ? new Date(event.eventTime).toLocaleDateString()
      : '',
    raw: event,
  }
}

/**
 * Hook for fetching the social feed.
 * When authenticated and API_URL is set, fetches from the server.
 * Falls back to mock data when offline or unauthenticated.
 */
export default function useSocialFeed() {
  const { isAuthenticated, did } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const eventSourceRef = useRef(null)

  const fetchFeed = useCallback(async () => {
    if (!isAuthenticated || !did || !API_URL) return

    setLoading(true)
    setError(null)

    try {
      // Sync follows first
      await fetch(`${API_URL}/api/follows/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did }),
      })

      // Fetch feed
      const res = await fetch(`${API_URL}/api/feed?did=${encodeURIComponent(did)}&limit=50`)
      const data = await res.json()

      setEvents((data.events || []).map(formatFeedEvent))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, did])

  // Initial fetch
  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])

  // SSE for live updates
  useEffect(() => {
    if (!isAuthenticated || !did || !API_URL) return

    const es = new EventSource(`${API_URL}/api/feed/live?did=${encodeURIComponent(did)}`)
    eventSourceRef.current = es

    es.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data)
        if (event.type === 'connected') return
        setEvents((prev) => [formatFeedEvent(event), ...prev])
      } catch { /* ignore parse errors */ }
    }

    es.onerror = () => {
      es.close()
    }

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [isAuthenticated, did])

  return { events, loading, error, refresh: fetchFeed, isLive: !!API_URL && isAuthenticated }
}
