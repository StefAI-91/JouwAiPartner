-- Quality follow-up CP-001..CP-005: tighten RLS on DevHub-owned tables so
-- portal clients can only (a) SELECT issues on projects they have access to,
-- (b) INSERT portal feedback (source='portal', status='triage'), and (c) never
-- touch comments, activity, attachments or any other tenant's issues.
--
-- Background: the DH-001 RLS migration made issues/issue_comments/issue_activity
-- permissive (`USING (true)`). CP-001 added an additive SELECT policy for
-- clients but left the permissive legacy policies in place — so in principle
-- a client could UPDATE any issue or READ any comment via direct API calls.
-- This migration replaces the permissive policies with role-aware ones.

-- =============================================================================
-- Issues: split per role — clients get scoped SELECT + narrow INSERT only.
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can read all issues" ON issues;
DROP POLICY IF EXISTS "Authenticated users can insert issues" ON issues;
DROP POLICY IF EXISTS "Authenticated users can update issues" ON issues;
DROP POLICY IF EXISTS "Authenticated users can delete issues" ON issues;
DROP POLICY IF EXISTS "Issues: clients see issues in portal projects" ON issues;

CREATE POLICY "Issues: select (role-aware)"
  ON issues FOR SELECT TO authenticated
  USING (
    NOT is_client(auth.uid())
    OR has_portal_access(auth.uid(), project_id)
  );

-- Clients may only create portal feedback: must target a project they have
-- access to, must carry source='portal' and start in triage. Admin/member
-- retain unrestricted insert (devhub flow).
CREATE POLICY "Issues: insert (admin/member or portal feedback)"
  ON issues FOR INSERT TO authenticated
  WITH CHECK (
    NOT is_client(auth.uid())
    OR (
      has_portal_access(auth.uid(), project_id)
      AND source = 'portal'
      AND status = 'triage'
    )
  );

CREATE POLICY "Issues: update (admin/member only)"
  ON issues FOR UPDATE TO authenticated
  USING (NOT is_client(auth.uid()))
  WITH CHECK (NOT is_client(auth.uid()));

CREATE POLICY "Issues: delete (admin/member only)"
  ON issues FOR DELETE TO authenticated
  USING (NOT is_client(auth.uid()));

-- =============================================================================
-- Issue comments & activity — internal team data; clients must not see them.
-- CP-004 FEED-P06: "Geen interne opmerkingen/comments zichtbaar voor klant".
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can read all issue_comments" ON issue_comments;
DROP POLICY IF EXISTS "Authenticated users can insert issue_comments" ON issue_comments;

CREATE POLICY "Issue comments: select (admin/member only)"
  ON issue_comments FOR SELECT TO authenticated
  USING (NOT is_client(auth.uid()));

CREATE POLICY "Issue comments: insert (admin/member only)"
  ON issue_comments FOR INSERT TO authenticated
  WITH CHECK (NOT is_client(auth.uid()));

-- Existing "Authors can update their own issue_comments" policy already scopes
-- UPDATE to author_id = auth.uid(); clients never author comments so it's a
-- no-op for them. Keep it.

DROP POLICY IF EXISTS "Authenticated users can read all issue_activity" ON issue_activity;
DROP POLICY IF EXISTS "Authenticated users can insert issue_activity" ON issue_activity;

CREATE POLICY "Issue activity: select (admin/member only)"
  ON issue_activity FOR SELECT TO authenticated
  USING (NOT is_client(auth.uid()));

CREATE POLICY "Issue activity: insert (admin/member only)"
  ON issue_activity FOR INSERT TO authenticated
  WITH CHECK (NOT is_client(auth.uid()));

-- =============================================================================
-- issue_number_seq — clients need atomic numbers for portal feedback but must
-- not be able to read/manipulate sequences directly. Flip next_issue_number to
-- SECURITY DEFINER so it bypasses RLS for the seq, and lock the seq down.
-- =============================================================================

CREATE OR REPLACE FUNCTION next_issue_number(p_project_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  INSERT INTO issue_number_seq (project_id, last_number)
  VALUES (p_project_id, 1)
  ON CONFLICT (project_id)
  DO UPDATE SET last_number = issue_number_seq.last_number + 1
  RETURNING last_number INTO next_num;

  RETURN next_num;
END;
$$;

REVOKE ALL ON FUNCTION next_issue_number(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION next_issue_number(UUID) TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can read issue_number_seq" ON issue_number_seq;
DROP POLICY IF EXISTS "Authenticated users can insert issue_number_seq" ON issue_number_seq;
DROP POLICY IF EXISTS "Authenticated users can update issue_number_seq" ON issue_number_seq;

CREATE POLICY "Issue number seq: admin/member only"
  ON issue_number_seq FOR SELECT TO authenticated
  USING (NOT is_client(auth.uid()));
-- No direct write policy; all writes go through next_issue_number (DEFINER).
