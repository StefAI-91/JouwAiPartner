-- Sprint 014 — MCP Verification Filter
-- FUNC-031, INT-001: Add verified_only parameter to search_all_content()
-- Default TRUE: only verified content returned. FALSE: all content (for internal review).
-- Also adds verification_status, verified_by, verified_at to return columns.

CREATE OR REPLACE FUNCTION search_all_content(
    query_embedding VECTOR(1024),
    query_text TEXT DEFAULT '',
    match_count INT DEFAULT 20,
    match_threshold FLOAT DEFAULT 0.3,
    verified_only BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    id UUID,
    source_type TEXT,
    title TEXT,
    content TEXT,
    date TIMESTAMPTZ,
    similarity FLOAT,
    text_rank FLOAT,
    rrf_score FLOAT,
    confidence FLOAT,
    transcript_ref TEXT,
    corrected_by UUID,
    meeting_id UUID,
    verification_status TEXT,
    verified_by UUID,
    verified_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    k CONSTANT INT := 60; -- RRF constant
    ts_query TSQUERY;
BEGIN
    -- Build tsquery from query_text (dutch config)
    IF query_text <> '' THEN
        ts_query := plainto_tsquery('dutch', query_text);
    ELSE
        ts_query := NULL;
    END IF;

    RETURN QUERY
    WITH
    -- Vector search: meetings
    vec_meetings AS (
        SELECT
            m.id,
            'meeting'::TEXT AS source_type,
            m.title,
            COALESCE(m.summary, LEFT(m.transcript, 300)) AS content,
            m.date,
            1 - (m.embedding <=> query_embedding) AS sim,
            ROW_NUMBER() OVER (ORDER BY m.embedding <=> query_embedding) AS vec_rank,
            NULL::FLOAT AS confidence,
            NULL::TEXT AS transcript_ref,
            NULL::UUID AS corrected_by,
            m.id AS meeting_id,
            m.verification_status,
            m.verified_by,
            m.verified_at
        FROM meetings m
        WHERE m.embedding IS NOT NULL
          AND 1 - (m.embedding <=> query_embedding) >= match_threshold
          AND (NOT verified_only OR m.verification_status = 'verified')
        ORDER BY m.embedding <=> query_embedding
        LIMIT match_count * 2
    ),
    -- Vector search: extractions
    vec_extractions AS (
        SELECT
            e.id,
            e.type AS source_type,
            (SELECT mt.title FROM meetings mt WHERE mt.id = e.meeting_id) AS title,
            e.content,
            (SELECT mt.date FROM meetings mt WHERE mt.id = e.meeting_id) AS date,
            1 - (e.embedding <=> query_embedding) AS sim,
            ROW_NUMBER() OVER (ORDER BY e.embedding <=> query_embedding) AS vec_rank,
            e.confidence::FLOAT AS confidence,
            e.transcript_ref,
            e.corrected_by,
            e.meeting_id,
            e.verification_status,
            e.verified_by,
            e.verified_at
        FROM extractions e
        WHERE e.embedding IS NOT NULL
          AND 1 - (e.embedding <=> query_embedding) >= match_threshold
          AND (NOT verified_only OR e.verification_status = 'verified')
        ORDER BY e.embedding <=> query_embedding
        LIMIT match_count * 2
    ),
    -- Combine vector results
    vec_all AS (
        SELECT * FROM vec_meetings
        UNION ALL
        SELECT * FROM vec_extractions
    ),
    -- Full-text search: meetings
    fts_meetings AS (
        SELECT
            m.id,
            'meeting'::TEXT AS source_type,
            m.title,
            COALESCE(m.summary, LEFT(m.transcript, 300)) AS content,
            m.date,
            ts_rank_cd(m.search_vector, ts_query) AS txt_rank,
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(m.search_vector, ts_query) DESC) AS fts_rank,
            NULL::FLOAT AS confidence,
            NULL::TEXT AS transcript_ref,
            NULL::UUID AS corrected_by,
            m.id AS meeting_id,
            m.verification_status,
            m.verified_by,
            m.verified_at
        FROM meetings m
        WHERE ts_query IS NOT NULL
          AND m.search_vector @@ ts_query
          AND (NOT verified_only OR m.verification_status = 'verified')
        ORDER BY ts_rank_cd(m.search_vector, ts_query) DESC
        LIMIT match_count * 2
    ),
    -- Full-text search: extractions
    fts_extractions AS (
        SELECT
            e.id,
            e.type AS source_type,
            (SELECT mt.title FROM meetings mt WHERE mt.id = e.meeting_id) AS title,
            e.content,
            (SELECT mt.date FROM meetings mt WHERE mt.id = e.meeting_id) AS date,
            ts_rank_cd(e.search_vector, ts_query) AS txt_rank,
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(e.search_vector, ts_query) DESC) AS fts_rank,
            e.confidence::FLOAT AS confidence,
            e.transcript_ref,
            e.corrected_by,
            e.meeting_id,
            e.verification_status,
            e.verified_by,
            e.verified_at
        FROM extractions e
        WHERE ts_query IS NOT NULL
          AND e.search_vector @@ ts_query
          AND (NOT verified_only OR e.verification_status = 'verified')
        ORDER BY ts_rank_cd(e.search_vector, ts_query) DESC
        LIMIT match_count * 2
    ),
    -- Combine full-text results
    fts_all AS (
        SELECT * FROM fts_meetings
        UNION ALL
        SELECT * FROM fts_extractions
    ),
    -- RRF fusion
    fused AS (
        SELECT
            COALESCE(v.id, f.id) AS id,
            COALESCE(v.source_type, f.source_type) AS source_type,
            COALESCE(v.title, f.title) AS title,
            COALESCE(v.content, f.content) AS content,
            COALESCE(v.date, f.date) AS date,
            COALESCE(v.sim, 0.0) AS similarity,
            COALESCE(f.txt_rank, 0.0) AS text_rank,
            COALESCE(1.0 / (k + v.vec_rank), 0.0)
              + COALESCE(1.0 / (k + f.fts_rank), 0.0) AS rrf_score,
            COALESCE(v.confidence, f.confidence) AS confidence,
            COALESCE(v.transcript_ref, f.transcript_ref) AS transcript_ref,
            COALESCE(v.corrected_by, f.corrected_by) AS corrected_by,
            COALESCE(v.meeting_id, f.meeting_id) AS meeting_id,
            COALESCE(v.verification_status, f.verification_status) AS verification_status,
            COALESCE(v.verified_by, f.verified_by) AS verified_by,
            COALESCE(v.verified_at, f.verified_at) AS verified_at
        FROM vec_all v
        FULL OUTER JOIN fts_all f ON v.id = f.id
    )
    SELECT
        fused.id,
        fused.source_type,
        fused.title,
        fused.content,
        fused.date,
        fused.similarity::FLOAT,
        fused.text_rank::FLOAT,
        fused.rrf_score::FLOAT,
        fused.confidence::FLOAT,
        fused.transcript_ref,
        fused.corrected_by,
        fused.meeting_id,
        fused.verification_status,
        fused.verified_by,
        fused.verified_at
    FROM fused
    ORDER BY fused.rrf_score DESC
    LIMIT match_count;
END;
$$;
