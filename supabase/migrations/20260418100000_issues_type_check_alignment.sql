-- CP-005: align chk_issues_type with app-level ISSUE_TYPES
--
-- The original chk_issues_type (migration 20260409100005) accepted
-- ('bug', 'feature', 'improvement', 'task', 'question') but the codebase's
-- ISSUE_TYPES constant + Zod validations use 'feature_request' instead of
-- 'feature'. That mismatch silently blocked any non-Userback insert with
-- 'feature_request'. Portal feedback submissions (CP-005) need this value.
--
-- We widen the CHECK to accept the union of both sets so existing rows stay
-- valid and the app can use 'feature_request' going forward. No data is
-- rewritten.

ALTER TABLE issues DROP CONSTRAINT IF EXISTS chk_issues_type;

ALTER TABLE issues ADD CONSTRAINT chk_issues_type
  CHECK (type IN ('bug', 'feature', 'feature_request', 'improvement', 'task', 'question'));
