-- DevHub: issues table and issue number sequence
-- DH-001

CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'bug',
  status TEXT NOT NULL DEFAULT 'triage',
  priority TEXT NOT NULL DEFAULT 'medium',
  component TEXT,
  severity TEXT,
  labels TEXT[] DEFAULT '{}',
  assigned_to UUID REFERENCES profiles(id),
  reporter_name TEXT,
  reporter_email TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  userback_id TEXT UNIQUE,
  source_url TEXT,
  source_metadata JSONB DEFAULT '{}',
  ai_classification JSONB DEFAULT '{}',
  ai_classified_at TIMESTAMPTZ,
  embedding extensions.vector(1024),
  duplicate_of_id UUID REFERENCES issues(id),
  similarity_score REAL,
  issue_number INTEGER NOT NULL,
  execution_type TEXT NOT NULL DEFAULT 'manual',
  ai_context JSONB DEFAULT '{}',
  ai_result JSONB DEFAULT '{}',
  ai_executable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE issue_number_seq (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  last_number INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_issues_project_id ON issues(project_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_assigned_to ON issues(assigned_to);
CREATE INDEX idx_issues_priority ON issues(priority);
CREATE INDEX idx_issues_type ON issues(type);
CREATE INDEX idx_issues_userback_id ON issues(userback_id);
CREATE INDEX idx_issues_created_at ON issues(created_at DESC);

-- Atomic issue number generator: upserts seq row and returns next number
CREATE OR REPLACE FUNCTION next_issue_number(p_project_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
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
