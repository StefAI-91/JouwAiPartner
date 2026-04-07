-- Add organizer_email column to meetings table
-- Captures which Fireflies user/calendar organizer created the meeting
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS organizer_email TEXT;

-- Index for lookups by organizer
CREATE INDEX IF NOT EXISTS idx_meetings_organizer_email ON meetings (organizer_email)
  WHERE organizer_email IS NOT NULL;
