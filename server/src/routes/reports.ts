import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

interface GameReportRow {
  id: number
  game_id: number
  tracking_id: string | null
  game_title?: string
  game_slug?: string
  report_type: 'broken_link' | 'wrong_info' | 'malware' | 'other'
  description: string | null
  email: string | null
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  admin_notes: string | null
  public_note: string | null
  created_at: string
  updated_at: string
}

// POST /api/reports - Submit a game report (public)
router.post('/', (req: Request, res: Response) => {
  const { game_id, report_type, description, email } = req.body

  // All fields required
  if (!game_id || !report_type || !description || !email) {
    res.status(400).json({ error: 'All fields are required: game_id, report_type, description, and email' })
    return
  }

  const validTypes = ['broken_link', 'wrong_info', 'malware', 'other']
  if (!validTypes.includes(report_type)) {
    res.status(400).json({ error: 'Invalid report_type. Must be one of: ' + validTypes.join(', ') })
    return
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: 'Invalid email format' })
    return
  }

  // Check if game exists
  const game = db.prepare('SELECT id, title FROM games WHERE id = ?').get(game_id) as { id: number; title: string } | undefined
  if (!game) {
    res.status(404).json({ error: 'Game not found' })
    return
  }

  const tracking_id = randomUUID()

  const result = db.prepare(`
    INSERT INTO game_reports (game_id, tracking_id, report_type, description, email)
    VALUES (?, ?, ?, ?, ?)
  `).run(game_id, tracking_id, report_type, description, email)

  res.status(201).json({
    success: true,
    id: result.lastInsertRowid,
    tracking_id,
    message: 'Report submitted successfully. We will review your report within 24-48 hours.'
  })
})

// GET /api/reports/track/:trackingId - Public status lookup by tracking ID
router.get('/track/:trackingId', (req: Request, res: Response) => {
  const { trackingId } = req.params

  const report = db.prepare(`
    SELECT tracking_id, status, public_note, created_at, updated_at
    FROM game_reports
    WHERE tracking_id = ?
  `).get(trackingId) as { tracking_id: string; status: string; public_note: string | null; created_at: string; updated_at: string } | undefined

  if (!report) {
    res.status(404).json({ error: 'Report not found. Please check your tracking ID.' })
    return
  }

  res.json({
    type: 'report',
    tracking_id: report.tracking_id,
    status: report.status,
    public_note: report.public_note,
    submitted_at: report.created_at,
    updated_at: report.updated_at
  })
})

// GET /api/reports - List all reports (admin only)
router.get('/', authenticateToken, (req: Request, res: Response) => {
  const status = req.query.status as string
  const includeResolved = req.query.includeResolved === 'true'
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
  const offset = (page - 1) * limit

  let countQuery = 'SELECT COUNT(*) as total FROM game_reports'
  let dataQuery = `
    SELECT gr.*, g.title as game_title, g.slug as game_slug
    FROM game_reports gr
    JOIN games g ON gr.game_id = g.id
  `
  const params: (string | number)[] = []
  const conditions: string[] = []

  if (status) {
    conditions.push('gr.status = ?')
    params.push(status)
  } else if (!includeResolved) {
    // By default, hide resolved/dismissed items unless specifically filtered or includeResolved=true
    conditions.push("gr.status NOT IN ('resolved', 'dismissed')")
  }

  if (conditions.length > 0) {
    const whereClause = ' WHERE ' + conditions.join(' AND ')
    countQuery += whereClause.replace(/gr\./g, '')
    dataQuery += whereClause
  }

  dataQuery += ' ORDER BY gr.created_at DESC LIMIT ? OFFSET ?'

  const countResult = db.prepare(countQuery).get(...params) as { total: number }
  const total = countResult.total

  const reports = db.prepare(dataQuery).all(...params, limit, offset) as GameReportRow[]

  res.json({
    reports,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  })
})

// GET /api/reports/stats - Get report statistics (admin only)
router.get('/stats', authenticateToken, (_req: Request, res: Response) => {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) as reviewed,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN status = 'dismissed' THEN 1 ELSE 0 END) as dismissed
    FROM game_reports
  `).get() as {
    total: number
    pending: number
    reviewed: number
    resolved: number
    dismissed: number
  }

  res.json(stats)
})

// GET /api/reports/:id - Get single report (admin only)
router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params

  const report = db.prepare(`
    SELECT gr.*, g.title as game_title, g.slug as game_slug
    FROM game_reports gr
    JOIN games g ON gr.game_id = g.id
    WHERE gr.id = ?
  `).get(id) as GameReportRow | undefined

  if (!report) {
    res.status(404).json({ error: 'Report not found' })
    return
  }

  res.json(report)
})

// PUT /api/reports/:id - Update report status/notes (admin only)
router.put('/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params
  const { status, admin_notes, public_note } = req.body

  const existing = db.prepare('SELECT id FROM game_reports WHERE id = ?').get(id)
  if (!existing) {
    res.status(404).json({ error: 'Report not found' })
    return
  }

  const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed']
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') })
    return
  }

  db.prepare(`
    UPDATE game_reports 
    SET status = COALESCE(?, status),
        admin_notes = COALESCE(?, admin_notes),
        public_note = COALESCE(?, public_note),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status || null, admin_notes !== undefined ? admin_notes : null, public_note !== undefined ? public_note : null, id)

  const report = db.prepare(`
    SELECT gr.*, g.title as game_title, g.slug as game_slug
    FROM game_reports gr
    JOIN games g ON gr.game_id = g.id
    WHERE gr.id = ?
  `).get(id) as GameReportRow

  res.json(report)
})

// DELETE /api/reports/:id - Delete a report (admin only)
router.delete('/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params

  const existing = db.prepare('SELECT id FROM game_reports WHERE id = ?').get(id)
  if (!existing) {
    res.status(404).json({ error: 'Report not found' })
    return
  }

  db.prepare('DELETE FROM game_reports WHERE id = ?').run(id)

  res.json({ success: true })
})

export default router
