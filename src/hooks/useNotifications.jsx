/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import useAuth from './useAuth'

const STORAGE_KEY = 'shelfwise-notifications'
const NotificationsContext = createContext()

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
  } catch {
    return []
  }
}

/**
 * Notifications provider.
 * Generates notifications from AT Protocol interactions:
 * - New followers
 * - Likes on your books (when backend is available)
 * - Streak milestones
 */
export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState(load)
  const auth = useAuth()
  const hasChecked = useRef(false)

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
  }, [notifications])

  // Check for new followers on auth
  useEffect(() => {
    if (!auth?.isAuthenticated || !auth.agent || !auth.did || hasChecked.current) return
    hasChecked.current = true

    async function check() {
      try {
        // Get notification count from Bluesky
        const res = await auth.agent.app.bsky.notification.getUnreadCount()
        const count = res.data.count || 0

        if (count > 0) {
          // Fetch recent notifications
          const notifRes = await auth.agent.app.bsky.notification.listNotifications({ limit: 20 })
          const newNotifs = []

          for (const n of notifRes.data.notifications || []) {
            const id = `${n.reason}-${n.author.did}-${n.indexedAt}`
            // Skip if already seen
            if (notifications.some((existing) => existing.id === id)) continue

            if (n.reason === 'follow') {
              newNotifs.push({
                id,
                type: 'follow',
                message: `${n.author.displayName || n.author.handle} started following you`,
                handle: n.author.handle,
                avatar: n.author.avatar || null,
                timestamp: n.indexedAt,
                read: false,
              })
            }
          }

          if (newNotifs.length > 0) {
            setNotifications((prev) => [...newNotifs, ...prev].slice(0, 50)) // keep last 50
          }
        }
      } catch { /* non-fatal */ }
    }
    check()
  }, [auth, notifications])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, read: true } : n)
    )
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, clearAll }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export default function useNotifications() {
  return useContext(NotificationsContext)
}
