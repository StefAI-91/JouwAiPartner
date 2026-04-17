-- CP-001: Portal MVP — RLS policies for client users
-- RLS-P01..P06
--
-- Scopes client (portal) users to projects they have explicit access to via
-- `portal_project_access`, and to verified content only. Admin/member users
-- retain unchanged behavior — the rewritten policies evaluate to the same
-- `USING (true)` result for them.
--
-- Pattern: helpers `is_client(uuid)` and `has_portal_access(uuid, uuid)` are
-- `STABLE SECURITY DEFINER` so Postgres can cache evaluation per row and
-- recursion via `profiles` / `portal_project_access` policies is avoided.
--
-- Dev bypass: `has_portal_access` defers to `is_admin` (already in scope from
-- 20260413120000_rls_project_access.sql), which treats the sentinel UUID
-- `00000000-0000-0000-0000-000000000000` as admin so local dev keeps working.

-- =============================================================================
-- Helpers (SECURITY DEFINER bypasses RLS on profiles / portal_project_access)
-- =============================================================================

CREATE OR REPLACE FUNCTION is_client(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role = 'client'
  );
$$;

CREATE OR REPLACE FUNCTION has_portal_access(user_id UUID, pid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_admin(user_id) OR EXISTS (
    SELECT 1 FROM portal_project_access
    WHERE profile_id = user_id AND project_id = pid
  );
$$;

REVOKE ALL ON FUNCTION is_client(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION has_portal_access(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_client(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_portal_access(UUID, UUID) TO authenticated;

-- =============================================================================
-- RLS-P01: Projects — clients see only projects via portal_project_access
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can read all projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can manage projects" ON projects;

CREATE POLICY "Projects: select (clients via portal access)"
  ON projects FOR SELECT TO authenticated
  USING (
    NOT is_client(auth.uid())
    OR has_portal_access(auth.uid(), id)
  );

CREATE POLICY "Projects: insert (admin/member only)"
  ON projects FOR INSERT TO authenticated
  WITH CHECK (NOT is_client(auth.uid()));

CREATE POLICY "Projects: update (admin/member only)"
  ON projects FOR UPDATE TO authenticated
  USING (NOT is_client(auth.uid()))
  WITH CHECK (NOT is_client(auth.uid()));

CREATE POLICY "Projects: delete (admin/member only)"
  ON projects FOR DELETE TO authenticated
  USING (NOT is_client(auth.uid()));

-- =============================================================================
-- RLS-P02/P03: Meetings — clients see only verified meetings on their projects
-- Transcript column is hidden at the query layer (no RLS column-level rewrite).
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can read all meetings" ON meetings;
DROP POLICY IF EXISTS "Authenticated users can manage meetings" ON meetings;

CREATE POLICY "Meetings: select (clients: verified + portal projects)"
  ON meetings FOR SELECT TO authenticated
  USING (
    NOT is_client(auth.uid())
    OR (
      verification_status = 'verified'
      AND EXISTS (
        SELECT 1 FROM meeting_projects mp
        WHERE mp.meeting_id = meetings.id
          AND has_portal_access(auth.uid(), mp.project_id)
      )
    )
  );

CREATE POLICY "Meetings: insert (admin/member only)"
  ON meetings FOR INSERT TO authenticated
  WITH CHECK (NOT is_client(auth.uid()));

CREATE POLICY "Meetings: update (admin/member only)"
  ON meetings FOR UPDATE TO authenticated
  USING (NOT is_client(auth.uid()))
  WITH CHECK (NOT is_client(auth.uid()));

CREATE POLICY "Meetings: delete (admin/member only)"
  ON meetings FOR DELETE TO authenticated
  USING (NOT is_client(auth.uid()));

-- =============================================================================
-- RLS-P02: Extractions — clients see only verified extractions on their projects
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can read all extractions" ON extractions;
DROP POLICY IF EXISTS "Authenticated users can manage extractions" ON extractions;

CREATE POLICY "Extractions: select (clients: verified + portal projects)"
  ON extractions FOR SELECT TO authenticated
  USING (
    NOT is_client(auth.uid())
    OR (
      verification_status = 'verified'
      AND project_id IS NOT NULL
      AND has_portal_access(auth.uid(), project_id)
    )
  );

CREATE POLICY "Extractions: insert (admin/member only)"
  ON extractions FOR INSERT TO authenticated
  WITH CHECK (NOT is_client(auth.uid()));

CREATE POLICY "Extractions: update (admin/member only)"
  ON extractions FOR UPDATE TO authenticated
  USING (NOT is_client(auth.uid()))
  WITH CHECK (NOT is_client(auth.uid()));

CREATE POLICY "Extractions: delete (admin/member only)"
  ON extractions FOR DELETE TO authenticated
  USING (NOT is_client(auth.uid()));

-- =============================================================================
-- Summaries — clients see only summaries for projects they have portal access to
-- Summaries have entity_type/entity_id; clients only get entity_type='project'.
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can read all summaries" ON summaries;
DROP POLICY IF EXISTS "Authenticated users can manage summaries" ON summaries;

CREATE POLICY "Summaries: select (clients: their project summaries)"
  ON summaries FOR SELECT TO authenticated
  USING (
    NOT is_client(auth.uid())
    OR (
      entity_type = 'project'
      AND has_portal_access(auth.uid(), entity_id)
    )
  );

CREATE POLICY "Summaries: insert (admin/member only)"
  ON summaries FOR INSERT TO authenticated
  WITH CHECK (NOT is_client(auth.uid()));

CREATE POLICY "Summaries: update (admin/member only)"
  ON summaries FOR UPDATE TO authenticated
  USING (NOT is_client(auth.uid()))
  WITH CHECK (NOT is_client(auth.uid()));

CREATE POLICY "Summaries: delete (admin/member only)"
  ON summaries FOR DELETE TO authenticated
  USING (NOT is_client(auth.uid()));

-- =============================================================================
-- RLS-P04: Issues — clients get read-only access via portal_project_access.
-- Existing member/admin policies stay intact (they rely on has_project_access
-- which is false for clients). We add a client-only SELECT policy — policies
-- are OR'ed, so this is purely additive for clients.
-- =============================================================================

CREATE POLICY "Issues: clients see issues in portal projects"
  ON issues FOR SELECT TO authenticated
  USING (
    is_client(auth.uid())
    AND has_portal_access(auth.uid(), project_id)
  );

-- =============================================================================
-- portal_project_access — only admins manage; clients read own rows
-- =============================================================================

CREATE POLICY "Portal access: clients read own, admins read all"
  ON portal_project_access FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR profile_id = auth.uid());

CREATE POLICY "Portal access: only admins can write"
  ON portal_project_access FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
