-- Migration: 006_reports_admin_notes
-- Description: Add admin_notes and updated_at to game_reports table

ALTER TABLE game_reports ADD COLUMN admin_notes TEXT;
ALTER TABLE game_reports ADD COLUMN updated_at DATETIME;

-- Update existing rows to have a value for updated_at
UPDATE game_reports SET updated_at = created_at WHERE updated_at IS NULL;

-- Create trigger to automatically update updated_at on row updates
CREATE TRIGGER IF NOT EXISTS update_game_reports_updated_at
AFTER UPDATE ON game_reports
FOR EACH ROW
BEGIN
    UPDATE game_reports SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
