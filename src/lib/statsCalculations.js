/**
 * Shared stat computation functions for Stats page and Year in Review.
 */

// Map noisy Open Library subjects to macro-categories
const GENRE_MAP = {
  'fiction': 'Fiction',
  'literary fiction': 'Fiction',
  'general fiction': 'Fiction',
  'science fiction': 'Sci-Fi',
  'sci-fi': 'Sci-Fi',
  'fantasy': 'Fantasy',
  'epic fantasy': 'Fantasy',
  'urban fantasy': 'Fantasy',
  'mystery': 'Mystery',
  'detective': 'Mystery',
  'crime': 'Mystery',
  'thriller': 'Thriller',
  'suspense': 'Thriller',
  'romance': 'Romance',
  'love stories': 'Romance',
  'contemporary romance': 'Romance',
  'horror': 'Horror',
  'biography': 'Biography',
  'autobiography': 'Biography',
  'memoir': 'Memoir',
  'memoirs': 'Memoir',
  'history': 'History',
  'historical fiction': 'Historical Fiction',
  'self-help': 'Self-Help',
  'self help': 'Self-Help',
  'personal development': 'Self-Help',
  'business': 'Business',
  'economics': 'Business',
  'science': 'Science',
  'popular science': 'Science',
  'philosophy': 'Philosophy',
  'poetry': 'Poetry',
  'young adult': 'Young Adult',
  'ya': 'Young Adult',
  'children': "Children's",
  "children's literature": "Children's",
  'graphic novels': 'Graphic Novels',
  'comics': 'Graphic Novels',
  'nonfiction': 'Non-Fiction',
  'non-fiction': 'Non-Fiction',
  'essays': 'Non-Fiction',
  'psychology': 'Psychology',
  'travel': 'Travel',
  'cooking': 'Cooking',
  'food': 'Cooking',
  'art': 'Art',
  'music': 'Music',
  'religion': 'Religion',
  'spirituality': 'Spirituality',
  'politics': 'Politics',
  'technology': 'Technology',
}

/**
 * Classify a book's subjects into macro-genres.
 * Returns an array of genre strings.
 */
export function classifyGenres(subjects) {
  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) return ['Unclassified']

  const genres = new Set()
  for (const subject of subjects) {
    if (!subject) continue
    const lower = String(subject).toLowerCase().trim()
    if (GENRE_MAP[lower]) {
      genres.add(GENRE_MAP[lower])
    } else {
      // Try partial matches
      for (const [keyword, genre] of Object.entries(GENRE_MAP)) {
        if (lower.includes(keyword)) {
          genres.add(genre)
          break
        }
      }
    }
  }

  return genres.size > 0 ? [...genres] : ['Unclassified']
}

/**
 * Calculate genre breakdown from an array of books.
 * Returns sorted array of { genre, count, percentage }.
 */
export function calcGenreBreakdown(books) {
  const counts = {}
  for (const book of books) {
    const genres = classifyGenres(book.subjects)
    for (const genre of genres) {
      counts[genre] = (counts[genre] || 0) + 1
    }
  }

  const total = books.length || 1
  return Object.entries(counts)
    .map(([genre, count]) => ({
      genre,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Calculate average reading pace (days per book).
 * Only counts books with both startedAt and finishedAt.
 */
export function calcReadingPace(books) {
  const paced = books.filter((b) => b.startedAt && b.finishedAt)
  if (paced.length === 0) return null

  let totalDays = 0
  for (const book of paced) {
    const start = new Date(book.startedAt)
    const end = new Date(book.finishedAt)
    const days = Math.max(1, Math.round((end - start) / 86400000))
    totalDays += days
  }

  return Math.round(totalDays / paced.length)
}

/**
 * Find the fastest and slowest reads.
 */
export function calcFastestSlowest(books) {
  const paced = books
    .filter((b) => b.startedAt && b.finishedAt)
    .map((b) => ({
      ...b,
      days: Math.max(1, Math.round((new Date(b.finishedAt) - new Date(b.startedAt)) / 86400000)),
    }))
    .sort((a, b) => a.days - b.days)

  return {
    fastest: paced[0] || null,
    slowest: paced[paced.length - 1] || null,
  }
}

/**
 * Calculate total pages read.
 */
export function calcTotalPages(books) {
  return books.reduce((sum, b) => sum + (b.pageCount || 0), 0)
}

/**
 * Get diversity tag counts from books.
 * Diversity tags start with "diversity:" prefix.
 */
export function calcDiversityStats(books) {
  const counts = {}
  let totalWithTags = 0

  for (const book of books) {
    const diversityTags = (book.tags || []).filter((t) => t.startsWith('diversity:'))
    if (diversityTags.length > 0) totalWithTags++
    for (const tag of diversityTags) {
      const label = tag.replace('diversity:', '').replace(/-/g, ' ')
      counts[label] = (counts[label] || 0) + 1
    }
  }

  return {
    totalTagged: totalWithTags,
    tags: Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
  }
}

/**
 * Year-over-year reading counts.
 * Returns sorted array of { year, count }.
 */
export function calcYearOverYear(books) {
  const readBooks = books.filter((b) => b.shelf === 'read')
  const yearCounts = {}

  for (const book of readBooks) {
    const dateStr = book.finishedAt || book.addedAt
    if (!dateStr) continue
    try {
      const year = new Date(dateStr).getFullYear()
      if (year > 2000 && year < 2100) {
        yearCounts[year] = (yearCounts[year] || 0) + 1
      }
    } catch { /* ignore */ }
  }

  return Object.entries(yearCounts)
    .map(([year, count]) => ({ year: Number(year), count }))
    .sort((a, b) => a.year - b.year)
}

// Genre colors for charts
export const GENRE_COLORS = {
  'Fiction': '#6366f1',
  'Sci-Fi': '#06b6d4',
  'Fantasy': '#8b5cf6',
  'Mystery': '#f59e0b',
  'Thriller': '#ef4444',
  'Romance': '#ec4899',
  'Horror': '#1f2937',
  'Biography': '#10b981',
  'Memoir': '#14b8a6',
  'History': '#b45309',
  'Historical Fiction': '#d97706',
  'Self-Help': '#22c55e',
  'Business': '#3b82f6',
  'Science': '#0ea5e9',
  'Philosophy': '#a855f7',
  'Poetry': '#e879f9',
  'Young Adult': '#f472b6',
  "Children's": '#fb923c',
  'Graphic Novels': '#facc15',
  'Non-Fiction': '#64748b',
  'Psychology': '#2dd4bf',
  'Travel': '#38bdf8',
  'Cooking': '#f97316',
  'Art': '#c084fc',
  'Unclassified': '#94a3b8',
}
