-- Sprint 020 — Migratie 4: RLS policies
-- SEC-006, SEC-007

-- ── Meeting Project Summaries ──
ALTER TABLE meeting_project_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all meeting_project_summaries"
  ON meeting_project_summaries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage meeting_project_summaries"
  ON meeting_project_summaries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Ignored Entities ──
ALTER TABLE ignored_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all ignored_entities"
  ON ignored_entities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage ignored_entities"
  ON ignored_entities FOR ALL TO authenticated USING (true) WITH CHECK (true);
