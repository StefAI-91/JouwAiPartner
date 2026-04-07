-- Fix C1: UNIQUE constraint op (meeting_id, project_id) voor idempotente segment inserts
-- PostgreSQL treats NULL as distinct in UNIQUE constraints, dus we gebruiken twee partial indexes:
-- 1. Eén voor project-specifieke segmenten (project_id IS NOT NULL)
-- 2. Eén voor het Algemeen segment per meeting (project_id IS NULL)

CREATE UNIQUE INDEX idx_mps_meeting_project_unique
  ON meeting_project_summaries (meeting_id, project_id)
  WHERE project_id IS NOT NULL;

CREATE UNIQUE INDEX idx_mps_meeting_general_unique
  ON meeting_project_summaries (meeting_id)
  WHERE project_id IS NULL;

-- Fix W8: Ontbrekende embedding_stale index (consistent met andere tabellen)
CREATE INDEX idx_meeting_project_summaries_embedding_stale
  ON meeting_project_summaries (embedding_stale)
  WHERE embedding_stale = true;

-- Fix W10: updated_at kolom voor audit trail
ALTER TABLE meeting_project_summaries
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION update_meeting_project_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_meeting_project_summaries_updated_at
  BEFORE UPDATE ON meeting_project_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_project_summaries_updated_at();
