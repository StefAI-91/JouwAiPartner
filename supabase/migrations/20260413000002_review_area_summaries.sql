-- Add frontend and backend area summaries to project reviews
ALTER TABLE project_reviews
  ADD COLUMN frontend_summary text,
  ADD COLUMN backend_summary text;

COMMENT ON COLUMN project_reviews.frontend_summary IS 'AI-generated summary of frontend issue state';
COMMENT ON COLUMN project_reviews.backend_summary IS 'AI-generated summary of backend issue state';
