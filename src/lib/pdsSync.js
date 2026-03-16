/**
 * PDS read/write abstraction for AT Protocol records.
 * Handles dual-write: localStorage (immediate) + PDS (background).
 * Failed PDS writes are queued for retry via syncQueue.
 */

import { bookRkey } from './atproto'
import * as syncQueue from './syncQueue'

const BOOK_COLLECTION = 'app.shelfwise.book'
const REVIEW_COLLECTION = 'app.shelfwise.review'
const CRITERIA_COLLECTION = 'app.shelfwise.criteriaTemplate'
const CHALLENGE_COLLECTION = 'app.shelfwise.challenge'

/**
 * Convert a local book object to a PDS record.
 */
function bookToRecord(book) {
  return {
    $type: BOOK_COLLECTION,
    title: book.title || '',
    author: book.author || '',
    isbn: book.isbn || '',
    openLibraryKey: book.key?.startsWith('/works/') ? book.key : '',
    coverId: book.coverId || undefined,
    shelf: book.shelf || 'wantToRead',
    tags: book.tags || [],
    notes: book.notes || '',
    ratings: book.ratings ? JSON.stringify(book.ratings) : '',
    createdAt: book.addedAt || new Date().toISOString(),
  }
}

/**
 * Convert a PDS record back to a local book object.
 */
function recordToBook(record, uri) {
  return {
    key: record.openLibraryKey || uri,
    title: record.title,
    author: record.author,
    isbn: record.isbn || null,
    coverId: record.coverId || null,
    shelf: record.shelf,
    tags: record.tags || [],
    notes: record.notes || '',
    addedAt: record.createdAt,
    ratings: record.ratings ? JSON.parse(record.ratings) : {},
    source: 'atproto',
    atUri: uri,
  }
}

/**
 * Write a book record to the user's PDS.
 * Uses putRecord (upsert) with deterministic rkey.
 */
export async function writeBook(agent, did, book) {
  const rkey = bookRkey(book.key)
  const record = bookToRecord(book)

  try {
    await agent.com.atproto.repo.putRecord({
      repo: did,
      collection: BOOK_COLLECTION,
      rkey,
      record,
    })
  } catch (err) {
    // Queue for retry
    await syncQueue.enqueue({
      collection: BOOK_COLLECTION,
      rkey,
      action: 'update',
      record,
    })
    throw err
  }
}

/**
 * Delete a book record from the user's PDS.
 */
export async function deleteBook(agent, did, book) {
  const rkey = bookRkey(book.key)

  try {
    await agent.com.atproto.repo.deleteRecord({
      repo: did,
      collection: BOOK_COLLECTION,
      rkey,
    })
  } catch (err) {
    await syncQueue.enqueue({
      collection: BOOK_COLLECTION,
      rkey,
      action: 'delete',
    })
    throw err
  }
}

/**
 * Fetch all book records from a user's PDS.
 * Returns local book objects.
 */
export async function fetchBooks(agent, did) {
  const books = []
  let cursor

  do {
    const res = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection: BOOK_COLLECTION,
      limit: 100,
      cursor,
    })

    for (const item of res.data.records) {
      books.push(recordToBook(item.value, item.uri))
    }

    cursor = res.data.cursor
  } while (cursor)

  return books
}

/**
 * Write a criteria template to the user's PDS.
 */
export async function writeCriteria(agent, did, criteria) {
  const record = {
    $type: CRITERIA_COLLECTION,
    name: 'My Criteria',
    criteria: criteria.map((c) => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji || '',
      max: c.max || 5,
      type: c.type || 'stars',
    })),
    createdAt: new Date().toISOString(),
  }

  try {
    await agent.com.atproto.repo.putRecord({
      repo: did,
      collection: CRITERIA_COLLECTION,
      rkey: 'self',
      record,
    })
  } catch {
    await syncQueue.enqueue({
      collection: CRITERIA_COLLECTION,
      rkey: 'self',
      action: 'update',
      record,
    })
  }
}

