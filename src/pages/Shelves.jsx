import { useState, useMemo } from 'react'
import useBooks from '../hooks/useBooks'
import useCriteria from '../hooks/useCriteria'
import useChallenges from '../hooks/useChallenges'
import BookCard from '../components/BookCard'
import { BookOpen, ChevronDown } from 'lucide-react'
import { computeComposite } from '../lib/compositeScore'

const SHELF_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'reading', label: 'Reading' },
  { key: 'read', label: 'Read' },
  { key: 'wantToRead', label: 'Want to Read' },
  { key: 'dnf', label: "Couldn't Finish" },
]

export default function Shelves({ onBookClick, libraryCode }) {
  const { books, addBook } = useBooks()
  const { criteria } = useCriteria()
  const { challenges, getChallengeProgress } = useChallenges()
  const [activeFilter, setActiveFilter] = useState('all')
  const [sortBy, setSortBy] = useState('dateAdded')

  const activeChallenge = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return challenges.find((c) => c.endDate >= today) ?? null
  }, [challenges])

  const shelfCounts = useMemo(() => {
    const counts = { all: books.length, reading: 0, read: 0, wantToRead: 0, dnf: 0 }
    for (const b of books) {
      if (counts[b.shelf] !== undefined) counts[b.shelf]++
    }
    return counts
  }, [books])

  const filteredBooks = useMemo(() => {
    const base = activeFilter === 'all'
      ? books
      : books.filter((b) => b.shelf === activeFilter)

    const sorted = [...base]
    switch (sortBy) {
      case 'titleAZ':
        sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
        break
      case 'authorAZ':
        sorted.sort((a, b) => (a.author || '').localeCompare(b.author || ''))
        break
      case 'composite': {
        sorted.sort((a, b) => {
          const sa = computeComposite(a.ratings, criteria) ?? -1
          const sb = computeComposite(b.ratings, criteria) ?? -1
          return sb - sa
        })
        break
      }
      default:
        if (sortBy.startsWith('criterion:')) {
          const criterionId = sortBy.replace('criterion:', '')
          sorted.sort((a, b) => {
            const va = a.ratings?.[criterionId] ?? -1
            const vb = b.ratings?.[criterionId] ?? -1
            return vb - va
          })
        }
        // dateAdded: keep original order (newest first assumed)
        break
    }

    return sorted
  }, [books, activeFilter, sortBy, criteria])

  const testAdd = () => {
    console.log('TEST ADD CLICKED')
    addBook({
      key: '/works/test_dune_123',
      title: 'Dune',
      author: 'Frank Herbert',
      coverId: 8231856,
      isbn: '9780441013593',
      year: 1965,
      shelf: 'read',
    })
    console.log('TEST ADD FINISHED, books now:', books.length + 1)
  }

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <button
          onClick={testAdd}
          style={{padding: '16px 32px', fontSize: '18px', background: 'red', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '16px'}}
        >
          TEST: Add Dune to shelf
        </button>
        <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Your shelves are empty
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
          Start building your library by searching for books you love, want to read, or are currently reading.
        </p>
        <a
          href="/search"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          Search for Books
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Challenge banner */}
      {activeChallenge && (
        <div className="mb-4 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950 px-4 py-2 flex items-center gap-3">
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            {activeChallenge.title}: {getChallengeProgress(activeChallenge, books)}/{activeChallenge.goal} books
          </span>
          <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-indigo-200 dark:bg-indigo-800">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${Math.min(100, Math.round((getChallengeProgress(activeChallenge, books) / activeChallenge.goal) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {SHELF_FILTERS.map((f) => {
          const isActive = activeFilter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setActiveFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {f.label} ({shelfCounts[f.key] ?? 0})
            </button>
          )
        })}

        {/* Sort dropdown */}
        <div className="ml-auto relative">
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="dateAdded">Date Added</option>
              <option value="titleAZ">Title A–Z</option>
              <option value="authorAZ">Author A–Z</option>
              <option value="composite">Composite Score</option>
              {criteria.map((c) => (
                <option key={c.id} value={`criterion:${c.id}`}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      <button
        onClick={testAdd}
        style={{padding: '16px 32px', fontSize: '18px', background: 'red', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '16px'}}
      >
        TEST: Add Dune to shelf
      </button>

      {/* Book grid */}
      {filteredBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No books on this shelf yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBooks.map((book) => (
            <BookCard key={book.key} book={book} criteria={criteria} libraryCode={libraryCode} onClick={onBookClick} />
          ))}
        </div>
      )}
    </div>
  )
}
