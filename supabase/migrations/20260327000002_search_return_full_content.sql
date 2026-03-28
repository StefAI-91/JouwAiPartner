-- Update search_all_content to return transcript for meetings (not just summary)
-- This enables the ask endpoint to cite specific quotes from conversations
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
    SELECT * FROM (
        (
            SELECT d.id, d.content, d.title, 'documents'::TEXT AS source_table, 1 - (d.embedding <=> query_embedding) AS similarity
            FROM documents d
            WHERE d.status = 'active' AND d.embedding IS NOT NULL
              AND 1 - (d.embedding <=> query_embedding) > match_threshold
        )
        UNION ALL
        (
            SELECT m.id,
                   COALESCE(m.summary || E'\n\n' || m.transcript, m.summary, m.transcript) AS content,
                   m.title,
                   'meetings'::TEXT AS source_table,
                   1 - (m.embedding <=> query_embedding) AS similarity
            FROM meetings m
            WHERE m.status = 'active' AND m.embedding IS NOT NULL
              AND 1 - (m.embedding <=> query_embedding) > match_threshold
        )
        UNION ALL
        (
            SELECT s.id, s.content, s.channel AS title, 'slack_messages'::TEXT AS source_table, 1 - (s.embedding <=> query_embedding) AS similarity
            FROM slack_messages s
            WHERE s.status = 'active' AND s.embedding IS NOT NULL
              AND 1 - (s.embedding <=> query_embedding) > match_threshold
        )
        UNION ALL
        (
            SELECT e.id, e.body AS content, e.subject AS title, 'emails'::TEXT AS source_table, 1 - (e.embedding <=> query_embedding) AS similarity
            FROM emails e
            WHERE e.status = 'active' AND e.embedding IS NOT NULL
              AND 1 - (e.embedding <=> query_embedding) > match_threshold
        )
    ) combined
    ORDER BY combined.similarity DESC
    LIMIT match_count;
END;
$$;
