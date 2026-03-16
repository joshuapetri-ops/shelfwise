/**
 * Calculate a composite score from a book's ratings and criteria.
 * Returns a 0-100 normalized score, or null if no ratings exist.
 */
export function computeComposite(ratings, criteria) {
  if (!ratings || !criteria?.length) return null

  let total = 0
  let maxTotal = 0

  for (const c of criteria) {
    const val = ratings[c.id]
    if (val != null) {
      total += (val / c.max) * 100
      maxTotal += 100
    }
  }

  if (maxTotal === 0) return null
  return Math.round(total / (maxTotal / 100))
}

/**
 * Format composite score for display (e.g. "87")
 */
export function formatComposite(score) {
  if (score == null) return '—'
  return String(score)
}

/**
 * Get a color class based on composite score
 */
export function compositeColor(score) {
  if (score == null) return 'text-gray-400'
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 60) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}

/**
 * Get a bg color class based on composite score
 */
export function compositeBg(score) {
  if (score == null) return 'bg-gray-100 dark:bg-gray-800'
  if (score >= 80) return 'bg-emerald-50 dark:bg-emerald-950'
  if (score >= 60) return 'bg-amber-50 dark:bg-amber-950'
  return 'bg-red-50 dark:bg-red-950'
}
