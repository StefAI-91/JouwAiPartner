-- DevHub: Quality fixes — SEC-2, SEC-3, SEC-4, CONV-4
-- Code review findings from sprint 001-003

-- ── SEC-2: Add DELETE policy for issues ──
CREATE POLICY "Authenticated users can delete issues"
  ON issues FOR DELETE TO authenticated USING (true);

-- ── SEC-3: Replace overly broad FOR ALL on issue_number_seq ──
-- Drop the permissive FOR ALL policy and keep the SELECT-only one
DROP POLICY IF EXISTS "Authenticated users can manage issue_number_seq" ON issue_number_seq;

-- Only add INSERT + UPDATE (SELECT already exists)
CREATE POLICY "Authenticated users can insert issue_number_seq"
  ON issue_number_seq FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update issue_number_seq"
  ON issue_number_seq FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ── SEC-3b: Replace overly broad FOR ALL on devhub_project_access ──
DROP POLICY IF EXISTS "Authenticated users can manage devhub_project_access" ON devhub_project_access;

CREATE POLICY "Authenticated users can insert devhub_project_access"
  ON devhub_project_access FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update devhub_project_access"
  ON devhub_project_access FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete devhub_project_access"
  ON devhub_project_access FOR DELETE TO authenticated USING (true);

-- ── SEC-4: CHECK constraints on type, status, priority ──
ALTER TABLE issues ADD CONSTRAINT chk_issues_type
  CHECK (type IN ('bug', 'feature', 'improvement', 'task', 'question'));

ALTER TABLE issues ADD CONSTRAINT chk_issues_status
  CHECK (status IN ('triage', 'backlog', 'todo', 'in_progress', 'done', 'cancelled'));

ALTER TABLE issues ADD CONSTRAINT chk_issues_priority
  CHECK (priority IN ('urgent', 'high', 'medium', 'low'));

-- ── CONV-4: updated_at triggers ──
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_issue_comments_updated_at
  BEFORE UPDATE ON issue_comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
