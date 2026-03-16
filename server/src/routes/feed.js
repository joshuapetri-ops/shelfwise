import { Router } from 'express'
import { getFeedForFollows, query } from '../db/client.js'
import { addSSEClient } from '../lib/jetstream.js'

const router = Router()

/**
 * GET /api/feed?did=<user_did>&limit=50&before=<iso_date>
 * Returns social feed events for users the given DID follows.
 */
router.get('/feed', async (req, res) => {
  const { did, limit = '50', before } = req.query

  if (!did) {
    return res.status(400).json({ error: 'did parameter is required' })
  }

  try {
    const result = await getFeedForFollows(did, parseInt(limit, 10), before || null)

    const events = result.rows.map((row) => ({
      id: row.id,
      did: row.did,
      handle: row.handle,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      collection: row.collection,
      rkey: row.rkey,
      operation: row.operation,
      record: row.record_json,
      eventTime: row.event_time,
    }))

    res.json({ events })
  } catch (err) {
    console.error('[Feed] Error:', err.message)
    res.status(500).json({ error: 'Failed to fetch feed' })
  }
})

/**
 * GET /api/feed/live?did=<user_did>
 * Server-Sent Events endpoint for real-time feed updates.
 */
router.get('/feed/live', (req, res) => {
  const { did } = req.query

  if (!did) {
    return res.status(400).json({ error: 'did parameter is required' })
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)

  addSSEClient(res)
})

/**
 * POST /api/follows/sync
 * Sync a user's follow list from AT Protocol.
 * Body: { did: string }
 */
router.post('/follows/sync', async (req, res) => {
  const { did } = req.body

  if (!did) {
    return res.status(400).json({ error: 'did is required' })
  }

  try {
    // Fetch follows from the Bluesky API
    let cursor
    let total = 0

    do {
      const params = new URLSearchParams({ actor: did, limit: '100' })
      if (cursor) params.append('cursor', cursor)

      const resp = await fetch(
        `https://public.api.bsky.app/xrpc/app.bsky.graph.getFollows?${params}`,
      )
      const data = await resp.json()

      for (const follow of data.follows || []) {
        // Upsert actor
        await query(
          `INSERT INTO actors (did, handle, display_name, avatar_url)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (did) DO UPDATE SET
             handle = EXCLUDED.handle,
             display_name = EXCLUDED.display_name,
             avatar_url = EXCLUDED.avatar_url`,
          [follow.did, follow.handle, follow.displayName || null, follow.avatar || null],
        )

        // Upsert follow relationship
        await query(
          `INSERT INTO follows (follower_did, subject_did, rkey)
           VALUES ($1, $2, $3)
           ON CONFLICT (follower_did, subject_did) DO NOTHING`,
          [did, follow.did, follow.did],
        )

        total++
      }

      cursor = data.cursor
    } while (cursor)

    res.json({ synced: total })
  } catch (err) {
    console.error('[Follows] Sync error:', err.message)
    res.status(500).json({ error: 'Failed to sync follows' })
  }
})

export default router
