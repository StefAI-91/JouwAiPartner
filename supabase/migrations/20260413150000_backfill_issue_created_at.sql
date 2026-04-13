-- Backfill created_at for Userback issues using the original creation date.
-- The Userback API returns "created" (not "created_at"), so the original date
-- is stored in source_metadata.raw_userback.created. The old code read the
-- wrong field name, so userback_created_at in source_metadata was null.

UPDATE issues
SET created_at = (source_metadata->'raw_userback'->>'created')::timestamptz
WHERE source = 'userback'
  AND source_metadata->'raw_userback'->>'created' IS NOT NULL;
