-- DevHub: RLS policies for all DevHub tables
-- DH-001
-- Pattern: permissive for authenticated users (fine-grained role-based policies deferred to v3).
-- Exception: issue_comments UPDATE is restricted to the comment author.

-- ── Issues ──
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all issues"
  ON issues FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert issues"
  ON issues FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update issues"
  ON issues FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ── Issue Number Seq ──
ALTER TABLE issue_number_seq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read issue_number_seq"
  ON issue_number_seq FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage issue_number_seq"
  ON issue_number_seq FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Issue Comments ──
ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all issue_comments"
  ON issue_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert issue_comments"
  ON issue_comments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authors can update their own issue_comments"
  ON issue_comments FOR UPDATE TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- ── Issue Activity ──
ALTER TABLE issue_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all issue_activity"
  ON issue_activity FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert issue_activity"
  ON issue_activity FOR INSERT TO authenticated WITH CHECK (true);

-- ── DevHub Project Access ──
ALTER TABLE devhub_project_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all devhub_project_access"
  ON devhub_project_access FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage devhub_project_access"
  ON devhub_project_access FOR ALL TO authenticated USING (true) WITH CHECK (true);
