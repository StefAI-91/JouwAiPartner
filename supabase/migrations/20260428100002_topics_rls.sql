-- PR-001: Topics database foundation — RLS policies
-- PR-SEC-001, PR-SEC-002
--
-- Volgt het productie-patroon uit 20260417100002_portal_rls_policies.sql en
-- 20260418110000_issues_rls_client_hardening.sql: helpers `is_client(uid)` en
-- `has_portal_access(uid, pid)` (beide STABLE SECURITY DEFINER) doen het
-- zware werk, beleidsregels blijven leesbaar.
--
-- Clients zien alleen topics die niet meer in `clustering` staan en op een
-- project waar ze portal-toegang voor hebben. Topic_issues volgt dezelfde
-- regel via een join op topics (RLS-aware). Schrijven is admin/member-only.

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_issues ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- topics
-- =============================================================================

DROP POLICY IF EXISTS "Topics: select (role-aware)" ON topics;
DROP POLICY IF EXISTS "Topics: insert (admin/member only)" ON topics;
DROP POLICY IF EXISTS "Topics: update (admin/member only)" ON topics;
DROP POLICY IF EXISTS "Topics: delete (admin/member only)" ON topics;

CREATE POLICY "Topics: select (role-aware)"
  ON topics FOR SELECT TO authenticated
  USING (
    NOT is_client(auth.uid())
    OR (
      has_portal_access(auth.uid(), project_id)
      AND status <> 'clustering'
    )
  );

CREATE POLICY "Topics: insert (admin/member only)"
  ON topics FOR INSERT TO authenticated
  WITH CHECK (NOT is_client(auth.uid()));

CREATE POLICY "Topics: update (admin/member only)"
  ON topics FOR UPDATE TO authenticated
  USING (NOT is_client(auth.uid()))
  WITH CHECK (NOT is_client(auth.uid()));

CREATE POLICY "Topics: delete (admin/member only)"
  ON topics FOR DELETE TO authenticated
  USING (NOT is_client(auth.uid()));

-- =============================================================================
-- topic_issues — clients zien alleen koppelingen op topics die voor hen
-- zichtbaar zijn (zelfde clustering-uitsluiting via join op topics).
-- =============================================================================

DROP POLICY IF EXISTS "Topic issues: select (role-aware)" ON topic_issues;
DROP POLICY IF EXISTS "Topic issues: insert (admin/member only)" ON topic_issues;
DROP POLICY IF EXISTS "Topic issues: update (admin/member only)" ON topic_issues;
DROP POLICY IF EXISTS "Topic issues: delete (admin/member only)" ON topic_issues;

CREATE POLICY "Topic issues: select (role-aware)"
  ON topic_issues FOR SELECT TO authenticated
  USING (
    NOT is_client(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM topics t
      WHERE t.id = topic_issues.topic_id
        AND has_portal_access(auth.uid(), t.project_id)
        AND t.status <> 'clustering'
    )
  );

CREATE POLICY "Topic issues: insert (admin/member only)"
  ON topic_issues FOR INSERT TO authenticated
  WITH CHECK (NOT is_client(auth.uid()));

CREATE POLICY "Topic issues: update (admin/member only)"
  ON topic_issues FOR UPDATE TO authenticated
  USING (NOT is_client(auth.uid()))
  WITH CHECK (NOT is_client(auth.uid()));

CREATE POLICY "Topic issues: delete (admin/member only)"
  ON topic_issues FOR DELETE TO authenticated
  USING (NOT is_client(auth.uid()));
