-- DH-017: Fine-grained RLS policies for DevHub project access
-- SEC-170..177, PERF-150, EDGE-160
--
-- Replaces the permissive `USING (true)` policies from 20260409100003 with
-- policies that join against `devhub_project_access` / `profiles.role`.
-- Members see only projects they have access to; admins see everything.
--
-- Pattern: helper functions `is_admin(uuid)` and `has_project_access(uuid, uuid)`
-- are `STABLE SECURITY DEFINER` so Postgres can cache evaluation per row and
-- RLS doesn't recurse via `profiles` / `devhub_project_access` policies.
--
-- Dev bypass: the sentinel UUID `00000000-0000-0000-0000-000000000000` is
-- treated as admin by the helper so local dev (see `packages/auth/helpers.ts`)
-- keeps working without mirroring the env check into SQL.

-- =============================================================================
-- Helpers (SECURITY DEFINER bypasses RLS on profiles / devhub_project_access)
-- =============================================================================

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    user_id = '00000000-0000-0000-0000-000000000000'::uuid
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = user_id AND role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION has_project_access(user_id UUID, pid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_admin(user_id) OR EXISTS (
    SELECT 1 FROM devhub_project_access
    WHERE profile_id = user_id AND project_id = pid
  );
$$;

-- Lock down execute: authenticated users only (anon has no business calling these)
REVOKE ALL ON FUNCTION is_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION has_project_access(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_project_access(UUID, UUID) TO authenticated;

-- =============================================================================
-- Issues
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can read all issues" ON issues;
DROP POLICY IF EXISTS "Authenticated users can insert issues" ON issues;
DROP POLICY IF EXISTS "Authenticated users can update issues" ON issues;
DROP POLICY IF EXISTS "Members see accessible issues, admins see all" ON issues;
DROP POLICY IF EXISTS "Members insert in accessible projects, admins all" ON issues;
DROP POLICY IF EXISTS "Members update accessible issues, admins all" ON issues;

CREATE POLICY "Members see accessible issues, admins see all"
  ON issues FOR SELECT TO authenticated
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Members insert in accessible projects, admins all"
  ON issues FOR INSERT TO authenticated
  WITH CHECK (has_project_access(auth.uid(), project_id));

-- SEC-172: guard both OLD and NEW project_id so a row cannot be "moved" into
-- a project the caller has no access to. `USING` covers OLD, `WITH CHECK` covers NEW.
CREATE POLICY "Members update accessible issues, admins all"
  ON issues FOR UPDATE TO authenticated
  USING (has_project_access(auth.uid(), project_id))
  WITH CHECK (has_project_access(auth.uid(), project_id));

-- =============================================================================
-- Issue comments
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can read all issue_comments" ON issue_comments;
DROP POLICY IF EXISTS "Authenticated users can insert issue_comments" ON issue_comments;
DROP POLICY IF EXISTS "Authors can update their own issue_comments" ON issue_comments;
DROP POLICY IF EXISTS "Comments visible via issue access" ON issue_comments;
DROP POLICY IF EXISTS "Insert comments on accessible issues" ON issue_comments;
DROP POLICY IF EXISTS "Authors update own comments on accessible issues" ON issue_comments;

CREATE POLICY "Comments visible via issue access"
  ON issue_comments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM issues i
    WHERE i.id = issue_comments.issue_id
      AND has_project_access(auth.uid(), i.project_id)
  ));

CREATE POLICY "Insert comments on accessible issues"
  ON issue_comments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM issues i
    WHERE i.id = issue_comments.issue_id
      AND has_project_access(auth.uid(), i.project_id)
  ));

-- Author-only UPDATE, but only on accessible issues.
CREATE POLICY "Authors update own comments on accessible issues"
  ON issue_comments FOR UPDATE TO authenticated
  USING (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM issues i
      WHERE i.id = issue_comments.issue_id
        AND has_project_access(auth.uid(), i.project_id)
    )
  )
  WITH CHECK (auth.uid() = author_id);

-- =============================================================================
-- Issue activity
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can read all issue_activity" ON issue_activity;
DROP POLICY IF EXISTS "Authenticated users can insert issue_activity" ON issue_activity;
DROP POLICY IF EXISTS "Activity visible via issue access" ON issue_activity;
DROP POLICY IF EXISTS "Insert activity on accessible issues" ON issue_activity;

CREATE POLICY "Activity visible via issue access"
  ON issue_activity FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM issues i
    WHERE i.id = issue_activity.issue_id
      AND has_project_access(auth.uid(), i.project_id)
  ));

CREATE POLICY "Insert activity on accessible issues"
  ON issue_activity FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM issues i
    WHERE i.id = issue_activity.issue_id
      AND has_project_access(auth.uid(), i.project_id)
  ));

-- =============================================================================
-- devhub_project_access
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can read all devhub_project_access" ON devhub_project_access;
DROP POLICY IF EXISTS "Authenticated users can manage devhub_project_access" ON devhub_project_access;
DROP POLICY IF EXISTS "Members read own access, admins read all" ON devhub_project_access;
DROP POLICY IF EXISTS "Only admins can write devhub_project_access" ON devhub_project_access;

CREATE POLICY "Members read own access, admins read all"
  ON devhub_project_access FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR profile_id = auth.uid());

CREATE POLICY "Only admins can write devhub_project_access"
  ON devhub_project_access FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- =============================================================================
-- issue_number_seq (administrative; stays permissive for authenticated)
-- =============================================================================
-- Contains only one row per project with a counter; no user data leaks via
-- reading it. Write-access is needed by the `next_issue_number()` RPC which
-- every authenticated user may call (via issue-insert paths). Intentionally
-- left as-is from 20260409100003.
