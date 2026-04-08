-- Email Integration — Migratie 2: Emails table
-- Stores ingested Gmail messages, linked to organizations and projects

CREATE TABLE emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_account_id UUID NOT NULL REFERENCES google_accounts(id) ON DELETE CASCADE,
    gmail_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    subject TEXT,
    from_address TEXT NOT NULL,
    from_name TEXT,
    to_addresses TEXT[] DEFAULT '{}',
    cc_addresses TEXT[] DEFAULT '{}',
    date TIMESTAMPTZ NOT NULL,
    body_text TEXT,
    body_html TEXT,
    snippet TEXT,
    labels TEXT[] DEFAULT '{}',
    has_attachments BOOLEAN DEFAULT FALSE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    unmatched_organization_name TEXT,
    relevance_score FLOAT,
    is_processed BOOLEAN DEFAULT FALSE,
    verification_status TEXT NOT NULL DEFAULT 'draft',
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    raw_gmail JSONB,
    embedding VECTOR(1024),
    embedding_stale BOOLEAN DEFAULT TRUE,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT emails_gmail_id_account_unique UNIQUE (gmail_id, google_account_id),
    CONSTRAINT emails_verification_status_check CHECK (
        verification_status IN ('draft', 'verified', 'rejected')
    ),
    CONSTRAINT emails_relevance_score_check CHECK (
        relevance_score IS NULL OR (relevance_score >= 0.0 AND relevance_score <= 1.0)
    )
);

CREATE INDEX idx_emails_google_account_id ON emails(google_account_id);
CREATE INDEX idx_emails_thread_id ON emails(thread_id);
CREATE INDEX idx_emails_date ON emails(date DESC);
CREATE INDEX idx_emails_organization_id ON emails(organization_id);
CREATE INDEX idx_emails_verification_status ON emails(verification_status);
CREATE INDEX idx_emails_is_processed ON emails(is_processed) WHERE is_processed = FALSE;

-- Full-text search (dutch config, same pattern as meetings)
CREATE OR REPLACE FUNCTION emails_search_vector_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('dutch', COALESCE(NEW.subject, '')), 'A') ||
        setweight(to_tsvector('dutch', COALESCE(NEW.snippet, '')), 'B') ||
        setweight(to_tsvector('dutch', COALESCE(NEW.body_text, '')), 'C');
    RETURN NEW;
END;
$$;

CREATE TRIGGER emails_search_vector_trigger
    BEFORE INSERT OR UPDATE OF subject, snippet, body_text
    ON emails
    FOR EACH ROW EXECUTE FUNCTION emails_search_vector_update();

-- HNSW vector index for semantic search
CREATE INDEX idx_emails_embedding ON emails
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- GIN index for full-text search
CREATE INDEX idx_emails_search_vector ON emails USING GIN (search_vector);

-- RLS
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all emails"
  ON emails FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage emails"
  ON emails FOR ALL TO authenticated USING (true) WITH CHECK (true);
