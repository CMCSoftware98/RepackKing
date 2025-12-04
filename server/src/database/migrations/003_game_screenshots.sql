-- Migration: 003_game_screenshots
-- Description: Add game screenshots table

CREATE TABLE IF NOT EXISTS game_screenshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_game_screenshots_game_id ON game_screenshots(game_id);
