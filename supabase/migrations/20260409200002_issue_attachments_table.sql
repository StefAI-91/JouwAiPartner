-- Issue attachments table: tracks screenshots, videos, and files per issue
-- Supports multiple attachments from Userback (up to 3 screenshots + video + attachment)

CREATE TABLE issue_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'screenshot', -- screenshot, video, attachment
  storage_path TEXT NOT NULL,              -- path in Supabase storage bucket
  original_url TEXT,                       -- original URL from Userback (for reference)
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,                       -- bytes
  width INTEGER,                           -- pixels (for images/screenshots)
  height INTEGER,                          -- pixels (for images/screenshots)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_issue_attachments_issue_id ON issue_attachments(issue_id);
CREATE INDEX idx_issue_attachments_type ON issue_attachments(type);

-- RLS
ALTER TABLE issue_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read issue attachments"
  ON issue_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert issue attachments"
  ON issue_attachments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete issue attachments"
  ON issue_attachments FOR DELETE
  TO authenticated
  USING (true);
