-- WG-001: Widget Ingest Foundation
-- Whitelist-tabel voor de eigen feedback-widget. Alleen Origins die hier
-- staan mogen via /api/ingest/widget feedback POSTen voor het bijbehorende
-- project. Bron van waarheid voor cross-origin authorisatie.

-- ── 1. JAIP Platform-project (zelf-feedback target) ──
-- Cockpit/devhub/portal zijn ook "shipped products" en moeten ergens hun
-- eigen feedback kunnen droppen. Conflict-handling op `name` (de enige
-- UNIQUE-kolom) zodat re-runs in andere envs geen dubbele rij maken.
INSERT INTO projects (id, name, organization_id, status)
VALUES (
  '00000000-0000-4000-8000-00000000aa01'::uuid,
  'JAIP Platform',
  (SELECT id FROM organizations WHERE name = 'Jouw AI Partner'),
  'active'
)
ON CONFLICT (name) DO NOTHING;

-- ── 2. Whitelist-tabel ──
CREATE TABLE widget_allowed_projects (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  domain text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, domain)
);

CREATE INDEX idx_widget_allowed_domain ON widget_allowed_projects(domain);

-- ── 3. Seed cockpit-domein ──
-- Pak het JAIP Platform-project op `name` (UUID kan in andere envs anders
-- zijn als de rij al bestond). Idempotent.
INSERT INTO widget_allowed_projects (project_id, domain)
SELECT id, 'cockpit.jouw-ai-partner.nl' FROM projects WHERE name = 'JAIP Platform'
ON CONFLICT (project_id, domain) DO NOTHING;

-- ── 4. RLS ──
-- Alleen admins (profiles.role = 'admin') kunnen de whitelist beheren.
-- Service-role bypassed RLS, dus de ingest-route kan altijd lezen.
-- Geen `jaip_admin`-rol gebruiken — die bestaat niet, profiles kent
-- alleen 'admin' / 'member' / 'client'.
ALTER TABLE widget_allowed_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Widget allowed projects: admin manage"
  ON widget_allowed_projects
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
