-- Create storage bucket for issue attachments (screenshots, videos, files from Userback)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'issue-attachments',
  'issue-attachments',
  true,
  52428800, -- 50MB limit
  ARRAY[
    'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf', 'application/zip',
    'text/plain', 'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS: anyone can read (public bucket)
CREATE POLICY "Public read access for issue-attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'issue-attachments');

-- RLS: authenticated users can upload
CREATE POLICY "Authenticated users can upload to issue-attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'issue-attachments');

-- RLS: service role can do everything (used by sync pipeline)
-- Note: service role bypasses RLS by default, so no explicit policy needed.
