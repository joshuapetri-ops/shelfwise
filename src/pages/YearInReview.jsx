import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import useBooks from '../hooks/useBooks'
import BookCover from '../components/ui/BookCover'
import {
  calcGenreBreakdown,
  calcReadingPace,
  calcFastestSlowest,
  calcTotalPages,
  calcDiversityStats,
  GENRE_COLORS,
} from '../lib/statsCalculations'
import { ArrowLeft, ArrowRight, BookOpen, Share2, Star, Clock, ChevronLeft } from 'lucide-react'

function getYear(dateStr) {
  if (!dateStr) return null
  try { return new Date(dateStr).getFullYear() } catch { return null }
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function YearInReview() {
  const { books } = useBooks()
  const [year, setYear] = useState(new Date().getFullYear())
  const [slide, setSlide] = useState(0)

  const data = useMemo(() => {
    const readBooks = books.filter((b) => {
      if (b.shelf !== 'read') return false
      const y = getYear(b.finishedAt) || getYear(b.addedAt)
      return y === year
    })

    if (readBooks.length === 0) return null

    const rated = readBooks.filter((b) => b.ratings?.overall)
    const avgRating = rated.length > 0
      ? (rated.reduce((sum, b) => sum + (b.ratings?.overall || 0), 0) / rated.length).toFixed(1)
      : null

    const topRated = [...rated].sort((a, b) => (b.ratings?.overall || 0) - (a.ratings?.overall || 0))[0] || null

    const genres = calcGenreBreakdown(readBooks)
    const topGenre = genres[0]?.genre !== 'Unclassified' ? genres[0] : genres[1] || null
    const pace = calcReadingPace(readBooks)
    const { fastest } = calcFastestSlowest(readBooks)
    const totalPages = calcTotalPages(readBooks)
    const diversity = calcDiversityStats(readBooks)

    // Top author
    const authorCounts = {}
    for (const b of readBooks) {
      if (b.author) authorCounts[b.author] = (authorCounts[b.author] || 0) + 1
    }
    const topAuthor = Object.entries(authorCounts).sort((a, b) => b[1] - a[1])[0] || null

    // Monthly breakdown
    const monthly = {}
    for (let m = 0; m < 12; m++) monthly[m] = 0
    for (const b of readBooks) {
      const d = b.finishedAt || b.addedAt
      if (d) {
        try { monthly[new Date(d).getMonth()]++ } catch { /* ignore */ }
      }
    }

    return {
      total: readBooks.length,
      books: readBooks,
      avgRating,
      topRated,
      topGenre,
      genres: genres.filter((g) => g.genre !== 'Unclassified').slice(0, 5),
      pace,
      fastest,
      totalPages,
      diversity,
      topAuthor,
      monthly,
    }
  }, [books, year])

  const years = useMemo(() => {
    const ys = new Set()
    for (const b of books) {
      if (b.shelf === 'read') {
        const y = getYear(b.finishedAt) || getYear(b.addedAt)
        if (y) ys.add(y)
      }
    }
    return [...ys].sort((a, b) => b - a)
  }, [books])

  if (!data) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <Link to="/stats" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6">
          <ChevronLeft size={16} /> Back to Stats
        </Link>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">No books read in {year}</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Read and shelve books to see your year in review.
          </p>
          {years.length > 0 && (
            <div className="flex gap-2">
              {years.map((y) => (
                <button key={y} onClick={() => setYear(y)} className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors">
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const slides = [
    // Slide 0: Hero
    () => (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-2">Your Year in Books</p>
        <h1 className="text-6xl font-black text-gray-900 dark:text-gray-100 mb-2">{year}</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          You read <span className="font-bold text-indigo-600 dark:text-indigo-400">{data.total}</span> {data.total === 1 ? 'book' : 'books'}
        </p>
        {data.totalPages > 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            That&apos;s approximately {data.totalPages.toLocaleString()} pages
          </p>
        )}
      </div>
    ),
    // Slide 1: Top Genre
    ...(data.topGenre ? [() => (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Your top genre</p>
        <h2 className="text-5xl font-black mb-6" style={{ color: GENRE_COLORS[data.topGenre.genre] || '#6366f1' }}>
          {data.topGenre.genre}
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          {data.topGenre.count} {data.topGenre.count === 1 ? 'book' : 'books'} ({data.topGenre.percentage}% of your reading)
        </p>
        {data.genres.length > 1 && (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {data.genres.slice(1).map((g) => (
              <span key={g.genre} className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {g.genre} ({g.count})
              </span>
            ))}
          </div>
        )}
      </div>
    )] : []),
    // Slide 2: Top Author
    ...(data.topAuthor ? [() => (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Your most-read author</p>
        <h2 className="text-4xl font-black text-gray-900 dark:text-gray-100 mb-4">{data.topAuthor[0]}</h2>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          {data.topAuthor[1]} {data.topAuthor[1] === 1 ? 'book' : 'books'} read
        </p>
      </div>
    )] : []),
    // Slide 3: Highest Rated
    ...(data.topRated ? [() => (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Your highest rated</p>
        <BookCover coverId={data.topRated.coverId} isbn={data.topRated.isbn} coverUrl={data.topRated.coverUrl} title={data.topRated.title} size="L" />
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-4">{data.topRated.title}</h3>
        <p className="text-gray-500 dark:text-gray-400">{data.topRated.author}</p>
        <p className="text-2xl text-amber-500 mt-2">
          {'★'.repeat(data.topRated.ratings?.overall || 0)}
        </p>
      </div>
    )] : []),
    // Slide 4: Reading Pace
    ...(data.pace ? [() => (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Clock className="w-12 h-12 text-blue-500 mb-4" />
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Your reading pace</p>
        <h2 className="text-6xl font-black text-gray-900 dark:text-gray-100 mb-2">{data.pace}</h2>
        <p className="text-lg text-gray-600 dark:text-gray-300">average days per book</p>
        {data.fastest && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Fastest: <span className="font-medium">{data.fastest.title}</span> in {data.fastest.days} days
          </p>
        )}
      </div>
    )] : []),
    // Slide 5: Monthly Chart
    () => {
      const max = Math.max(...Object.values(data.monthly), 1)
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-6">Month by month</p>
          <div className="flex items-end gap-2 h-40 w-full max-w-sm">
            {Object.entries(data.monthly).map(([m, count]) => (
              <div key={m} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                  {count > 0 ? count : ''}
                </span>
                <div
                  className={`w-full rounded-t ${count > 0 ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-gray-100 dark:bg-gray-800'}`}
                  style={{ height: `${Math.max(4, (count / max) * 100)}%` }}
                />
                <span className="text-[10px] text-gray-400 dark:text-gray-500">{MONTH_NAMES[m]}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    // Slide 6: Share summary
    () => (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-4">That&apos;s a wrap!</p>
        <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-6">
          {data.total} books in {year}
        </h2>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600 dark:text-gray-300 mb-8">
          {data.avgRating && <span><Star size={14} className="inline text-amber-500" /> Avg: {data.avgRating}</span>}
          {data.topGenre && <span>Top: {data.topGenre.genre}</span>}
          {data.pace && <span><Clock size={14} className="inline text-blue-500" /> {data.pace}d/book</span>}
        </div>
        <button
          onClick={() => {
            const text = `My ${year} reading year in review: ${data.total} books read${data.avgRating ? `, ${data.avgRating} avg rating` : ''}${data.topGenre ? `, mostly ${data.topGenre.genre}` : ''} 📚\n\nTrack your reading on Shelfwise: https://www.shelfwise.xyz`
            window.open('https://bsky.app/intent/compose?text=' + encodeURIComponent(text), '_blank')
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Share2 size={16} />
          Share on Bluesky
        </button>
      </div>
    ),
  ]

  const totalSlides = slides.length
  const SlideContent = slides[slide]
  const canGoBack = slide > 0
  const canGoForward = slide < totalSlides - 1

  return (
    <div className="max-w-lg mx-auto px-4 py-8 min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link to="/stats" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          <ChevronLeft size={16} /> Stats
        </Link>
        {years.length > 1 && (
          <select
            value={year}
            onChange={(e) => { setYear(Number(e.target.value)); setSlide(0) }}
            className="text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-gray-700 dark:text-gray-300"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 mb-6">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlide(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === slide ? 'w-6 bg-indigo-600 dark:bg-indigo-400' : 'w-1.5 bg-gray-300 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>

      {/* Slide content */}
      <div className="flex-1">
        <SlideContent />
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center py-4">
        <button
          onClick={() => setSlide((s) => Math.max(0, s - 1))}
          disabled={!canGoBack}
          className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <span className="text-xs text-gray-400 dark:text-gray-500">{slide + 1} / {totalSlides}</span>
        <button
          onClick={() => setSlide((s) => Math.min(totalSlides - 1, s + 1))}
          disabled={!canGoForward}
          className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 disabled:opacity-30 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition-colors"
        >
          Next <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
