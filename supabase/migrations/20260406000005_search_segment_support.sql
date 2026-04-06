-- Sprint 025 — Segment-level search RPC
-- FUNC-080, FUNC-081: Separate RPC for project-specific segment search.
-- The existing search_all_content() remains unchanged (FUNC-082, backwards compatible).

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
    SELECT
        mps.id,
        mps.meeting_id,
        mps.project_id,
        p.name AS project_name,
        mps.project_name_raw,
        m.title AS meeting_title,
        m.date AS meeting_date,
        mps.summary_text AS content,
        mps.kernpunten,
        mps.vervolgstappen,
        (1 - (mps.embedding <=> query_embedding))::FLOAT AS similarity,
        CASE
            WHEN ts_query IS NOT NULL AND mps.search_vector IS NOT NULL
            THEN ts_rank(mps.search_vector, ts_query)::FLOAT
            ELSE 0.0::FLOAT
        END AS text_rank,
        m.verification_status,
        m.verified_by,
        m.verified_at
    FROM meeting_project_summaries mps
    JOIN meetings m ON m.id = mps.meeting_id
    LEFT JOIN projects p ON p.id = mps.project_id
    WHERE mps.embedding IS NOT NULL
      AND 1 - (mps.embedding <=> query_embedding) >= match_threshold
      AND (p_project_id IS NULL OR mps.project_id = p_project_id)
      AND (NOT verified_only OR m.verification_status = 'verified')
    ORDER BY (
        (1 - (mps.embedding <=> query_embedding)) * 0.7
        + CASE
            WHEN ts_query IS NOT NULL AND mps.search_vector IS NOT NULL
            THEN ts_rank(mps.search_vector, ts_query) * 0.3
            ELSE 0.0
          END
    ) DESC
    LIMIT match_count;
END;
$$;
