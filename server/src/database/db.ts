import Database, { Database as DatabaseType } from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Use DATABASE_PATH env var for production, otherwise use local ./data/torrentgames.db for development
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/torrentgames.db')

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

console.log(`Database location: ${DB_PATH}`)

const db: DatabaseType = new Database(DB_PATH)
db.pragma('foreign_keys = ON')

export default db

// Type definitions for database models
export interface GameRow {
  id: number
  title: string
  slug: string
  description: string | null
  cover_image: string | null
  size_bytes: number
  magnet_uri: string | null
  version: string | null
  min_cpu: string | null
  min_gpu: string | null
  min_ram: string | null
  min_storage: string | null
  min_os: string | null
  rec_cpu: string | null
  rec_gpu: string | null
  rec_ram: string | null
  rec_storage: string | null
  rec_os: string | null
  created_at: string
  updated_at: string
}

export interface AnalyticsRow {
  id: number
  game_id: number
  event_type: 'view' | 'download'
  created_at: string
}

export interface AdminUserRow {
  id: number
  username: string
  password_hash: string
  created_at: string
}

export interface GameStats {
  game_id: number
  title: string
  view_count: number
  download_count: number
}

export interface GenreRow {
  id: number
  name: string
  slug: string
  created_at: string
}

export interface GameGenreRow {
  game_id: number
  genre_id: number
}

export interface GameReportRow {
  id: number
  game_id: number
  report_type: 'broken_link' | 'wrong_info' | 'malware' | 'dmca' | 'other'
  description: string | null
  email: string | null
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  created_at: string
}

export interface GameScreenshotRow {
  id: number
  game_id: number
  image_path: string
  sort_order: number
  created_at: string
}
