-- Add tracking_id to dmca_notices for public status lookup
ALTER TABLE dmca_notices ADD COLUMN tracking_id TEXT;

-- Add tracking_id to game_reports for public status lookup
ALTER TABLE game_reports ADD COLUMN tracking_id TEXT;

-- Create unique indexes for fast lookup (enforces uniqueness)
CREATE UNIQUE INDEX idx_dmca_notices_tracking_id ON dmca_notices(tracking_id);
CREATE UNIQUE INDEX idx_game_reports_tracking_id ON game_reports(tracking_id);
