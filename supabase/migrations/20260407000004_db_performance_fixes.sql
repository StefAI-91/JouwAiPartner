-- Fix W9: HNSW index tuning parameters consistent met andere tabellen
-- Fix W11: Cosine-distance eenmalig berekenen in search_project_segments
-- Fix W12: ignored_entities index volgorde optimaliseren

-- W9: Rebuild HNSW index met expliciete tuning parameters
DROP INDEX IF EXISTS idx_meeting_project_summaries_embedding;
CREATE INDEX idx_meeting_project_summaries_embedding
  ON meeting_project_summaries USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- W12: Herorden de UNIQUE constraint zodat (organization_id, entity_type) prefix efficiënt is
ALTER TABLE ignored_entities
  DROP CONSTRAINT IF EXISTS ignored_entities_organization_id_entity_name_entity_type_key;
ALTER TABLE ignored_entities
  ADD CONSTRAINT ignored_entities_org_type_name_unique
  UNIQUE (organization_id, entity_type, entity_name);

-- W11: Optimaliseer search_project_segments om cosine-distance eenmalig te berekenen
CREATE OR REPLACE FUNCTION search_project_segments(
    query_embedding VECTOR(1024),
    query_text TEXT DEFAULT '',
    p_project_id UUID DEFAULT NULL,
    match_count INT DEFAULT 10,
    match_threshold FLOAT DEFAULT 0.3,
    verified_only BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    id UUID,
    meeting_id UUID,
    project_id UUID,
    project_name TEXT,
    project_name_raw TEXT,
    meeting_title TEXT,
    meeting_date TIMESTAMPTZ,
    content TEXT,
    kernpunten TEXT[],
    vervolgstappen TEXT[],
    similarity FLOAT,
    text_rank FLOAT,
    verification_status TEXT,
    verified_by UUID,
    verified_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
    ts_query TSQUERY;
BEGIN
    IF query_text <> '' THEN
        ts_query := plainto_tsquery('dutch', query_text);
    ELSE
        ts_query := NULL;
    END IF;

    RETURN QUERY
    WITH scored AS (
        SELECT
            mps.id,
            mps.meeting_id,
            mps.project_id,
            mps.project_name_raw,
            mps.summary_text,
            mps.kernpunten,
            mps.vervolgstappen,
            mps.search_vector,
            m.title AS meeting_title,
            m.date AS meeting_date,
            m.verification_status,
            m.verified_by,
            m.verified_at,
            (1 - (mps.embedding <=> query_embedding))::FLOAT AS sim,
            p.name AS p_name
        FROM meeting_project_summaries mps
        JOIN meetings m ON m.id = mps.meeting_id
        LEFT JOIN projects p ON p.id = mps.project_id
        WHERE mps.embedding IS NOT NULL
          AND (p_project_id IS NULL OR mps.project_id = p_project_id)
          AND (NOT verified_only OR m.verification_status = 'verified')
    )
    SELECT
        scored.id,
        scored.meeting_id,
        scored.project_id,
        scored.p_name AS project_name,
        scored.project_name_raw,
        scored.meeting_title,
        scored.meeting_date,
        scored.summary_text AS content,
        scored.kernpunten,
        scored.vervolgstappen,
        scored.sim AS similarity,
        CASE
            WHEN ts_query IS NOT NULL AND scored.search_vector IS NOT NULL
            THEN ts_rank(scored.search_vector, ts_query)::FLOAT
            ELSE 0.0::FLOAT
        END AS text_rank,
        scored.verification_status,
        scored.verified_by,
        scored.verified_at
    FROM scored
    WHERE scored.sim >= match_threshold
    ORDER BY (
        scored.sim * 0.7
        + CASE
            WHEN ts_query IS NOT NULL AND scored.search_vector IS NOT NULL
            THEN ts_rank(scored.search_vector, ts_query) * 0.3
            ELSE 0.0
          END
    ) DESC
    LIMIT match_count;
END;
$$;