/**
 * Fetch criteria from a user's PDS.
 */
export async function fetchCriteria(agent, did) {
  try {
    const res = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection: CRITERIA_COLLECTION,
      rkey: 'self',
    })
    return res.data.value.criteria || []
  } catch {
    return null // No criteria on PDS yet
  }
}

/**
 * Write user settings to PDS (stored as a criteria template with rkey 'preferences').
 */
export async function writeSettings(agent, did, settings) {
  const record = {
    $type: CRITERIA_COLLECTION,
    name: '_preferences',
    criteria: [],
    createdAt: new Date().toISOString(),
    // Settings stored as extra fields — PDS accepts them
    libraryCode: settings.libraryCode || '',
    libraryName: settings.libraryName || '',
    language: settings.language || 'en',
    theme: settings.theme || 'light',
    defaultAction: settings.defaultAction || 'details',
    defaultAcquire: settings.defaultAcquire || 'none',
  }

  try {
    await agent.com.atproto.repo.putRecord({
      repo: did,
      collection: CRITERIA_COLLECTION,
      rkey: 'preferences',
      record,
    })
  } catch { /* non-fatal */ }
}

/**
 * Fetch user settings from PDS.
 */
export async function fetchSettings(agent, did) {
  try {
    const res = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection: CRITERIA_COLLECTION,
      rkey: 'preferences',
    })
    const v = res.data.value
    return {
      libraryCode: v.libraryCode || '',
      libraryName: v.libraryName || '',
      language: v.language || 'en',
      theme: v.theme || 'light',
      defaultAction: v.defaultAction || 'details',
      defaultAcquire: v.defaultAcquire || 'none',
    }
  } catch {
    return null
  }
}

/**
 * Write a challenge to the user's PDS.
 */
export async function writeChallenge(agent, did, challenge) {
  const record = {
    $type: CHALLENGE_COLLECTION,
    title: challenge.title,
    goal: challenge.goal,
    startDate: challenge.startDate,
    endDate: challenge.endDate,
    createdAt: challenge.createdAt || new Date().toISOString(),
  }

  const rkey = challenge.rkey || challenge.id

  try {
    await agent.com.atproto.repo.putRecord({
      repo: did,
      collection: CHALLENGE_COLLECTION,
      rkey,
      record,
    })
  } catch {
    await syncQueue.enqueue({
      collection: CHALLENGE_COLLECTION,
      rkey,
      action: 'update',
      record,
    })
  }
}

/**
 * Delete a challenge from the user's PDS.
 */
export async function deleteChallenge(agent, did, challengeId) {
  try {
    await agent.com.atproto.repo.deleteRecord({
      repo: did,
      collection: CHALLENGE_COLLECTION,
      rkey: challengeId,
    })
  } catch {
    await syncQueue.enqueue({
      collection: CHALLENGE_COLLECTION,
      rkey: challengeId,
      action: 'delete',
    })
  }
}

/**
 * Process the sync queue — retry failed PDS writes.
 * Call this on app load and when connectivity returns.
 */
export async function processSyncQueue(agent, did) {
  if (!agent || !did) return

  const pending = await syncQueue.getAll()
  const MAX_RETRIES = 5

  for (const op of pending) {
    if (op.retries >= MAX_RETRIES) {
      await syncQueue.remove(op.id)
      continue
    }

    try {
      if (op.action === 'delete') {
        await agent.com.atproto.repo.deleteRecord({
          repo: did,
          collection: op.collection,
          rkey: op.rkey,
        })
      } else {
        await agent.com.atproto.repo.putRecord({
          repo: did,
          collection: op.collection,
          rkey: op.rkey,
          record: op.record,
        })
      }
      await syncQueue.remove(op.id)
    } catch {
      await syncQueue.incrementRetry(op.id)
    }
  }
}
