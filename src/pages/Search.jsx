import { useState } from 'react'
import SearchBar from '../components/SearchBar'
import BookCover from '../components/ui/BookCover'
import Pill from '../components/ui/Pill'
import Button from '../components/ui/Button'
import { searchBooks } from '../api/openLibrary'
import useBooks from '../hooks/useBooks'
import useSettings from '../hooks/useSettings'
import { Search as SearchIcon, Plus, Check } from 'lucide-react'

const SHELF_OPTIONS = [
  { value: 'wantToRead', label: 'Want to Read', color: 'indigo' },
  { value: 'reading', label: 'Reading', color: 'amber' },
  { value: 'read', label: 'Read', color: 'green' },
  { value: 'dnf', label: "Couldn't Finish", color: 'red' },
]

export default function Search({ onBookClick }) {
  const { books, addBook } = useBooks()
  const { settings } = useSettings()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)

  const findInLibrary = (book) =>
    books.find(
      (b) =>
        b.key === book.key ||
        (b.title?.toLowerCase() === book.title?.toLowerCase() &&
          b.author?.toLowerCase() === book.author?.toLowerCase()),
    )

  const shelfLabel = (shelf) =>
    SHELF_OPTIONS.find((o) => o.value === shelf)?.label ?? shelf

  const shelfColor = (shelf) =>
    SHELF_OPTIONS.find((o) => o.value === shelf)?.color ?? 'gray'

  const handleSearch = async (query) => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      const data = await searchBooks(query, { language: settings.language })
      setResults(data)
    } catch {
      setError('Failed to search books. Please try again.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (book) => {
    // Open the book detail modal directly for autocomplete selections
    const existing = findInLibrary(book)
    if (existing) {
      onBookClick?.(existing)
    } else {
      onBookClick?.(book)
    }
  }

  const handleAddWithShelf = (book, shelf) => {
    console.log('handleAddWithShelf called:', book.title, shelf)
    addBook({ ...book, shelf })
    setOpenDropdown(null)
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
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400" />
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
          No results found. Try a different search term.
        </p>
      )}

      {!loading && results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {results.map((book) => {
            const existing = findInLibrary(book)
            const id = book.key || book.id || `${book.title}-${book.author}`

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
                  </div>
                </div>

                {/* Shelf buttons — separate from the card click area */}
                <div className="mt-3 w-full flex justify-center">
                  {existing ? (
                    <Pill color={shelfColor(existing.shelf)}>
                      <Check size={12} className="mr-0.5" />
                      {shelfLabel(existing.shelf)}
                    </Pill>
                  ) : (
                    <div className="relative">
                      <Button
                        size="sm"
                        onClick={() => {
                          console.log('DROPDOWN TOGGLED for:', book.title)
                          setOpenDropdown(openDropdown === id ? null : id)
                        }}
                      >
                        <Plus size={14} />
                        Add to Shelf
                      </Button>
                      {openDropdown === id && (
                        <div className="absolute z-20 mt-1 left-1/2 -translate-x-1/2 w-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1">
                          {SHELF_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                console.log('SHELF OPTION CLICKED:', book.title, opt.value)
                                handleAddWithShelf(book, opt.value)
                              }}
                              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
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
