-- Migration: 008_public_notes
-- Description: Add public_note field for user-visible admin responses on status page

-- Add public_note to dmca_notices (visible to user on status page)
ALTER TABLE dmca_notices ADD COLUMN public_note TEXT;

-- Add public_note to game_reports (visible to user on status page)
ALTER TABLE game_reports ADD COLUMN public_note TEXT;
