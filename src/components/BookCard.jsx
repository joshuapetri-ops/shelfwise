import { useState, useEffect, useRef } from 'react'
import BookCover from './ui/BookCover'
import Pill from './ui/Pill'
import Stars from './ui/Stars'
import { computeComposite, formatComposite, compositeColor, compositeBg } from '../lib/compositeScore'
import { buildAcquireLinks } from '../lib/purchaseLinks'
import useSettings from '../hooks/useSettings'
import { ChevronDown, ExternalLink } from 'lucide-react'

const shelfStyles = {
  reading: 'indigo',
  read: 'green',
  wantToRead: 'amber',
  dnf: 'red',
}

const shelfLabels = {
  reading: 'Reading',
  read: 'Read',
  wantToRead: 'Want to Read',
  dnf: "Couldn't Finish",
}

export default function BookCard({ book, criteria, libraryCode, onClick }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const { settings } = useSettings()

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  const composite = computeComposite(book.ratings, criteria)
  const links = buildAcquireLinks(book, libraryCode)

  // Map settings acquire value to link name
  const acquireNameMap = {
    libby: 'Libby',
    bookshop: 'Bookshop.org',
    powells: "Powell's",
    amazon: 'Amazon',
    kindle: 'Kindle',
  }

  function handleGetClick() {
    const defaultAcquire = settings?.defaultAcquire
    if (defaultAcquire && defaultAcquire !== 'none') {
      const targetName = acquireNameMap[defaultAcquire]
      const link = links.find((l) => l.name === targetName)
      if (link) {
        window.open(link.url, '_blank')
        return
      }
    }
    setDropdownOpen((prev) => !prev)
  }

  function handleCardClick() {
    if (!dropdownOpen) {
      onClick?.(book)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCardClick()
        }
      }}
      className="flex w-full items-start gap-4 rounded-xl bg-white dark:bg-gray-900 p-3 text-left shadow-sm transition hover:shadow-md active:scale-[0.98] border border-gray-100 dark:border-gray-800 cursor-pointer"
    >
      <BookCover coverId={book.coverId} isbn={book.isbn} title={book.title} size="M" />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Title */}
        <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
          {book.title}
        </h3>

        {/* Author & year */}
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          {book.author}
          {book.year ? ` (${book.year})` : ''}
        </p>

        {/* Shelf badge & composite score */}
        <div className="flex items-center gap-2 flex-wrap">
          {book.shelf && (
            <Pill color={shelfStyles[book.shelf] ?? 'gray'}>
              {shelfLabels[book.shelf] ?? book.shelf}
            </Pill>
          )}

          {composite != null && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${compositeColor(composite)} ${compositeBg(composite)}`}
            >
              {formatComposite(composite)}
            </span>
          )}
        </div>

        {/* Star rating */}
        {book.ratings?.overall != null && (
          <Stars value={book.ratings.overall} readOnly />
        )}

        {/* Get dropdown */}
        <div ref={dropdownRef} className="relative mt-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={handleGetClick}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Get
            <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-1 z-20 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1">
              {links.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  {link.name}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
