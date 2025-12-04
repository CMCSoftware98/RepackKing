import { Router, Response } from 'express'
import db from '../database/db.js'
import { authenticateToken, AuthRequest } from '../middleware/auth.js'

const router = Router()

interface GameStatRow {
  game_id: number
  title: string
  view_count: number
  download_count: number
}

interface RecentActivityRow {
  id: number
  game_id: number
  game_title: string
  event_type: string
  created_at: string
}

interface TopGameRow {
  game_id: number
  title: string
  count: number
}

interface DailyStatsRow {
  date: string
  views: number
  downloads: number
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

// GET /api/analytics/public - Get public stats for homepage (no auth required)
router.get('/public', (_req: AuthRequest, res: Response) => {
  // Total games count
  const totalGames = (db.prepare('SELECT COUNT(*) as count FROM games').get() as { count: number }).count
  
  // Total genres count
  const totalGenres = (db.prepare('SELECT COUNT(*) as count FROM genres').get() as { count: number }).count
  
  // Total downloads
  const totalDownloads = (db.prepare("SELECT COUNT(*) as count FROM analytics WHERE event_type = 'download'").get() as { count: number }).count

  res.json({
    totalGames,
    totalGenres,
    totalDownloads
  })
})

// GET /api/analytics/stats - Get dashboard stats (admin only)
router.get('/stats', authenticateToken, (req: AuthRequest, res: Response) => {
  const period = (req.query.period as string) || 'all'
  const timeFilter = getTimeFilter(period)

  // Overall stats
  const totalGames = (db.prepare('SELECT COUNT(*) as count FROM games').get() as { count: number }).count
  const totalViews = (db.prepare("SELECT COUNT(*) as count FROM analytics WHERE event_type = 'view'").get() as { count: number }).count
  const totalDownloads = (db.prepare("SELECT COUNT(*) as count FROM analytics WHERE event_type = 'download'").get() as { count: number }).count

  // Stats per game
  const gameStats = db.prepare(`
    SELECT 
      g.id as game_id,
      g.title,
      COALESCE(SUM(CASE WHEN a.event_type = 'view' THEN 1 ELSE 0 END), 0) as view_count,
      COALESCE(SUM(CASE WHEN a.event_type = 'download' THEN 1 ELSE 0 END), 0) as download_count
    FROM games g
    LEFT JOIN analytics a ON g.id = a.game_id
    GROUP BY g.id
    ORDER BY view_count DESC
  `).all() as GameStatRow[]

  // Recent activity (last 50 events)
  const recentActivity = db.prepare(`
    SELECT 
      a.id,
      a.game_id,
      g.title as game_title,
      a.event_type,
      a.created_at
    FROM analytics a
    JOIN games g ON a.game_id = g.id
    ORDER BY a.created_at DESC
    LIMIT 50
  `).all() as RecentActivityRow[]

  // Top games by views (with time filter)
  const topByViews = db.prepare(`
    SELECT 
      g.id as game_id,
      g.title,
      COUNT(*) as count
    FROM analytics a
    JOIN games g ON a.game_id = g.id
    WHERE a.event_type = 'view' ${timeFilter}
    GROUP BY g.id
    ORDER BY count DESC
    LIMIT 10
  `).all() as TopGameRow[]

  // Top games by downloads (with time filter)
  const topByDownloads = db.prepare(`
    SELECT 
      g.id as game_id,
      g.title,
      COUNT(*) as count
    FROM analytics a
    JOIN games g ON a.game_id = g.id
    WHERE a.event_type = 'download' ${timeFilter}
    GROUP BY g.id
    ORDER BY count DESC
    LIMIT 10
  `).all() as TopGameRow[]

  // Daily stats for charts (last 30 days)
  const dailyStats = db.prepare(`
    SELECT 
      DATE(created_at) as date,
      SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END) as views,
      SUM(CASE WHEN event_type = 'download' THEN 1 ELSE 0 END) as downloads
    FROM analytics
    WHERE created_at >= datetime('now', '-30 days')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all() as DailyStatsRow[]

  // Fill in missing dates with zeros
  const filledDailyStats: DailyStatsRow[] = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const existing = dailyStats.find(d => d.date === dateStr)
    filledDailyStats.push({
      date: dateStr,
      views: existing ? existing.views : 0,
      downloads: existing ? existing.downloads : 0
    })
  }

  res.json({
    overview: {
      totalGames,
      totalViews,
      totalDownloads
    },
    gameStats,
    recentActivity,
    dailyStats: filledDailyStats,
    topByViews,
    topByDownloads
  })
})

export default router
