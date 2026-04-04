-- Summaries table: versioned AI-generated summaries for projects and organizations.
-- Each new summary creates a new row; old versions are preserved (RULE-001).

CREATE TABLE summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'organization')),
  entity_id UUID NOT NULL,
  summary_type TEXT NOT NULL CHECK (summary_type IN ('context', 'briefing')),
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  source_meeting_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite index for fast lookups (latest version per entity + type)
CREATE INDEX idx_summaries_entity_type
  ON summaries (entity_type, entity_id, summary_type, version DESC);

-- RLS: same permissive pattern as v2 (fine-grained policies deferred to v3)
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all summaries"
  ON summaries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage summaries"
  ON summaries FOR ALL TO authenticated USING (true) WITH CHECK (true);
