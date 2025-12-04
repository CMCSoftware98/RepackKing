import { Router, Request, Response } from 'express'
import db, { GameRow } from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

// Helper to get genres for a game
function getGameGenres(gameId: number): string[] {
  const genres = db.prepare(`
    SELECT g.name FROM genres g
    JOIN game_genres gg ON g.id = gg.genre_id
    WHERE gg.game_id = ?
    ORDER BY g.name
  `).all(gameId) as { name: string }[]
  return genres.map(g => g.name)
}

// Helper to get rating stats for a game
function getGameRating(gameId: number): { average: number; count: number } {
  const result = db.prepare(`
    SELECT AVG(rating) as average, COUNT(*) as count 
    FROM game_ratings 
    WHERE game_id = ?
  `).get(gameId) as { average: number | null; count: number }
  
  return {
    average: result.average ? Math.round(result.average * 10) / 10 : 0,
    count: result.count
  }
}

// Helper to get time filter SQL condition
function getTimeFilter(period: string): string {
  switch (period) {
    case '24h':
      return "AND a.created_at >= datetime('now', '-1 day')"
    case '7d':
      return "AND a.created_at >= datetime('now', '-7 days')"
    case '30d':
      return "AND a.created_at >= datetime('now', '-30 days')"
    default:
      return '' // all time
  }
}

