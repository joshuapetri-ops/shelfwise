import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import useBooks from '../hooks/useBooks'
import useCriteria from '../hooks/useCriteria'
import { computeComposite } from '../lib/compositeScore'
import { BarChart3, BookOpen, Star, Clock, TrendingUp } from 'lucide-react'

function getYear(dateStr) {
  if (!dateStr) return null
  try { return new Date(dateStr).getFullYear() } catch { return null }
}

function getMonth(dateStr) {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  } catch { return null }
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function Stats() {
  const { books } = useBooks()
  const { criteria } = useCriteria()

  const stats = useMemo(() => {
    const now = new Date()
    const thisYear = now.getFullYear()
    const readBooks = books.filter((b) => b.shelf === 'read')
    const readThisYear = readBooks.filter((b) => getYear(b.addedAt) === thisYear)
    const readingBooks = books.filter((b) => b.shelf === 'reading')
    const wantBooks = books.filter((b) => b.shelf === 'wantToRead')

    // Average rating
    const rated = readBooks.filter((b) => b.ratings?.overall)
    const avgRating = rated.length > 0
      ? (rated.reduce((sum, b) => sum + (b.ratings.overall || 0), 0) / rated.length).toFixed(1)
      : null

    // Top rated books
    const topRated = [...readBooks]
      .filter((b) => b.ratings?.overall)
      .sort((a, b) => (b.ratings.overall || 0) - (a.ratings.overall || 0))
      .slice(0, 5)

    // Books per month this year
    const monthlyCount = {}
    for (let m = 0; m < 12; m++) {
      const key = `${thisYear}-${String(m + 1).padStart(2, '0')}`
      monthlyCount[key] = 0
    }
    for (const b of readThisYear) {
      const m = getMonth(b.addedAt)
      if (m && monthlyCount[m] !== undefined) monthlyCount[m]++
    }
    const monthlyData = Object.entries(monthlyCount).map(([key, count]) => ({
      month: MONTH_NAMES[parseInt(key.split('-')[1], 10) - 1],
      count,
    }))

    // Composite scores distribution
    const composites = readBooks
      .map((b) => computeComposite(b.ratings, criteria))
      .filter((c) => c != null)

    const avgComposite = composites.length > 0
      ? Math.round(composites.reduce((a, b) => a + b, 0) / composites.length)
      : null

    // Most read authors
    const authorCounts = {}
    for (const b of readBooks) {
      if (b.author) {
        authorCounts[b.author] = (authorCounts[b.author] || 0) + 1
      }
    }
    const topAuthors = Object.entries(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    return {
      total: books.length,
      read: readBooks.length,
      readThisYear: readThisYear.length,
      reading: readingBooks.length,
      wantToRead: wantBooks.length,
      avgRating,
      topRated,
      monthlyData,
      avgComposite,
      topAuthors,
      thisYear,
    }
  }, [books, criteria])

  const maxMonthly = Math.max(...stats.monthlyData.map((d) => d.count), 1)

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          No stats yet
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
          Add books to your shelves to see your reading stats.
        </p>
        <Link
          to="/search"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          Search for Books
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <BarChart3 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Reading Stats</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
          <BookOpen className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.read}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Books Read</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
          <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.readThisYear}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Read in {stats.thisYear}</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
          <Star className="w-6 h-6 text-amber-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.avgRating ?? '—'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Avg Rating</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
          <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.reading}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Reading Now</p>
        </div>
      </div>

      {/* Monthly chart */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Books Read in {stats.thisYear}
        </h2>
        <div className="flex items-end gap-1 h-32">
          {stats.monthlyData.map((d) => (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                {d.count > 0 ? d.count : ''}
              </span>
              <div
                className={`w-full rounded-t transition-all ${d.count > 0 ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-gray-100 dark:bg-gray-800'}`}
                style={{ height: `${Math.max(2, (d.count / maxMonthly) * 100)}%` }}
              />
              <span className="text-[10px] text-gray-400 dark:text-gray-500">{d.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Two columns: Top rated + Top authors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {/* Top rated */}
        {stats.topRated.length > 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Highest Rated
            </h2>
            <ol className="space-y-3">
              {stats.topRated.map((book, i) => (
                <li key={book.key} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-400 dark:text-gray-500 w-5">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{book.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{book.author}</p>
                  </div>
                  <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0">
                    {'★'.repeat(book.ratings.overall)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Top authors */}
        {stats.topAuthors.length > 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Most Read Authors
            </h2>
            <ol className="space-y-3">
              {stats.topAuthors.map(([author, count], i) => (
                <li key={author} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-400 dark:text-gray-500 w-5">{i + 1}</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex-1">{author}</p>
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{count} {count === 1 ? 'book' : 'books'}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Library breakdown */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Library
        </h2>
        <div className="space-y-3">
          {[
            { label: 'Read', count: stats.read, color: 'bg-green-500', total: stats.total },
            { label: 'Reading', count: stats.reading, color: 'bg-blue-500', total: stats.total },
            { label: 'Want to Read', count: stats.wantToRead, color: 'bg-amber-500', total: stats.total },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                <span className="text-gray-500 dark:text-gray-400">{item.count}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.color} transition-all`}
                  style={{ width: `${item.total > 0 ? (item.count / item.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
          {stats.total} books total
        </p>
      </div>
    </div>
  )
}
