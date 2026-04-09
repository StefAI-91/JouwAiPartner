-- DevHub: add DevHub-specific columns to existing projects table
-- DH-001

ALTER TABLE projects ADD COLUMN userback_project_id TEXT;
ALTER TABLE projects ADD COLUMN project_key TEXT UNIQUE;
