-- Quality follow-up CP-005: cleanup type-value drift and tighten the CHECK.
--
-- 20260418100000 widened `chk_issues_type` to accept the union of the old DB
-- values (feature, improvement, task) and the app-level ISSUE_TYPES constant
-- (feature_request). That was intentional to prevent any existing row from
-- blocking the migration, but it left the type column with multiple ways to
-- express the same thing.
--
-- Now: migrate any legacy values to the app-level set (matching
-- `packages/database/src/constants/issues.ts`) and re-tighten the CHECK.
--   feature      → feature_request
--   improvement  → feature_request (non-bug enhancement)
--   task         → feature_request (closest equivalent in client-facing types)

UPDATE issues SET type = 'feature_request' WHERE type IN ('feature', 'improvement', 'task');

ALTER TABLE issues DROP CONSTRAINT IF EXISTS chk_issues_type;

ALTER TABLE issues ADD CONSTRAINT chk_issues_type
  CHECK (type IN ('bug', 'feature_request', 'question'));
