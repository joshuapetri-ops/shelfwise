import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import Avatar from './ui/Avatar'
import useNotifications from '../hooks/useNotifications'

export default function NotificationBell() {
  const ctx = useNotifications()
  const { notifications, unreadCount, markRead, markAllRead } = ctx || {}
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  if (!ctx) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen(!open)
          if (!open && unreadCount > 0) markAllRead?.()
        }}
        className="relative p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
            {notifications?.length > 0 && (
              <button
                onClick={() => markAllRead?.()}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {(!notifications || notifications.length === 0) ? (
            <div className="px-4 py-8 text-center">
              <Bell size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
            </div>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li key={n.id}>
                  <Link
                    to={n.handle ? `/profile/${n.handle}` : '/social'}
                    onClick={() => {
                      markRead?.(n.id)
                      setOpen(false)
                    }}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      !n.read ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                    }`}
                  >
                    <Avatar name={n.message} src={n.avatar} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900 dark:text-gray-100">{n.message}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {n.timestamp ? new Date(n.timestamp).toLocaleDateString() : ''}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
