-- Add github_url column to projects for quick access to repository links.

ALTER TABLE projects
  ADD COLUMN github_url TEXT;
