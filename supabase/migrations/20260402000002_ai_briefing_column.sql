-- Add ai_briefing column to meetings table
-- Short narrative summary (3-5 sentences) for dashboard carousel
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS ai_briefing TEXT;

-- Index for dashboard query: verified meetings with briefing, ordered by date
CREATE INDEX IF NOT EXISTS idx_meetings_verified_briefing
  ON meetings (verification_status, date DESC)
  WHERE ai_briefing IS NOT NULL;
