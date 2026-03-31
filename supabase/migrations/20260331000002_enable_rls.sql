-- SEC-01: Enable RLS on all tables with permissive policies for authenticated users.
-- This ensures tables are protected even if the anon key leaks.
-- Fine-grained policies (role-based) deferred to v3 (client portal).

-- ── Profiles ──
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read all profiles"
  ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ── Organizations ──
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read all organizations"
  ON organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage organizations"
  ON organizations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── People ──
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read all people"
  ON people FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage people"
  ON people FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Projects ──
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read all projects"
  ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage projects"
  ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Meetings ──
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read all meetings"
  ON meetings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage meetings"
  ON meetings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Meeting Projects ──
ALTER TABLE meeting_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read all meeting_projects"
  ON meeting_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage meeting_projects"
  ON meeting_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Meeting Participants ──
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read all meeting_participants"
  ON meeting_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage meeting_participants"
  ON meeting_participants FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Extractions ──
ALTER TABLE extractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read all extractions"
  ON extractions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage extractions"
  ON extractions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── MCP Queries ──
ALTER TABLE mcp_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read all mcp_queries"
  ON mcp_queries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage mcp_queries"
  ON mcp_queries FOR ALL TO authenticated USING (true) WITH CHECK (true);
