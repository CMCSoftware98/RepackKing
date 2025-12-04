import { Router, Request, Response } from 'express'
import db from '../database/db.js'

const router = Router()

interface RatingStats {
  average: number
  count: number
  distribution: { [key: number]: number }
}

// POST /api/ratings - Submit a rating (public)
router.post('/', (req: Request, res: Response) => {
  const { game_id, rating } = req.body

  if (!game_id || !rating) {
    res.status(400).json({ error: 'game_id and rating are required' })
    return
  }

  const ratingNum = parseInt(rating)
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    res.status(400).json({ error: 'Rating must be between 1 and 5' })
    return
  }

  // Check if game exists
  const game = db.prepare('SELECT id FROM games WHERE id = ?').get(game_id)
  if (!game) {
    res.status(404).json({ error: 'Game not found' })
    return
  }

  // Insert rating
  db.prepare('INSERT INTO game_ratings (game_id, rating) VALUES (?, ?)').run(game_id, ratingNum)

  // Get updated stats
  const stats = getGameRatingStats(game_id)

  res.status(201).json({
    success: true,
    message: 'Rating submitted successfully',
    stats
  })
})

// GET /api/ratings/:gameId - Get rating stats for a game
router.get('/:gameId', (req: Request, res: Response) => {
  const { gameId } = req.params

  // Check if game exists
  const game = db.prepare('SELECT id FROM games WHERE id = ?').get(gameId)
  if (!game) {
    res.status(404).json({ error: 'Game not found' })
    return
  }

  const stats = getGameRatingStats(parseInt(gameId))
  res.json(stats)
})

// Helper to get rating statistics for a game
function getGameRatingStats(gameId: number): RatingStats {
  const avgResult = db.prepare(`
    SELECT AVG(rating) as average, COUNT(*) as count 
    FROM game_ratings 
    WHERE game_id = ?
  `).get(gameId) as { average: number | null; count: number }

  // Get distribution
  const distResults = db.prepare(`
    SELECT rating, COUNT(*) as count 
    FROM game_ratings 
    WHERE game_id = ? 
    GROUP BY rating
  `).all(gameId) as { rating: number; count: number }[]

  const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const row of distResults) {
    distribution[row.rating] = row.count
  }

  return {
    average: avgResult.average ? Math.round(avgResult.average * 10) / 10 : 0,
    count: avgResult.count,
    distribution
  }
}

export default router
