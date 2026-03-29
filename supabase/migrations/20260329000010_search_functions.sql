-- Sprint 002 — Migratie 10: Search functions (1024-dim)
-- FUNC-019, FUNC-027, FUNC-028, DATA-053

-- =============================================================================
-- search_all_content: Hybrid search (vector + full-text) with RRF fusion
-- Searches meetings and extractions simultaneously, fuses results via
-- Reciprocal Rank Fusion (k=60).
-- =============================================================================
CREATE OR REPLACE FUNCTION search_all_content(
    query_embedding VECTOR(1024),
    query_text TEXT DEFAULT '',
    match_count INT DEFAULT 20,
    similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    id UUID,
    source_type TEXT,
    title TEXT,
    content TEXT,
    date TIMESTAMPTZ,
    similarity FLOAT,
    text_rank FLOAT,
    rrf_score FLOAT
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
            ROW_NUMBER() OVER (ORDER BY m.embedding <=> query_embedding) AS vec_rank
        FROM meetings m
        WHERE m.embedding IS NOT NULL
          AND 1 - (m.embedding <=> query_embedding) >= similarity_threshold
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
            ROW_NUMBER() OVER (ORDER BY e.embedding <=> query_embedding) AS vec_rank
        FROM extractions e
        WHERE e.embedding IS NOT NULL
          AND 1 - (e.embedding <=> query_embedding) >= similarity_threshold
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
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(m.search_vector, ts_query) DESC) AS fts_rank
        FROM meetings m
        WHERE ts_query IS NOT NULL
          AND m.search_vector @@ ts_query
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
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(e.search_vector, ts_query) DESC) AS fts_rank
        FROM extractions e
        WHERE ts_query IS NOT NULL
          AND e.search_vector @@ ts_query
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
            -- RRF: 1/(k + rank_vector) + 1/(k + rank_fts)
            COALESCE(1.0 / (k + v.vec_rank), 0.0)
              + COALESCE(1.0 / (k + f.fts_rank), 0.0) AS rrf_score
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
        fused.rrf_score::FLOAT
    FROM fused
    ORDER BY fused.rrf_score DESC
    LIMIT match_count;
END;
$$;

-- =============================================================================
-- match_people: Vector similarity search on people
-- =============================================================================
CREATE OR REPLACE FUNCTION match_people(
    query_embedding VECTOR(1024),
    match_count INT DEFAULT 10,
    similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    team TEXT,
    role TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.email,
        p.team,
        p.role,
        (1 - (p.embedding <=> query_embedding))::FLOAT AS similarity
    FROM people p
    WHERE p.embedding IS NOT NULL
      AND 1 - (p.embedding <=> query_embedding) >= similarity_threshold
    ORDER BY p.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- =============================================================================
-- match_projects: Vector similarity search on projects
-- =============================================================================
CREATE OR REPLACE FUNCTION match_projects(
    query_embedding VECTOR(1024),
    match_count INT DEFAULT 10,
    similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    organization_id UUID,
    status TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pr.id,
        pr.name,
        pr.organization_id,
        pr.status,
        (1 - (pr.embedding <=> query_embedding))::FLOAT AS similarity
    FROM projects pr
    WHERE pr.embedding IS NOT NULL
      AND 1 - (pr.embedding <=> query_embedding) >= similarity_threshold
    ORDER BY pr.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- =============================================================================
-- search_meetings_by_participant: Find meetings for a specific person
-- Uses meeting_participants join table + optional text search
-- =============================================================================
CREATE OR REPLACE FUNCTION search_meetings_by_participant(
    participant_id UUID,
    query_text TEXT DEFAULT '',
    match_count INT DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    date TIMESTAMPTZ,
    summary TEXT,
    meeting_type TEXT,
    organization_name TEXT,
    text_rank FLOAT
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
        m.id,
        m.title,
        m.date,
        m.summary,
        m.meeting_type,
        o.name AS organization_name,
        CASE
            WHEN ts_query IS NOT NULL THEN ts_rank_cd(m.search_vector, ts_query)::FLOAT
            ELSE 0.0::FLOAT
        END AS text_rank
    FROM meetings m
    INNER JOIN meeting_participants mp ON mp.meeting_id = m.id
    LEFT JOIN organizations o ON o.id = m.organization_id
    WHERE mp.person_id = participant_id
      AND (ts_query IS NULL OR m.search_vector @@ ts_query)
    ORDER BY
        CASE WHEN ts_query IS NOT NULL THEN ts_rank_cd(m.search_vector, ts_query) ELSE 0.0 END DESC,
        m.date DESC NULLS LAST
    LIMIT match_count;
END;
$$;
