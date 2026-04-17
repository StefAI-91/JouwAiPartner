-- CP-001: Portal MVP — portal_project_access join table
-- RLS-P06
--
-- Fine-grained access control for client users. Mirrors the pattern from
-- `devhub_project_access`: a pure join table, no role column. Client users
-- may only see projects they have an explicit access row for.

CREATE TABLE portal_project_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, project_id)
);

CREATE INDEX idx_portal_project_access_profile_id ON portal_project_access(profile_id);
CREATE INDEX idx_portal_project_access_project_id ON portal_project_access(project_id);

ALTER TABLE portal_project_access ENABLE ROW LEVEL SECURITY;
