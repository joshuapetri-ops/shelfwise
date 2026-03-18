/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useCallback, createContext, useContext } from 'react'

const STORAGE_KEY = 'shelfwise-notifications-v2'
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
 * Only shows Shelfwise-specific notifications — NOT Bluesky notifications.
 * Notifications are generated locally via addNotification() from other hooks/components.
 */
export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState(load)

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
  }, [notifications])

  /**
   * Add a Shelfwise notification.
   * Used by other hooks to report events (challenge completion, etc).
   */
  const addNotification = useCallback((notification) => {
    setNotifications((prev) => {
      if (prev.some((n) => n.id === notification.id)) return prev
      return [{ ...notification, read: false, timestamp: notification.timestamp || new Date().toISOString() }, ...prev].slice(0, 50)
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
