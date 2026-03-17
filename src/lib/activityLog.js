/**
 * localStorage-backed activity log for reading streaks.
 * Each entry is { date: "YYYY-MM-DD", type: string, bookKey: string }
 */

const STORAGE_KEY = 'shelfwise-activity-log'

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
  } catch {
    return []
  }
}

function save(log) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
}

/**
 * Log a reading activity for today.
 */
export function logActivity(type, bookKey) {
  const today = new Date().toISOString().split('T')[0]
  const log = load()

  // Deduplicate: only one entry per type+bookKey per day
  const exists = log.some(
    (e) => e.date === today && e.type === type && e.bookKey === bookKey
  )
  if (!exists) {
    log.push({ date: today, type, bookKey })
    save(log)
  }
}

/**
 * Get all unique activity dates, sorted ascending.
 */
export function getActivityDates() {
  const log = load()
  const dates = [...new Set(log.map((e) => e.date))].sort()
  return dates
}

/**
 * Bootstrap the activity log from existing book data.
 * Call once when the log is empty to seed it from book dates.
 */
export function bootstrapFromBooks(books) {
  const log = load()
  if (log.length > 0) return // Already has data

  const entries = []
  for (const book of books) {
    if (book.addedAt) {
      const date = book.addedAt.split('T')[0]
      entries.push({ date, type: 'add', bookKey: book.key })
    }
    if (book.startedAt) {
      entries.push({ date: book.startedAt, type: 'started', bookKey: book.key })
    }
    if (book.finishedAt) {
      entries.push({ date: book.finishedAt, type: 'finished', bookKey: book.key })
    }
  }

  if (entries.length > 0) save(entries)
}

/**
 * Compute reading streaks from the activity log.
 * Returns { currentStreak, longestStreak, isActiveToday }
 */
export function computeStreaks() {
  const dates = getActivityDates()
  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0, isActiveToday: false }

  const today = new Date().toISOString().split('T')[0]
  const isActiveToday = dates.includes(today)

  // Convert dates to day numbers for easier consecutive-day checking
  const dayNumbers = dates.map((d) => {
    const t = new Date(d + 'T00:00:00Z')
    return Math.floor(t.getTime() / 86400000)
  })

  // Deduplicate and sort
  const uniqueDays = [...new Set(dayNumbers)].sort((a, b) => a - b)

  let longest = 1
  let current = 1

  for (let i = 1; i < uniqueDays.length; i++) {
    if (uniqueDays[i] === uniqueDays[i - 1] + 1) {
      current++
      longest = Math.max(longest, current)
    } else {
      current = 1
    }
  }
  longest = Math.max(longest, current)

  // Current streak: count backwards from today (or yesterday if not active today)
  const todayNum = Math.floor(new Date(today + 'T00:00:00Z').getTime() / 86400000)
  let startFrom = isActiveToday ? todayNum : todayNum - 1
  let currentStreak = 0

  // Check if the user was active on startFrom day
  if (uniqueDays.includes(startFrom)) {
    currentStreak = 1
    let check = startFrom - 1
    while (uniqueDays.includes(check)) {
      currentStreak++
      check--
    }
  }

  return { currentStreak, longestStreak: longest, isActiveToday }
}
