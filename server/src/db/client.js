import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

export async function initDB() {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
  await pool.query(schema)
}

export async function query(text, params) {
  return pool.query(text, params)
}

export async function getJetstreamCursor() {
  const res = await pool.query('SELECT cursor_us FROM jetstream_state WHERE id = 1')
  return res.rows[0]?.cursor_us || 0
}

export async function updateJetstreamCursor(cursorUs) {
  await pool.query(
    'UPDATE jetstream_state SET cursor_us = $1, updated_at = NOW() WHERE id = 1',
    [cursorUs],
  )
}

export async function insertFeedEvent(did, collection, rkey, operation, record, eventTime) {
  await pool.query(
    `INSERT INTO feed_events (did, collection, rkey, operation, record_json, event_time)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [did, collection, rkey, operation, record ? JSON.stringify(record) : null, eventTime],
  )
}

export async function upsertActor(did, handle, displayName, avatarUrl) {
  await pool.query(
    `INSERT INTO actors (did, handle, display_name, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (did) DO UPDATE SET
       handle = EXCLUDED.handle,
       display_name = EXCLUDED.display_name,
       avatar_url = EXCLUDED.avatar_url,
       indexed_at = NOW()`,
    [did, handle, displayName, avatarUrl],
  )
}

export async function getFeedForFollows(followerDid, limit = 50, before = null) {
  const params = [followerDid, limit]
  let sql = `
    SELECT fe.*, a.handle, a.display_name, a.avatar_url
    FROM feed_events fe
    JOIN follows f ON f.subject_did = fe.did AND f.follower_did = $1
    LEFT JOIN actors a ON a.did = fe.did
  `
  if (before) {
    sql += ` WHERE fe.event_time < $3`
    params.push(before)
  }
  sql += ` ORDER BY fe.event_time DESC LIMIT $2`

  return pool.query(sql, params)
}

export default pool
