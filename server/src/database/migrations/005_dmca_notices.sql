-- Migration: 005_dmca_notices
-- Description: Add DMCA notices table for copyright takedown requests

CREATE TABLE IF NOT EXISTS dmca_notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER,
    content_name TEXT NOT NULL,
    content_url TEXT,
    company_name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewing', 'approved', 'rejected', 'completed')),
    admin_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_dmca_notices_status ON dmca_notices(status);
CREATE INDEX IF NOT EXISTS idx_dmca_notices_game_id ON dmca_notices(game_id);
CREATE INDEX IF NOT EXISTS idx_dmca_notices_created_at ON dmca_notices(created_at);