// Helper to get analytics for a game
function getGameAnalytics(gameId: number, period: string = 'all'): { views: number; downloads: number } {
  const timeFilter = getTimeFilter(period)
  
  const result = db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END), 0) as views,
      COALESCE(SUM(CASE WHEN event_type = 'download' THEN 1 ELSE 0 END), 0) as downloads
    FROM analytics a
    WHERE a.game_id = ? ${timeFilter}
  `).get(gameId) as { views: number; downloads: number }
  
  return result
}

// Helper to attach genres, ratings, and analytics to games
function attachExtrasToGames(games: GameRow[], period: string = 'all'): (GameRow & { genres: string[]; rating: { average: number; count: number }; analytics: { views: number; downloads: number } })[] {
  return games.map(game => ({
    ...game,
    genres: getGameGenres(game.id),
    rating: getGameRating(game.id),
    analytics: getGameAnalytics(game.id, period)
  }))
}

// GET /api/games - List all games with pagination and search
router.get('/', (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30))
  const search = (req.query.search as string) || ''
  const genre = (req.query.genre as string) || ''
  const period = (req.query.period as string) || 'all' // all, 30d, 7d, 24h
  const offset = (page - 1) * limit

  let countQuery = 'SELECT COUNT(DISTINCT g.id) as total FROM games g'
  let dataQuery = 'SELECT DISTINCT g.* FROM games g'
  const params: (string | number)[] = []
  const conditions: string[] = []

  if (genre) {
    countQuery += ' JOIN game_genres gg ON g.id = gg.game_id JOIN genres gr ON gg.genre_id = gr.id'
    dataQuery += ' JOIN game_genres gg ON g.id = gg.game_id JOIN genres gr ON gg.genre_id = gr.id'
    conditions.push('gr.slug = ?')
    params.push(genre)
  }

  if (search) {
    conditions.push('g.title LIKE ?')
    params.push(`%${search}%`)
  }

  if (conditions.length > 0) {
    const whereClause = ' WHERE ' + conditions.join(' AND ')
    countQuery += whereClause
    dataQuery += whereClause
  }

  dataQuery += ' ORDER BY g.created_at DESC LIMIT ? OFFSET ?'

  const countResult = db.prepare(countQuery).get(...params) as { total: number }
  const total = countResult.total

  const games = db.prepare(dataQuery).all(...params, limit, offset) as GameRow[]
  const gamesWithExtras = attachExtrasToGames(games, period)

  res.json({
    games: gamesWithExtras,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  })
})

// GET /api/games/:slug - Get single game by slug
router.get('/:slug', (req: Request, res: Response) => {
  const { slug } = req.params

  const game = db.prepare('SELECT * FROM games WHERE slug = ?').get(slug) as GameRow | undefined

  if (!game) {
    res.status(404).json({ error: 'Game not found' })
    return
  }

  // Attach genres, rating, and screenshots
  const gameWithExtras = {
    ...game,
    genres: getGameGenres(game.id),
    rating: getGameRating(game.id),
    screenshots: getGameScreenshots(game.id)
  }

  res.json(gameWithExtras)
})

// Helper to update game genres
function updateGameGenres(gameId: number, genreNames: string[]) {
  // Remove existing genres
  db.prepare('DELETE FROM game_genres WHERE game_id = ?').run(gameId)

  // Add new genres
  for (const name of genreNames) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    
    // Ensure genre exists
    let genre = db.prepare('SELECT id FROM genres WHERE slug = ?').get(slug) as { id: number } | undefined
    if (!genre) {
      const result = db.prepare('INSERT INTO genres (name, slug) VALUES (?, ?)').run(name, slug)
      genre = { id: result.lastInsertRowid as number }
    }
    
    // Link to game
    db.prepare('INSERT OR IGNORE INTO game_genres (game_id, genre_id) VALUES (?, ?)').run(gameId, genre.id)
  }
}

// Helper to get screenshots for a game
function getGameScreenshots(gameId: number): string[] {
  const screenshots = db.prepare(`
    SELECT image_path FROM game_screenshots 
    WHERE game_id = ? 
    ORDER BY sort_order, id
  `).all(gameId) as { image_path: string }[]
  return screenshots.map(s => s.image_path)
}

// Helper to update game screenshots
function updateGameScreenshots(gameId: number, screenshotPaths: string[]) {
  // Get existing screenshots to compare
  const existing = db.prepare('SELECT image_path FROM game_screenshots WHERE game_id = ?').all(gameId) as { image_path: string }[]
  const existingPaths = new Set(existing.map(s => s.image_path))
  const newPaths = new Set(screenshotPaths)

  // Delete screenshots that are no longer in the list (also delete files)
  for (const screenshot of existing) {
    if (!newPaths.has(screenshot.image_path)) {
      deleteImageFile(screenshot.image_path)
    }
  }

  // Remove all existing screenshot records
  db.prepare('DELETE FROM game_screenshots WHERE game_id = ?').run(gameId)

  // Add new screenshots with sort order
  for (let i = 0; i < screenshotPaths.length; i++) {
    db.prepare('INSERT INTO game_screenshots (game_id, image_path, sort_order) VALUES (?, ?, ?)').run(
      gameId,
      screenshotPaths[i],
      i
    )
  }
}

// POST /api/games - Create new game (admin only)
router.post('/', authenticateToken, (req: Request, res: Response) => {
  const {
    title,
    description,
    cover_image,
    size_bytes,
    magnet_uri,
    version,
    min_cpu,
    min_gpu,
    min_ram,
    min_storage,
    min_os,
    rec_cpu,
    rec_gpu,
    rec_ram,
    rec_storage,
    rec_os,
    genres,
    screenshots
  } = req.body

  if (!title) {
    res.status(400).json({ error: 'Title is required' })
    return
  }

  // Generate a random GUID for the slug
  const slug = uuidv4()

  const result = db.prepare(`
    INSERT INTO games (title, slug, description, cover_image, size_bytes, magnet_uri, version, min_cpu, min_gpu, min_ram, min_storage, min_os, rec_cpu, rec_gpu, rec_ram, rec_storage, rec_os)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    slug,
    description || null,
    cover_image || null,
    size_bytes || 0,
    magnet_uri || null,
    version || null,
    min_cpu || null,
    min_gpu || null,
    min_ram || null,
    min_storage || null,
    min_os || null,
    rec_cpu || null,
    rec_gpu || null,
    rec_ram || null,
    rec_storage || null,
    rec_os || null
  )

  const gameId = result.lastInsertRowid as number

  // Handle genres if provided
  if (genres && Array.isArray(genres)) {
    updateGameGenres(gameId, genres)
  }

  // Handle screenshots if provided
  if (screenshots && Array.isArray(screenshots)) {
    updateGameScreenshots(gameId, screenshots)
  }

  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as GameRow

  res.status(201).json({
    ...game,
    genres: getGameGenres(gameId),
    screenshots: getGameScreenshots(gameId)
  })
})

