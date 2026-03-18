import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children }) {
  const panelRef = useRef(null)
  const touchStartY = useRef(0)
  const touchDeltaY = useRef(0)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Swipe down to dismiss (mobile)
  const handleTouchStart = useCallback((e) => {
    const panel = panelRef.current
    if (!panel) return
    // Only enable swipe if scrolled to top
    if (panel.scrollHeight > panel.clientHeight && panel.scrollTop > 5) return
    touchStartY.current = e.touches[0].clientY
    touchDeltaY.current = 0
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!touchStartY.current) return
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta < 0) { touchDeltaY.current = 0; return } // only swipe down
    touchDeltaY.current = delta
    const panel = panelRef.current
    if (panel && panel.scrollTop <= 0) {
      panel.style.transform = `translateY(${Math.min(delta, 200)}px)`
      panel.style.transition = 'none'
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    const panel = panelRef.current
    if (!panel) return
    if (touchDeltaY.current > 100) {
      // Dismiss
      panel.style.transition = 'transform 0.2s ease-out'
      panel.style.transform = 'translateY(100%)'
      setTimeout(onClose, 200)
    } else {
      // Snap back
      panel.style.transition = 'transform 0.2s ease-out'
      panel.style.transform = 'translateY(0)'
    }
    touchStartY.current = 0
    touchDeltaY.current = 0
  }, [onClose])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={panelRef}
        className="relative bg-white dark:bg-gray-900 rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto sm:mx-4 p-6"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe indicator (mobile only) */}
        <div className="sm:hidden flex justify-center mb-3 -mt-2">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate mr-2">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
