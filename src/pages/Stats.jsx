import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import useBooks from '../hooks/useBooks'
import BookCover from '../components/ui/BookCover'
import { computeStreaks } from '../lib/activityLog'
import {
  classifyGenres,
  calcGenreBreakdown,
  calcReadingPace,
  calcFastestSlowest,
  calcTotalPages,
  calcDiversityStats,
  calcYearOverYear,
  GENRE_COLORS,
} from '../lib/statsCalculations'
import { BarChart3, BookOpen, Star, Clock, TrendingUp, Flame, Zap, ChevronDown } from 'lucide-react'

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

function ExpandableSection({ title, children, books: sectionBooks }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-4"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {children}
      {expanded && sectionBooks && sectionBooks.length > 0 && (
        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
          {sectionBooks.map((book) => (
            <div key={book.key} className="flex items-center gap-3">
              <BookCover coverId={book.coverId} isbn={book.isbn} coverUrl={book.coverUrl} title={book.title} size="S" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{book.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{book.author}</p>
              </div>
              {book.ratings?.overall > 0 && (
                <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0">
                  {'★'.repeat(book.ratings?.overall || 0)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Stats() {
  const { books } = useBooks()
  const [expandedGenre, setExpandedGenre] = useState(null)
  const [expandedMonth, setExpandedMonth] = useState(null)

  const stats = useMemo(() => {
    const now = new Date()
    const thisYear = now.getFullYear()
    const readBooks = books.filter((b) => b.shelf === 'read')
    const readThisYear = readBooks.filter((b) => {
      const finishYear = getYear(b.finishedAt) || getYear(b.addedAt)
      return finishYear === thisYear
    })
    const readingBooks = books.filter((b) => b.shelf === 'reading')
    const wantBooks = books.filter((b) => b.shelf === 'wantToRead')

    // Average rating
    const rated = readBooks.filter((b) => b.ratings?.overall)
    const avgRating = rated.length > 0
      ? (rated.reduce((sum, b) => sum + (b.ratings?.overall || 0), 0) / rated.length).toFixed(1)
      : null

    // Top rated books
    const topRated = [...readBooks]
      .filter((b) => b.ratings?.overall)
      .sort((a, b) => (b.ratings?.overall || 0) - (a.ratings?.overall || 0))
      .slice(0, 5)

    // Books per month this year
    const monthlyCount = {}
    for (let m = 0; m < 12; m++) {
      const key = `${thisYear}-${String(m + 1).padStart(2, '0')}`
      monthlyCount[key] = 0
    }
    for (const b of readThisYear) {
      const m = getMonth(b.finishedAt) || getMonth(b.addedAt)
      if (m && monthlyCount[m] !== undefined) monthlyCount[m]++
    }
    // Map month keys to book lists for drill-down
    const monthlyBooks = {}
    for (let m = 0; m < 12; m++) {
      const key = `${thisYear}-${String(m + 1).padStart(2, '0')}`
      monthlyBooks[key] = []
    }
    for (const b of readThisYear) {
      const m = getMonth(b.finishedAt) || getMonth(b.addedAt)
      if (m && monthlyBooks[m]) monthlyBooks[m].push(b)
    }

    const monthlyData = Object.entries(monthlyCount).map(([key, count]) => ({
      key,
      month: MONTH_NAMES[parseInt(key.split('-')[1], 10) - 1],
      count,
      books: monthlyBooks[key] || [],
    }))

    // Most read authors
    const authorCounts = {}
    for (const b of readBooks) {
      if (b.author) authorCounts[b.author] = (authorCounts[b.author] || 0) + 1
    }
    const topAuthors = Object.entries(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    // Enhanced stats
    const genreBreakdown = calcGenreBreakdown(readBooks)

    // Genre-to-books map for drill-down
    const genreBooks = {}
    for (const book of readBooks) {
      const genres = classifyGenres(book.subjects)
      for (const genre of genres) {
        if (!genreBooks[genre]) genreBooks[genre] = []
        genreBooks[genre].push(book)
      }
    }

    const readingPace = calcReadingPace(readBooks)
    const { fastest, slowest } = calcFastestSlowest(readBooks)
    const totalPages = calcTotalPages(readBooks)
    const diversityStats = calcDiversityStats(readBooks)
    const yearOverYear = calcYearOverYear(books)
    const streaks = computeStreaks()

    return {
      total: books.length,
      read: readBooks.length,
      readBooks,
      readThisYear: readThisYear.length,
      readThisYearBooks: readThisYear,
      reading: readingBooks.length,
      readingBooks,
      wantToRead: wantBooks.length,
      avgRating,
      topRated,
      monthlyData,
      topAuthors,
      genreBreakdown,
      genreBooks,
      readingPace,
      fastest,
      slowest,
      totalPages,
      diversityStats,
      yearOverYear,
      streaks,
      thisYear,
    }
  }, [books])

  const maxMonthly = Math.max(...stats.monthlyData.map((d) => d.count), 1)

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">No stats yet</h1>
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
          <Flame className="w-6 h-6 text-orange-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.streaks.currentStreak}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Day Streak</p>
        </div>
      </div>

      {/* Reading pace + pages row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {stats.readingPace ? `${stats.readingPace}d` : '—'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Avg Days/Book</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
          <BookOpen className="w-5 h-5 text-gray-600 dark:text-gray-400 mx-auto mb-2" />
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.reading}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Reading Now</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
          <Zap className="w-5 h-5 text-amber-500 mx-auto mb-2" />
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.streaks.longestStreak}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Longest Streak</p>
        </div>
      </div>

      {/* Monthly chart */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 mb-8">
        <ExpandableSection
          title={`Books Read in ${stats.thisYear}`}
          books={stats.readThisYearBooks}
        >
          <div className="flex items-end gap-1 h-32">
            {stats.monthlyData.map((d) => (
              <button
                key={d.key}
                onClick={() => d.count > 0 && setExpandedMonth(expandedMonth === d.key ? null : d.key)}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                  {d.count > 0 ? d.count : ''}
                </span>
                <div
                  className={`w-full rounded-t transition-all ${
                    expandedMonth === d.key
                      ? 'bg-indigo-700 dark:bg-indigo-300'
                      : d.count > 0
                        ? 'bg-indigo-500 dark:bg-indigo-400 hover:bg-indigo-600 dark:hover:bg-indigo-300'
                        : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                  style={{ height: `${Math.max(2, (d.count / maxMonthly) * 100)}%` }}
                />
                <span className={`text-[10px] ${expandedMonth === d.key ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
                  {d.month}
                </span>
              </button>
            ))}
          </div>

          {/* Month drill-down */}
          {expandedMonth && (() => {
            const monthData = stats.monthlyData.find((d) => d.key === expandedMonth)
            if (!monthData || monthData.books.length === 0) return null
            return (
              <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {monthData.month} {stats.thisYear} — {monthData.books.length} {monthData.books.length === 1 ? 'book' : 'books'}
                </h3>
                <div className="space-y-2">
                  {monthData.books.map((book) => (
                    <div key={book.key} className="flex items-center gap-3">
                      <BookCover coverId={book.coverId} isbn={book.isbn} coverUrl={book.coverUrl} title={book.title} size="S" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{book.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{book.author}</p>
                      </div>
                      {book.ratings?.overall > 0 && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0">
                          {'★'.repeat(book.ratings?.overall || 0)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </ExpandableSection>
      </div>

      {/* Genre breakdown */}
      {stats.genreBreakdown.length > 0 && stats.genreBreakdown[0].genre !== 'Unclassified' && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            What You Read
          </h2>
          <div className="space-y-3">
            {stats.genreBreakdown.slice(0, 8).map((g) => (
              <div key={g.genre}>
                <button
                  onClick={() => setExpandedGenre(expandedGenre === g.genre ? null : g.genre)}
                  className="w-full text-left"
                >
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      {g.genre}
                      <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${expandedGenre === g.genre ? 'rotate-180' : ''}`} />
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">{g.count} ({g.percentage}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${g.percentage}%`,
                        backgroundColor: GENRE_COLORS[g.genre] || '#94a3b8',
                      }}
                    />
                  </div>
                </button>
                {expandedGenre === g.genre && stats.genreBooks[g.genre] && (
                  <div className="mt-2 ml-2 space-y-2 border-l-2 pl-3" style={{ borderColor: GENRE_COLORS[g.genre] || '#94a3b8' }}>
                    {stats.genreBooks[g.genre].map((book) => (
                      <div key={book.key} className="flex items-center gap-2">
                        <BookCover coverId={book.coverId} isbn={book.isbn} coverUrl={book.coverUrl} title={book.title} size="S" />
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{book.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{book.author}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fastest/slowest reads */}
      {(stats.fastest || stats.slowest) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {stats.fastest && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-600 dark:text-green-400 mb-2">Fastest Read</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{stats.fastest.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stats.fastest.author}</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">{stats.fastest.days} days</p>
            </div>
          )}
          {stats.slowest && stats.slowest.key !== stats.fastest?.key && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-2">Longest Read</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{stats.slowest.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stats.slowest.author}</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.slowest.days} days</p>
            </div>
          )}
        </div>
      )}

      {/* Two columns: Top rated + Top authors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {stats.topRated.length > 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Highest Rated</h2>
            <ol className="space-y-3">
              {stats.topRated.map((book, i) => (
                <li key={book.key} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-400 dark:text-gray-500 w-5">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{book.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{book.author}</p>
                  </div>
                  <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0">
                    {'★'.repeat(book.ratings?.overall || 0)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {stats.topAuthors.length > 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Most Read Authors</h2>
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

      {/* Diversity stats */}
      {stats.diversityStats.totalTagged > 0 && (
        <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950 p-6 mb-8">
          <h2 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
            Diversity &amp; Representation
          </h2>
          <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
            {stats.diversityStats.totalTagged} of {stats.read} books tagged
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.diversityStats.tags.map((t) => (
              <span
                key={t.label}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
              >
                {t.label}: {t.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Year over year */}
      {stats.yearOverYear.length > 1 && (() => {
        const maxYearCount = Math.max(...stats.yearOverYear.map((v) => v.count), 1)
        return (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Year Over Year</h2>
            <div className="flex items-end gap-3 h-24">
              {stats.yearOverYear.map((y) => (
                <div key={y.year} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{y.count}</span>
                  <div
                    className="w-full rounded-t bg-indigo-500 dark:bg-indigo-400 transition-all"
                    style={{ height: `${Math.max(4, (y.count / maxYearCount) * 100)}%` }}
                  />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">{y.year}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Library breakdown */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Library</h2>
        <div className="space-y-3">
          {[
            { label: 'Read', count: stats.read, color: 'bg-green-500' },
            { label: 'Reading', count: stats.reading, color: 'bg-blue-500' },
            { label: 'Want to Read', count: stats.wantToRead, color: 'bg-amber-500' },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                <span className="text-gray-500 dark:text-gray-400">{item.count}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.color} transition-all`}
                  style={{ width: `${stats.total > 0 ? (item.count / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">{stats.total} books total</p>
      </div>
    </div>
  )
}
