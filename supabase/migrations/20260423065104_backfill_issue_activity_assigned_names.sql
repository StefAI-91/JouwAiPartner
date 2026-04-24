-- Backfill issue_activity rows where action = 'assigned' stored the raw uuid
-- in old_value/new_value. New writes (see apps/devhub/src/actions/issues.ts)
-- resolve to profiles.full_name (fallback email) before insert; this migration
-- fixes historical rows so the activity feed no longer surfaces raw uuids.
--
-- Strategy: join via a uuid cast, prefer full_name, fall back to email. Rows
-- whose referenced profile no longer exists are rewritten to "Onbekende
-- gebruiker" — the raw uuid stays available in metadata for audit.

UPDATE issue_activity AS a
SET
  old_value = COALESCE(NULLIF(TRIM(p.full_name), ''), p.email, 'Onbekende gebruiker'),
  metadata = COALESCE(a.metadata, '{}'::jsonb) || jsonb_build_object('assigned_from_id', a.old_value)
FROM profiles AS p
WHERE a.action = 'assigned'
  AND a.old_value IS NOT NULL
  AND a.old_value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND p.id::text = a.old_value;

UPDATE issue_activity AS a
SET
  new_value = COALESCE(NULLIF(TRIM(p.full_name), ''), p.email, 'Onbekende gebruiker'),
  metadata = COALESCE(a.metadata, '{}'::jsonb) || jsonb_build_object('assigned_to_id', a.new_value)
FROM profiles AS p
WHERE a.action = 'assigned'
  AND a.new_value IS NOT NULL
  AND a.new_value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND p.id::text = a.new_value;

-- Orphan uuids (profile deleted or never existed) -> replace with placeholder,
-- but keep the raw id in metadata so the trail isn't lost.
UPDATE issue_activity
SET
  old_value = 'Onbekende gebruiker',
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('assigned_from_id', old_value)
WHERE action = 'assigned'
  AND old_value IS NOT NULL
  AND old_value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE issue_activity
SET
  new_value = 'Onbekende gebruiker',
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('assigned_to_id', new_value)
WHERE action = 'assigned'
  AND new_value IS NOT NULL
  AND new_value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
