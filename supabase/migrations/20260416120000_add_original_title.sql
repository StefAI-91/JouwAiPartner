-- Add original_title column to preserve Fireflies titles after AI title generation
ALTER TABLE meetings ADD COLUMN original_title TEXT;

-- Backfill: existing meetings get their current title as original_title
UPDATE meetings SET original_title = title WHERE original_title IS NULL;
