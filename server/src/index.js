import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initDB } from './db/client.js'
import { startJetstream } from './lib/jetstream.js'
import feedRoutes from './routes/feed.js'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

// Routes
app.use('/api', feedRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start
async function start() {
  try {
    await initDB()
    console.log('[DB] Schema initialized')

    await startJetstream()
    console.log('[Jetstream] Subscriber started')

    app.listen(PORT, () => {
      console.log(`[Server] Running on port ${PORT}`)
    })
  } catch (err) {
    console.error('[Server] Failed to start:', err)
    process.exit(1)
  }
}

start()
