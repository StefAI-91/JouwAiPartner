-- Backfill created_at for Userback issues using the original creation date.
-- The Userback API returns "created" (not "created_at"), so the previous
-- backfill (20260413150000) read a null field. The actual date lives in
-- source_metadata.raw_userback.created.

UPDATE issues
SET created_at = (source_metadata->'raw_userback'->>'created')::timestamptz
WHERE source = 'userback'
  AND source_metadata->'raw_userback'->>'created' IS NOT NULL;
