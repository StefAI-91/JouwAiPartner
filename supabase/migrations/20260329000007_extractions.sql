-- Sprint 001 — Migratie 7: Extractions + search_vector trigger
-- DATA-033..041, DATA-050, DATA-052

CREATE TABLE extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence FLOAT,
    metadata JSONB DEFAULT '{}',
    transcript_ref TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    embedding VECTOR(1024),
    embedding_stale BOOLEAN DEFAULT TRUE,
    corrected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    corrected_at TIMESTAMPTZ,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT extractions_type_check CHECK (
        type IN ('decision', 'action_item', 'need', 'insight')
    ),
    CONSTRAINT extractions_confidence_check CHECK (
        confidence IS NULL OR (confidence >= 0.0 AND confidence <= 1.0)
    )
);

-- Auto-update search_vector bij INSERT/UPDATE (dutch config)
CREATE OR REPLACE FUNCTION extractions_search_vector_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('dutch', COALESCE(NEW.content, '')), 'A') ||
        setweight(to_tsvector('dutch', COALESCE(NEW.transcript_ref, '')), 'B');
    RETURN NEW;
END;
$$;

CREATE TRIGGER extractions_search_vector_trigger
    BEFORE INSERT OR UPDATE OF content, transcript_ref
    ON extractions
    FOR EACH ROW EXECUTE FUNCTION extractions_search_vector_update();
