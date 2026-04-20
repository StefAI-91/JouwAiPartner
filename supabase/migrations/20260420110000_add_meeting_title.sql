-- Add meeting_title column for the gatekeeper's structural title.
--
-- Format: [Label] [Org] [External] ↔ [Internal]
-- Produced by the Gatekeeper agent during meeting classification.
-- Replaces the legacy title-generator agent which wrote free-form
-- subjects to the existing `title` column.
--
-- Column layout after this migration:
--   original_title  — Fireflies title (immutable, audit)
--   title           — Fireflies title (default) or legacy AI subject
--   meeting_title   — Gatekeeper structural title (new)
ALTER TABLE meetings ADD COLUMN meeting_title TEXT;

-- No backfill: existing rows keep meeting_title NULL until they are
-- reprocessed through the gatekeeper. UI should fall back to `title`
-- when meeting_title IS NULL.
COMMENT ON COLUMN meetings.meeting_title IS
  'Structural title from gatekeeper: [Label] [Org] [External] ↔ [Internal]';
