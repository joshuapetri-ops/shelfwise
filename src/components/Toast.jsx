/* eslint-disable react-refresh/only-export-components */
import { useState, useRef, createContext, useContext, useCallback } from 'react'
import { X } from 'lucide-react'

const ToastContext = createContext()

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      timersRef.current.delete(id)
    }, 4000)
    timersRef.current.set(id, timer)
  }, [])

  const removeToast = useCallback((id) => {
    const timer = timersRef.current.get(id)
    if (timer) clearTimeout(timer)
    timersRef.current.delete(id)
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed left-4 right-4 z-50 flex flex-col gap-2 items-center pointer-events-none"
          style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto max-w-sm w-full rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 animate-[slideUp_0.3s_ease-out] ${
                toast.type === 'warning'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800'
                  : toast.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800'
                    : 'bg-white text-gray-800 border border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
              }`}
            >
              <p className="text-sm flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export default function useToast() {
  return useContext(ToastContext)
}
