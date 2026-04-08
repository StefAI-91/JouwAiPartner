-- Email Integration — Migratie 4: Email Extractions
-- AI-extracted insights from emails (same pattern as meeting extractions)

CREATE TABLE email_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence FLOAT,
    metadata JSONB DEFAULT '{}',
    source_ref TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    embedding VECTOR(1024),
    embedding_stale BOOLEAN DEFAULT TRUE,
    corrected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    corrected_at TIMESTAMPTZ,
    verification_status TEXT NOT NULL DEFAULT 'draft',
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT email_extractions_type_check CHECK (
        type IN ('decision', 'action_item', 'need', 'insight', 'project_update', 'request')
    ),
    CONSTRAINT email_extractions_confidence_check CHECK (
        confidence IS NULL OR (confidence >= 0.0 AND confidence <= 1.0)
    ),
    CONSTRAINT email_extractions_verification_status_check CHECK (
        verification_status IN ('draft', 'verified', 'rejected')
    )
);

CREATE INDEX idx_email_extractions_email_id ON email_extractions(email_id);
CREATE INDEX idx_email_extractions_type ON email_extractions(type);
CREATE INDEX idx_email_extractions_project_id ON email_extractions(project_id);
CREATE INDEX idx_email_extractions_verification_status ON email_extractions(verification_status);

-- Full-text search
CREATE OR REPLACE FUNCTION email_extractions_search_vector_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('dutch', COALESCE(NEW.content, '')), 'A') ||
        setweight(to_tsvector('dutch', COALESCE(NEW.source_ref, '')), 'B');
    RETURN NEW;
END;
$$;

CREATE TRIGGER email_extractions_search_vector_trigger
    BEFORE INSERT OR UPDATE OF content, source_ref
    ON email_extractions
    FOR EACH ROW EXECUTE FUNCTION email_extractions_search_vector_update();

-- HNSW vector index
CREATE INDEX idx_email_extractions_embedding ON email_extractions
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- GIN index for FTS
CREATE INDEX idx_email_extractions_search_vector ON email_extractions USING GIN (search_vector);

-- RLS
ALTER TABLE email_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all email_extractions"
  ON email_extractions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage email_extractions"
  ON email_extractions FOR ALL TO authenticated USING (true) WITH CHECK (true);
