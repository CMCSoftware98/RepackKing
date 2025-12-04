import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

import authRoutes from './routes/auth.js'
import gamesRoutes from './routes/games.js'
import analyticsRoutes from './routes/analytics.js'
import uploadRoutes from './routes/upload.js'
import steamRoutes from './routes/steam.js'
import reportsRoutes from './routes/reports.js'
import genresRoutes from './routes/genres.js'
import ratingsRoutes from './routes/ratings.js'
import noticesRoutes from './routes/notices.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}))
app.use(express.json())

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')))

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/games', gamesRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/steam', steamRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/genres', genresRoutes)
app.use('/api/ratings', ratingsRoutes)
app.use('/api/notices', noticesRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`API available at http://localhost:${PORT}/api`)
})
