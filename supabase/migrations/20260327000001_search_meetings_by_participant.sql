-- Search meetings filtered by participant name (case-insensitive partial match)
CREATE OR REPLACE FUNCTION search_meetings_by_participant(
    query_embedding VECTOR(1536),
    participant_name TEXT,
    match_threshold FLOAT DEFAULT 0.3,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    summary TEXT,
    transcript TEXT,
    participants TEXT[],
    date TIMESTAMP,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.title,
        m.summary,
        m.transcript,
        m.participants,
        m.date,
        1 - (m.embedding <=> query_embedding) AS similarity
    FROM meetings m
    WHERE m.status = 'active'
      AND m.embedding IS NOT NULL
      AND EXISTS (
          SELECT 1 FROM unnest(m.participants) p
          WHERE lower(p) LIKE '%' || lower(participant_name) || '%'
      )
      AND 1 - (m.embedding <=> query_embedding) > match_threshold
    ORDER BY m.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
