import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, '../../data/repackking.db')
const MIGRATIONS_DIR = path.join(__dirname, 'migrations')

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = new Database(DB_PATH)

// Enable foreign keys
db.pragma('foreign_keys = ON')

function getAppliedMigrations(): Set<string> {
  try {
    const rows = db.prepare('SELECT name FROM migrations').all() as { name: string }[]
    return new Set(rows.map(r => r.name))
  } catch {
    // migrations table doesn't exist yet
    return new Set()
  }
}

function runMigrations() {
  console.log('Running database migrations...')
  
  const appliedMigrations = getAppliedMigrations()
  
  // Get all .sql files in migrations directory
  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()
  
  for (const file of migrationFiles) {
    const migrationName = file.replace('.sql', '')
    
    if (appliedMigrations.has(migrationName)) {
      console.log(`  Skipping ${migrationName} (already applied)`)
      continue
    }
    
    console.log(`  Applying ${migrationName}...`)
    
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8')
    
    // Execute migration in a transaction
    db.exec('BEGIN TRANSACTION')
    try {
      db.exec(sql)
      
      // Record migration (create table if needed first time)
      db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationName)
      db.exec('COMMIT')
      console.log(`  Applied ${migrationName} successfully`)
    } catch (error) {
      db.exec('ROLLBACK')
      console.error(`  Failed to apply ${migrationName}:`, error)
      throw error
    }
  }
  
  console.log('Migrations complete!')
}

function seedAdminUser() {
  console.log('Checking for admin user...')
  
  const existingAdmin = db.prepare('SELECT id FROM admin_users WHERE username = ?').get('Admin')
  
  if (!existingAdmin) {
    console.log('  Creating default admin user...')
    const passwordHash = bcrypt.hashSync('Admin', 10)
    db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run('Admin', passwordHash)
    console.log('  Admin user created (username: Admin, password: Admin)')
  } else {
    console.log('  Admin user already exists')
  }
}

// Run migrations and seed
runMigrations()
seedAdminUser()

db.close()
console.log('Database setup complete!')
