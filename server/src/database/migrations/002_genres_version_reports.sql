-- Migration: 002_genres_version_reports
-- Description: Add genres, version field, recommended requirements, and game reports

-- Add version and recommended requirements to games table
ALTER TABLE games ADD COLUMN version TEXT;
ALTER TABLE games ADD COLUMN rec_cpu TEXT;
ALTER TABLE games ADD COLUMN rec_gpu TEXT;
ALTER TABLE games ADD COLUMN rec_ram TEXT;
ALTER TABLE games ADD COLUMN rec_storage TEXT;
ALTER TABLE games ADD COLUMN rec_os TEXT;

-- Genres table
CREATE TABLE IF NOT EXISTS genres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Game-Genre junction table (many-to-many)
CREATE TABLE IF NOT EXISTS game_genres (
    game_id INTEGER NOT NULL,
    genre_id INTEGER NOT NULL,
    PRIMARY KEY (game_id, genre_id),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
);

-- Game reports table
CREATE TABLE IF NOT EXISTS game_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    report_type TEXT NOT NULL CHECK(report_type IN ('broken_link', 'wrong_info', 'malware', 'dmca', 'other')),
    description TEXT,
    email TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_genres_slug ON genres(slug);
CREATE INDEX IF NOT EXISTS idx_game_genres_game_id ON game_genres(game_id);
CREATE INDEX IF NOT EXISTS idx_game_genres_genre_id ON game_genres(genre_id);
CREATE INDEX IF NOT EXISTS idx_game_reports_game_id ON game_reports(game_id);
CREATE INDEX IF NOT EXISTS idx_game_reports_status ON game_reports(status);
