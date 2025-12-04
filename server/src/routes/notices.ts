import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

interface DmcaNoticeRow {
  id: number
  game_id: number | null
  tracking_id: string | null
  content_name: string
  content_url: string | null
  company_name: string
  full_name: string
  email: string
  phone: string | null
  description: string | null
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'completed'
  admin_notes: string | null
  public_note: string | null
  created_at: string
  updated_at: string
}

interface DmcaNoticeWithGame extends DmcaNoticeRow {
  game_title?: string
  game_slug?: string
}

// POST /api/notices - Submit a new DMCA notice (public)
router.post('/', (req: Request, res: Response) => {
  const {
    game_id,
    company_name,
    full_name,
    email,
    phone,
    description
  } = req.body

  // Validation
  if (!game_id || !company_name || !full_name || !email || !phone || !description) {
    res.status(400).json({ 
      error: 'All fields are required: game_id, company_name, full_name, email, phone, and description' 
    })
    return
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: 'Invalid email format' })
    return
  }

  // Validate game_id and get game info
  const game = db.prepare('SELECT id, title, slug FROM games WHERE id = ?').get(game_id) as { id: number; title: string; slug: string } | undefined
  if (!game) {
    res.status(400).json({ error: 'Invalid game_id: game not found' })
    return
  }

  // Auto-populate content_name and content_url from the game
  const content_name = game.title
  const content_url = `/game/${game.slug}`
  const tracking_id = randomUUID()

  const result = db.prepare(`
    INSERT INTO dmca_notices (game_id, tracking_id, content_name, content_url, company_name, full_name, email, phone, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    game_id,
    tracking_id,
    content_name,
    content_url,
    company_name,
    full_name,
    email,
    phone,
    description
  )

  res.status(201).json({
    success: true,
    id: result.lastInsertRowid,
    tracking_id,
    message: 'DMCA notice submitted successfully. We will review your request within 1-24 hours.'
  })
})

// GET /api/notices/track/:trackingId - Public status lookup by tracking ID
router.get('/track/:trackingId', (req: Request, res: Response) => {
  const { trackingId } = req.params

  const notice = db.prepare(`
    SELECT tracking_id, status, public_note, created_at, updated_at
    FROM dmca_notices
    WHERE tracking_id = ?
  `).get(trackingId) as { tracking_id: string; status: string; public_note: string | null; created_at: string; updated_at: string } | undefined

  if (!notice) {
    res.status(404).json({ error: 'Notice not found. Please check your tracking ID.' })
    return
  }

  res.json({
    type: 'dmca',
    tracking_id: notice.tracking_id,
    status: notice.status,
    public_note: notice.public_note,
    submitted_at: notice.created_at,
    updated_at: notice.updated_at
  })
})

// GET /api/notices - List all DMCA notices (admin only)
router.get('/', authenticateToken, (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
  const status = req.query.status as string || ''
  const includeCompleted = req.query.includeCompleted === 'true'
  const offset = (page - 1) * limit

  let countQuery = 'SELECT COUNT(*) as total FROM dmca_notices'
  let dataQuery = `
    SELECT n.*, g.title as game_title, g.slug as game_slug
    FROM dmca_notices n
    LEFT JOIN games g ON n.game_id = g.id
  `
  const params: (string | number)[] = []
  const conditions: string[] = []

  if (status) {
    conditions.push('n.status = ?')
    params.push(status)
  } else if (!includeCompleted) {
    // By default, hide completed items unless specifically filtered or includeCompleted=true
    conditions.push("n.status != 'completed'")
  }

  if (conditions.length > 0) {
    const whereClause = ' WHERE ' + conditions.join(' AND ')
    countQuery += whereClause.replace(/n\./g, '')
    dataQuery += whereClause
  }

  dataQuery += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?'

  const countResult = db.prepare(countQuery).get(...params) as { total: number }
  const total = countResult.total

  const notices = db.prepare(dataQuery).all(...params, limit, offset) as DmcaNoticeWithGame[]

  res.json({
    notices,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  })
})

// GET /api/notices/stats - Get notice statistics (admin only)
router.get('/stats', authenticateToken, (_req: Request, res: Response) => {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) as reviewing,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM dmca_notices
  `).get() as {
    total: number
    pending: number
    reviewing: number
    approved: number
    rejected: number
    completed: number
  }

  res.json(stats)
})

// GET /api/notices/:id - Get single notice (admin only)
router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params

  const notice = db.prepare(`
    SELECT n.*, g.title as game_title, g.slug as game_slug
    FROM dmca_notices n
    LEFT JOIN games g ON n.game_id = g.id
    WHERE n.id = ?
  `).get(id) as DmcaNoticeWithGame | undefined

  if (!notice) {
    res.status(404).json({ error: 'Notice not found' })
    return
  }

  res.json(notice)
})

// PUT /api/notices/:id - Update notice status/notes (admin only)
router.put('/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params
  const { status, admin_notes, public_note } = req.body

  const existing = db.prepare('SELECT id FROM dmca_notices WHERE id = ?').get(id)

  if (!existing) {
    res.status(404).json({ error: 'Notice not found' })
    return
  }

  // Validate status if provided
  const validStatuses = ['pending', 'reviewing', 'approved', 'rejected', 'completed']
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid status' })
    return
  }

  db.prepare(`
    UPDATE dmca_notices 
    SET status = COALESCE(?, status),
        admin_notes = COALESCE(?, admin_notes),
        public_note = COALESCE(?, public_note),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status || null, admin_notes !== undefined ? admin_notes : null, public_note !== undefined ? public_note : null, id)

  const updated = db.prepare(`
    SELECT n.*, g.title as game_title, g.slug as game_slug
    FROM dmca_notices n
    LEFT JOIN games g ON n.game_id = g.id
    WHERE n.id = ?
  `).get(id) as DmcaNoticeWithGame

  res.json(updated)
})

// DELETE /api/notices/:id - Delete notice (admin only)
router.delete('/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params

  const existing = db.prepare('SELECT id FROM dmca_notices WHERE id = ?').get(id)

  if (!existing) {
    res.status(404).json({ error: 'Notice not found' })
    return
  }

  db.prepare('DELETE FROM dmca_notices WHERE id = ?').run(id)

  res.json({ success: true })
})

export default router
