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
 * Checks Bluesky notifications for follows, and can be extended
 * to check Shelfwise-specific interactions.
 */
export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState(load)
  const auth = useAuth()
  const hasChecked = useRef(false)
  const notificationsRef = useRef(notifications)

  // Persist and sync ref
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
    notificationsRef.current = notifications
  }, [notifications])

  // Check for new notifications on auth
  useEffect(() => {
    if (!auth?.isAuthenticated || !auth.agent || !auth.did || hasChecked.current) return
    hasChecked.current = true

    async function check() {
      try {
        const notifRes = await auth.agent.app.bsky.notification.listNotifications({ limit: 20 })
        const newNotifs = []

        for (const n of notifRes.data.notifications || []) {
          const id = `${n.reason}-${n.author.did}-${n.indexedAt}`
          if (notificationsRef.current.some((existing) => existing.id === id)) continue

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
          } else if (n.reason === 'like') {
            newNotifs.push({
              id,
              type: 'like',
              message: `${n.author.displayName || n.author.handle} liked your post`,
              handle: n.author.handle,
              avatar: n.author.avatar || null,
              timestamp: n.indexedAt,
              read: false,
            })
          }
        }

        if (newNotifs.length > 0) {
          setNotifications((prev) => [...newNotifs, ...prev].slice(0, 50))
        }
      } catch { /* non-fatal */ }
    }
    check()
  }, [auth])

  /**
   * Add a local notification (e.g., streak milestones, likes from Shelfwise).
   */
  const addNotification = useCallback((notification) => {
    setNotifications((prev) => {
      if (prev.some((n) => n.id === notification.id)) return prev
      return [notification, ...prev].slice(0, 50)
    })
  }, [])

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
    <NotificationsContext.Provider value={{ notifications, unreadCount, addNotification, markRead, markAllRead, clearAll }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export default function useNotifications() {
  return useContext(NotificationsContext)
}
