-- Sprint 001 — Migratie 5: Meetings + search_vector trigger
-- DATA-021..030, DATA-051

CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fireflies_id TEXT UNIQUE,
    title TEXT NOT NULL,
    date TIMESTAMPTZ,
    participants TEXT[],
    summary TEXT,
    transcript TEXT,
    meeting_type TEXT,
    party_type TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    unmatched_organization_name TEXT,
    raw_fireflies JSONB,
    relevance_score FLOAT,
    embedding VECTOR(1024),
    embedding_stale BOOLEAN DEFAULT TRUE,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT meetings_party_type_check CHECK (
        party_type IS NULL OR party_type IN ('client', 'partner', 'internal', 'other')
    )
);

-- Auto-update search_vector bij INSERT/UPDATE (dutch config)
CREATE OR REPLACE FUNCTION meetings_search_vector_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('dutch', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('dutch', COALESCE(NEW.summary, '')), 'B') ||
        setweight(to_tsvector('dutch', COALESCE(NEW.transcript, '')), 'C');
    RETURN NEW;
END;
$$;

CREATE TRIGGER meetings_search_vector_trigger
    BEFORE INSERT OR UPDATE OF title, summary, transcript
    ON meetings
    FOR EACH ROW EXECUTE FUNCTION meetings_search_vector_update();
