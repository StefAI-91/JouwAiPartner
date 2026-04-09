-- DevHub: project access control table
-- DH-001

CREATE TABLE devhub_project_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, project_id)
);

CREATE INDEX idx_devhub_project_access_profile_id ON devhub_project_access(profile_id);
CREATE INDEX idx_devhub_project_access_project_id ON devhub_project_access(project_id);
