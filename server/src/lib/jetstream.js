import WebSocket from 'ws'
import { getJetstreamCursor, updateJetstreamCursor, insertFeedEvent, upsertActor } from '../db/client.js'

const SHELFWISE_COLLECTIONS = [
  'app.shelfwise.book',
  'app.shelfwise.review',
  'app.shelfwise.challenge',
  'app.shelfwise.criteriaTemplate',
]

let ws = null
let reconnectTimer = null
let sseClients = new Set()

/**
 * Register an SSE client for live feed updates.
 */
export function addSSEClient(res) {
  sseClients.add(res)
  res.on('close', () => sseClients.delete(res))
}

/**
 * Broadcast an event to all connected SSE clients.
 */
function broadcastSSE(event) {
  const data = JSON.stringify(event)
  for (const client of sseClients) {
    client.write(`data: ${data}\n\n`)
  }
}

/**
 * Start the Jetstream WebSocket subscriber.
 */
export async function startJetstream() {
  const baseUrl = process.env.JETSTREAM_URL || 'wss://jetstream1.us-east.bsky.network/subscribe'
  const cursor = await getJetstreamCursor()

  const params = new URLSearchParams()
  for (const col of SHELFWISE_COLLECTIONS) {
    params.append('wantedCollections', col)
  }
  if (cursor > 0) {
    params.append('cursor', String(cursor))
  }

  const url = `${baseUrl}?${params.toString()}`
  console.log(`[Jetstream] Connecting to ${url}`)

  ws = new WebSocket(url)

  ws.on('open', () => {
    console.log('[Jetstream] Connected')
  })

  ws.on('message', async (raw) => {
    try {
      const event = JSON.parse(raw.toString())

      if (event.kind !== 'commit') return

      const { did, time_us, commit } = event
      if (!commit || !SHELFWISE_COLLECTIONS.includes(commit.collection)) return

      const eventTime = new Date(time_us / 1000)

      // Store in database
      await insertFeedEvent(
        did,
        commit.collection,
        commit.rkey,
        commit.operation,
        commit.record || null,
        eventTime,
      )

      // Update cursor
      await updateJetstreamCursor(time_us)

      // Broadcast to SSE clients
      broadcastSSE({
        did,
        collection: commit.collection,
        rkey: commit.rkey,
        operation: commit.operation,
        record: commit.record || null,
        eventTime: eventTime.toISOString(),
      })
    } catch (err) {
      console.error('[Jetstream] Error processing message:', err.message)
    }
  })

  ws.on('close', (code) => {
    console.log(`[Jetstream] Disconnected (code: ${code}), reconnecting in 5s...`)
    scheduleReconnect()
  })

  ws.on('error', (err) => {
    console.error('[Jetstream] WebSocket error:', err.message)
    ws.close()
  })
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer)
  reconnectTimer = setTimeout(() => startJetstream(), 5000)
}

export function stopJetstream() {
  clearTimeout(reconnectTimer)
  if (ws) {
    ws.close()
    ws = null
  }
}
