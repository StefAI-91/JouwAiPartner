-- CC-006-fix: split insert policy in twee + SECURITY DEFINER helper
--
-- De gecombineerde CASE-policy uit 20260503100000 leverde
-- "infinite recursion detected in policy for relation client_questions" op
-- omdat Postgres de hele CASE plant, ook de ELSE-tak met
-- `EXISTS (SELECT FROM client_questions p ...)`. Die self-reference triggert
-- de recursie-detector zelfs bij een team-INSERT die de root-tak neemt.
--
-- Fix:
--   1. Een SECURITY DEFINER helper `client_question_reply_visible(uid, parent_id)`
--      die de parent-zichtbaarheid checkt zonder RLS te triggeren.
--   2. Twee aparte INSERT policies — één voor root (parent_id IS NULL),
--      één voor reply (parent_id IS NOT NULL). Postgres OR't policies van
--      hetzelfde commando, dus elke INSERT moet aan minstens één voldoen.
--   3. Geen CASE meer, dus geen self-reference-pad voor root-inserts.

-- =============================================================================
-- Helper — bypasst RLS via SECURITY DEFINER
-- =============================================================================

CREATE OR REPLACE FUNCTION client_question_reply_visible(user_id UUID, parent UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM client_questions p
    WHERE p.id = parent
      AND has_portal_access(user_id, p.project_id)
      AND p.organization_id = (
        SELECT organization_id FROM profiles WHERE id = user_id
      )
  );
$$;

REVOKE ALL ON FUNCTION client_question_reply_visible(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION client_question_reply_visible(UUID, UUID) TO authenticated;

-- =============================================================================
-- INSERT policies — splits root vs reply
-- =============================================================================

DROP POLICY IF EXISTS "Client questions: insert (root + reply role-aware)" ON client_questions;
DROP POLICY IF EXISTS "Client questions: insert (root team / reply role-aware)" ON client_questions;
DROP POLICY IF EXISTS "Client questions: insert root" ON client_questions;
DROP POLICY IF EXISTS "Client questions: insert reply" ON client_questions;

-- Root: team altijd, klant alleen op eigen project + matching organization.
CREATE POLICY "Client questions: insert root"
  ON client_questions FOR INSERT TO authenticated
  WITH CHECK (
    parent_id IS NULL
    AND (
      NOT is_client(auth.uid())
      OR (
        has_portal_access(auth.uid(), project_id)
        AND organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
      )
    )
  );

-- Reply: team altijd, klant alleen als parent zichtbaar is (via helper).
CREATE POLICY "Client questions: insert reply"
  ON client_questions FOR INSERT TO authenticated
  WITH CHECK (
    parent_id IS NOT NULL
    AND (
      NOT is_client(auth.uid())
      OR client_question_reply_visible(auth.uid(), parent_id)
    )
  );
