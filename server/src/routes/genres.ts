import { Router, Request, Response } from 'express'
import db, { GenreRow } from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// Helper to create slug from name
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// GET /api/genres - List all genres
router.get('/', (req: Request, res: Response) => {
  const genres = db.prepare(`
    SELECT g.*, COUNT(gg.game_id) as game_count
    FROM genres g
    LEFT JOIN game_genres gg ON g.id = gg.genre_id
    GROUP BY g.id
    ORDER BY g.name ASC
  `).all()

  res.json(genres)
})

// POST /api/genres - Create a new genre (admin only)
router.post('/', authenticateToken, (req: Request, res: Response) => {
  const { name } = req.body

  if (!name) {
    res.status(400).json({ error: 'Genre name is required' })
    return
  }

  const slug = createSlug(name)

  // Check if genre already exists
  const existing = db.prepare('SELECT id FROM genres WHERE slug = ?').get(slug)
  if (existing) {
    res.status(409).json({ error: 'Genre already exists' })
    return
  }

  const result = db.prepare('INSERT INTO genres (name, slug) VALUES (?, ?)').run(name, slug)
  const genre = db.prepare('SELECT * FROM genres WHERE id = ?').get(result.lastInsertRowid)

  res.status(201).json(genre)
})

// POST /api/genres/ensure - Create genre if not exists (used by Steam import)
router.post('/ensure', authenticateToken, (req: Request, res: Response) => {
  const { names } = req.body

  if (!names || !Array.isArray(names)) {
    res.status(400).json({ error: 'names array is required' })
    return
  }

  const genres: GenreRow[] = []

  for (const name of names) {
    const slug = createSlug(name)
    
    let genre = db.prepare('SELECT * FROM genres WHERE slug = ?').get(slug) as GenreRow | undefined
    
    if (!genre) {
      const result = db.prepare('INSERT INTO genres (name, slug) VALUES (?, ?)').run(name, slug)
      genre = db.prepare('SELECT * FROM genres WHERE id = ?').get(result.lastInsertRowid) as GenreRow
    }
    
    genres.push(genre)
  }

  res.json(genres)
})

// DELETE /api/genres/:id - Delete a genre (admin only)
router.delete('/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params

  const existing = db.prepare('SELECT id FROM genres WHERE id = ?').get(id)
  if (!existing) {
    res.status(404).json({ error: 'Genre not found' })
    return
  }

  // Remove from junction table first (though CASCADE should handle this)
  db.prepare('DELETE FROM game_genres WHERE genre_id = ?').run(id)
  db.prepare('DELETE FROM genres WHERE id = ?').run(id)

  res.json({ success: true })
})

export default router
