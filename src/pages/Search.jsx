import { useState } from 'react'
import SearchBar from '../components/SearchBar'
import BookCover from '../components/ui/BookCover'
import Pill from '../components/ui/Pill'
import { searchBooks } from '../api/openLibrary'
import useBooks from '../hooks/useBooks'
import useSettings from '../hooks/useSettings'
import useToast from '../components/Toast'
import useFriendsBooks from '../hooks/useFriendsBooks'
import Avatar from '../components/ui/Avatar'
import { Search as SearchIcon, Check, Share2, Users } from 'lucide-react'

const SHELF_LABELS = {
  wantToRead: 'Want to Read',
  reading: 'Reading',
  read: 'Read',
  dnf: "Couldn't Finish",
}

const SHELF_COLORS = {
  wantToRead: 'indigo',
  reading: 'amber',
  read: 'green',
  dnf: 'red',
}

const SHELF_NAMES = { read: 'Read', reading: 'Reading', wantToRead: 'Want to Read', dnf: "Couldn't Finish" }

export default function Search({ onBookClick }) {
  const { books, addBook } = useBooks()
  const { settings } = useSettings()
  const toast = useToast()
  const addToast = toast?.addToast || (() => {})
  const friendsBooksCtx = useFriendsBooks()
  const getFriendsForBook = friendsBooksCtx?.getFriendsForBook || (() => [])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState(null)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)

  const findInLibrary = (book) =>
    books.find(
      (b) =>
        b.key === book.key ||
        (b.title?.toLowerCase() === book.title?.toLowerCase() &&
          b.author?.toLowerCase() === book.author?.toLowerCase()),
    )

  const handleSearch = async (query) => {
    if (!query.trim()) return
    setLoading(true)
    setLoadingMessage(null)
    setError(null)
    setSearched(true)
    try {
      const data = await searchBooks(query, {
        language: settings.language,
        onProgress: (msg) => setLoadingMessage(msg),
      })
      setResults(data)
    } catch {
      setError('Failed to search books. Please try again.')
      setResults([])
    } finally {
      setLoading(false)
      setLoadingMessage(null)
    }
  }

  const handleSelect = (book) => {
    const existing = findInLibrary(book)
    if (existing) {
      onBookClick?.(existing)
    } else {
      onBookClick?.(book)
    }
  }

  const handleCardClick = (book) => {
    const existing = findInLibrary(book)
    if (existing) {
      onBookClick?.(existing)
    } else {
      onBookClick?.(book)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <SearchBar onSearch={handleSearch} onSelect={handleSelect} language={settings.language} />
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400" />
          {loadingMessage && (
            <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
              {loadingMessage}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-red-500 dark:text-red-400 text-center py-4">{error}</p>
      )}

      {!loading && !searched && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <SearchIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Search for books to add to your library
          </p>
        </div>
      )}

      {!loading && searched && results.length === 0 && !error && (
        <p className="text-gray-500 dark:text-gray-400 text-center py-12">
          No results found. Try searching by author name, a simpler title, or ISBN.
        </p>
      )}

      {!loading && results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {results.map((book) => {
            const existing = findInLibrary(book)
            const id = book.key || `${book.title}-${book.author}`

            return (
              <div
                key={id}
                className="flex flex-col items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm transition hover:shadow-md"
              >
                {/* Clickable area: cover + text open detail modal */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardClick(book)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleCardClick(book)
                    }
                  }}
                  className="cursor-pointer w-full flex flex-col items-center"
                >
                  <BookCover
                    coverId={book.coverId}
                    isbn={book.isbn}
                    coverUrl={book.coverUrl}
                    title={book.title}
                    size="M"
                  />
                  <div className="mt-3 w-full text-center">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                      {book.title}
                    </h3>
                    {book.author && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {book.author}
                      </p>
                    )}
                    {book.year && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {book.year}
                      </p>
                    )}
                    {(() => {
                      const friends = getFriendsForBook(book.title, book.author)
                      if (friends.length === 0) return null
                      return (
                        <div className="mt-1.5 flex items-center justify-center gap-1">
                          <div className="flex -space-x-1.5">
                            {friends.slice(0, 3).map((f) => (
                              <Avatar key={f.did} name={f.displayName} src={f.avatar} size="sm" />
                            ))}
                          </div>
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                            {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Shelf buttons — direct, no dropdown */}
                <div className="mt-3 w-full flex justify-center">
                  {existing ? (
                    <div className="flex items-center gap-2">
                      <Pill color={SHELF_COLORS[existing.shelf] ?? 'gray'}>
                        <Check size={12} className="mr-0.5" />
                        {SHELF_LABELS[existing.shelf] ?? existing.shelf}
                      </Pill>
                      <button
                        onClick={() => window.open(
                          'https://bsky.app/intent/compose?text=' + encodeURIComponent(
                            `"${book.title}" by ${book.author} 📖\nhttps://www.shelfwise.xyz`
                          ), '_blank'
                        )}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        title="Share on Bluesky"
                      >
                        <Share2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {['read', 'reading', 'wantToRead'].map((shelf) => (
                        <button
                          key={shelf}
                          onClick={() => {
                            const result = addBook({ ...book, shelf })
                            if (result === 'updated') {
                              addToast(`"${book.title}" is already on your shelves — moved to ${SHELF_NAMES[shelf]}`, 'warning')
                            } else {
                              addToast(`Added "${book.title}" to ${SHELF_NAMES[shelf]}`, 'success')
                            }
                          }}
                          className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors min-h-[44px] flex items-center ${
                            shelf === 'read'
                              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50'
                              : shelf === 'reading'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                          }`}
                        >
                          + {SHELF_NAMES[shelf]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
