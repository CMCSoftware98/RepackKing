-- Migration: 004_game_ratings
-- Description: Add game ratings table for torrent quality feedback

CREATE TABLE IF NOT EXISTS game_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_game_ratings_game_id ON game_ratings(game_id);