// PUT /api/games/:id - Update game (admin only)
router.put('/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params
  const {
    title,
    description,
    cover_image,
    size_bytes,
    magnet_uri,
    version,
    min_cpu,
    min_gpu,
    min_ram,
    min_storage,
    min_os,
    rec_cpu,
    rec_gpu,
    rec_ram,
    rec_storage,
    rec_os,
    genres,
    screenshots
  } = req.body

  const existing = db.prepare('SELECT * FROM games WHERE id = ?').get(id) as GameRow | undefined

  if (!existing) {
    res.status(404).json({ error: 'Game not found' })
    return
  }

  // Check if cover image changed - delete old one if so
  if (cover_image !== undefined && cover_image !== existing.cover_image) {
    deleteImageFile(existing.cover_image)
  }

  // Slug never changes - it's a permanent GUID identifier
  db.prepare(`
    UPDATE games SET
      title = ?,
      description = ?,
      cover_image = ?,
      size_bytes = ?,
      magnet_uri = ?,
      version = ?,
      min_cpu = ?,
      min_gpu = ?,
      min_ram = ?,
      min_storage = ?,
      min_os = ?,
      rec_cpu = ?,
      rec_gpu = ?,
      rec_ram = ?,
      rec_storage = ?,
      rec_os = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title || existing.title,
    description !== undefined ? description : existing.description,
    cover_image !== undefined ? cover_image : existing.cover_image,
    size_bytes !== undefined ? size_bytes : existing.size_bytes,
    magnet_uri !== undefined ? magnet_uri : existing.magnet_uri,
    version !== undefined ? version : existing.version,
    min_cpu !== undefined ? min_cpu : existing.min_cpu,
    min_gpu !== undefined ? min_gpu : existing.min_gpu,
    min_ram !== undefined ? min_ram : existing.min_ram,
    min_storage !== undefined ? min_storage : existing.min_storage,
    min_os !== undefined ? min_os : existing.min_os,
    rec_cpu !== undefined ? rec_cpu : existing.rec_cpu,
    rec_gpu !== undefined ? rec_gpu : existing.rec_gpu,
    rec_ram !== undefined ? rec_ram : existing.rec_ram,
    rec_storage !== undefined ? rec_storage : existing.rec_storage,
    rec_os !== undefined ? rec_os : existing.rec_os,
    id
  )

  // Handle genres if provided
  if (genres !== undefined && Array.isArray(genres)) {
    updateGameGenres(parseInt(id), genres)
  }

  // Handle screenshots if provided
  if (screenshots !== undefined && Array.isArray(screenshots)) {
    updateGameScreenshots(parseInt(id), screenshots)
  }

  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(id) as GameRow

  res.json({
    ...game,
    genres: getGameGenres(parseInt(id)),
    screenshots: getGameScreenshots(parseInt(id))
  })
})

// Helper to delete image file from uploads folder
function deleteImageFile(imagePath: string | null) {
  if (!imagePath) return
  
  // Only delete local uploads (paths starting with /uploads/)
  if (!imagePath.startsWith('/uploads/')) return
  
  const filename = imagePath.replace('/uploads/', '')
  const fullPath = path.join(__dirname, '../../../uploads', filename)
  
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
      console.log(`Deleted image: ${fullPath}`)
    }
  } catch (error) {
    console.error(`Failed to delete image ${fullPath}:`, error)
  }
}

// DELETE /api/games/:id - Delete game (admin only)
router.delete('/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params

  const existing = db.prepare('SELECT id, cover_image FROM games WHERE id = ?').get(id) as { id: number; cover_image: string | null } | undefined

  if (!existing) {
    res.status(404).json({ error: 'Game not found' })
    return
  }

  // Get all screenshots for this game
  const screenshots = db.prepare('SELECT image_path FROM game_screenshots WHERE game_id = ?').all(id) as { image_path: string }[]

  // Delete cover image
  deleteImageFile(existing.cover_image)

  // Delete all screenshot images
  for (const screenshot of screenshots) {
    deleteImageFile(screenshot.image_path)
  }

  // Delete game from database (ON DELETE CASCADE will handle game_screenshots, game_genres, etc.)
  db.prepare('DELETE FROM games WHERE id = ?').run(id)

  res.json({ success: true })
})

// POST /api/games/:id/view - Track game view
router.post('/:id/view', (req: Request, res: Response) => {
  const { id } = req.params

  const existing = db.prepare('SELECT id FROM games WHERE id = ?').get(id)

  if (!existing) {
    res.status(404).json({ error: 'Game not found' })
    return
  }

  db.prepare('INSERT INTO analytics (game_id, event_type) VALUES (?, ?)').run(id, 'view')

  res.json({ success: true })
})

// POST /api/games/:id/download - Track download click
router.post('/:id/download', (req: Request, res: Response) => {
  const { id } = req.params

  const existing = db.prepare('SELECT id FROM games WHERE id = ?').get(id)

  if (!existing) {
    res.status(404).json({ error: 'Game not found' })
    return
  }

  db.prepare('INSERT INTO analytics (game_id, event_type) VALUES (?, ?)').run(id, 'download')

  res.json({ success: true })
})

export default router
