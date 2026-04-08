-- Email Integration — Migratie 3: Email-Project junction table
-- Links emails to projects (same pattern as meeting_projects)

CREATE TABLE email_projects (
    email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source TEXT NOT NULL DEFAULT 'ai',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (email_id, project_id),
    CONSTRAINT email_projects_source_check CHECK (
        source IN ('ai', 'manual', 'review')
    )
);

CREATE INDEX idx_email_projects_project_id ON email_projects(project_id);

-- RLS
ALTER TABLE email_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all email_projects"
  ON email_projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage email_projects"
  ON email_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
