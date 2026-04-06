-- Sprint 020 — Migratie 1: meeting_project_summaries tabel
-- DATA-070..081, DATA-086..088

-- Tabel met alle kolommen, constraints en generated column
CREATE TABLE meeting_project_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  project_name_raw TEXT,
  is_general BOOLEAN GENERATED ALWAYS AS (project_id IS NULL) STORED,
  kernpunten TEXT[] DEFAULT '{}',
  vervolgstappen TEXT[] DEFAULT '{}',
  summary_text TEXT NOT NULL,
  embedding VECTOR(1024),
  embedding_stale BOOLEAN NOT NULL DEFAULT true,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW vector index voor segment-level vector search (DATA-086)
CREATE INDEX idx_meeting_project_summaries_embedding
  ON meeting_project_summaries USING hnsw (embedding vector_cosine_ops);

-- GIN index voor full-text search (DATA-087)
CREATE INDEX idx_meeting_project_summaries_search_vector
  ON meeting_project_summaries USING gin (search_vector);

-- B-tree indexes voor veelgebruikte filters
CREATE INDEX idx_meeting_project_summaries_meeting_id
  ON meeting_project_summaries (meeting_id);
CREATE INDEX idx_meeting_project_summaries_project_id
  ON meeting_project_summaries (project_id);

-- Trigger voor search_vector auto-update op summary_text (DATA-088)
CREATE FUNCTION update_meeting_project_summary_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('dutch', COALESCE(NEW.summary_text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_meeting_project_summary_search_vector
  BEFORE INSERT OR UPDATE OF summary_text
  ON meeting_project_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_project_summary_search_vector();
