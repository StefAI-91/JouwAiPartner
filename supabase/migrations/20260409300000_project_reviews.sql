-- Project AI Reviews: stores AI-generated issue analysis per project
-- Links to the AI Issue Review feature in DevHub

CREATE TABLE project_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  generated_by UUID REFERENCES profiles(id),

  -- Metrics snapshot at time of review
  total_issues INTEGER NOT NULL DEFAULT 0,
  issues_by_status JSONB NOT NULL DEFAULT '{}',
  issues_by_priority JSONB NOT NULL DEFAULT '{}',
  issues_by_type JSONB NOT NULL DEFAULT '{}',
  avg_resolution_days REAL,

  -- AI analysis output
  health_score INTEGER NOT NULL, -- 0-100
  health_label TEXT NOT NULL, -- "healthy", "needs_attention", "critical"
  summary TEXT NOT NULL,
  patterns JSONB NOT NULL DEFAULT '[]',
  risks JSONB NOT NULL DEFAULT '[]',
  action_items JSONB NOT NULL DEFAULT '[]',

  -- Meta
  model_used TEXT NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
  input_token_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_reviews_project_id ON project_reviews(project_id);
CREATE INDEX idx_project_reviews_created_at ON project_reviews(created_at DESC);

-- RLS: authenticated users can read/insert
ALTER TABLE project_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read project reviews"
  ON project_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert project reviews"
  ON project_reviews FOR INSERT
  TO authenticated
  WITH CHECK (true);
