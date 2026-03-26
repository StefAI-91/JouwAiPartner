-- Sprint 02 Task 4: Vector similarity search functions

-- Search documents table by embedding similarity
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.78,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    title TEXT,
    source TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.content,
        d.title,
        'document'::TEXT AS source,
        1 - (d.embedding <=> query_embedding) AS similarity
    FROM documents d
    WHERE d.status = 'active'
      AND d.embedding IS NOT NULL
      AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Cross-table search (all content tables)
CREATE OR REPLACE FUNCTION search_all_content(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.78,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    title TEXT,
    source_table TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    (
        SELECT d.id, d.content, d.title, 'documents'::TEXT, 1 - (d.embedding <=> query_embedding)
        FROM documents d
        WHERE d.status = 'active' AND d.embedding IS NOT NULL
          AND 1 - (d.embedding <=> query_embedding) > match_threshold
    )
    UNION ALL
    (
        SELECT m.id, m.summary, m.title, 'meetings'::TEXT, 1 - (m.embedding <=> query_embedding)
        FROM meetings m
        WHERE m.status = 'active' AND m.embedding IS NOT NULL
          AND 1 - (m.embedding <=> query_embedding) > match_threshold
    )
    UNION ALL
    (
        SELECT s.id, s.content, s.channel, 'slack_messages'::TEXT, 1 - (s.embedding <=> query_embedding)
        FROM slack_messages s
        WHERE s.status = 'active' AND s.embedding IS NOT NULL
          AND 1 - (s.embedding <=> query_embedding) > match_threshold
    )
    UNION ALL
    (
        SELECT e.id, e.body, e.subject, 'emails'::TEXT, 1 - (e.embedding <=> query_embedding)
        FROM emails e
        WHERE e.status = 'active' AND e.embedding IS NOT NULL
          AND 1 - (e.embedding <=> query_embedding) > match_threshold
    )
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- People search by embedding similarity
CREATE OR REPLACE FUNCTION match_people(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.70,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    team TEXT,
    role TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.team,
        p.role,
        1 - (p.embedding <=> query_embedding) AS similarity
    FROM people p
    WHERE p.embedding IS NOT NULL
      AND 1 - (p.embedding <=> query_embedding) > match_threshold
    ORDER BY p.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
