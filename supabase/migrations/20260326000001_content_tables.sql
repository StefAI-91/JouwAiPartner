-- Enable pgvector extension (must run before any VECTOR columns)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Sprint 02 Task 1: Content tables with vector columns and HNSW indexes
-- Tables: documents, meetings, slack_messages, emails

-- Google Docs content (chunked)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    embedding_stale BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    relevance_score FLOAT,
    sensitivity TEXT DEFAULT 'open',
    status TEXT DEFAULT 'active',
    category TEXT[],
    last_reviewed TIMESTAMP,
    source_exists BOOLEAN DEFAULT TRUE,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Fireflies meeting transcripts
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fireflies_id TEXT UNIQUE,
    title TEXT,
    date TIMESTAMP,
    participants TEXT[],
    summary TEXT,
    action_items JSONB,
    transcript TEXT,
    embedding VECTOR(1536),
    embedding_stale BOOLEAN DEFAULT FALSE,
    relevance_score FLOAT,
    sensitivity TEXT DEFAULT 'open',
    status TEXT DEFAULT 'active',
    category TEXT[],
    last_reviewed TIMESTAMP,
    source_exists BOOLEAN DEFAULT TRUE,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Slack threads (aggregated)
CREATE TABLE slack_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel TEXT,
    thread_id TEXT,
    author TEXT,
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    embedding_stale BOOLEAN DEFAULT FALSE,
    relevance_score FLOAT,
    sensitivity TEXT DEFAULT 'open',
    status TEXT DEFAULT 'active',
    category TEXT[],
    last_reviewed TIMESTAMP,
    source_exists BOOLEAN DEFAULT TRUE,
    review_notes TEXT,
    slack_event_id TEXT,
    timestamp TIMESTAMP
);

-- Email messages
CREATE TABLE emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT,
    sender TEXT,
    recipients TEXT[],
    body TEXT NOT NULL,
    embedding VECTOR(1536),
    embedding_stale BOOLEAN DEFAULT FALSE,
    thread_id TEXT,
    relevance_score FLOAT,
    sensitivity TEXT DEFAULT 'open',
    status TEXT DEFAULT 'active',
    category TEXT[],
    last_reviewed TIMESTAMP,
    source_exists BOOLEAN DEFAULT TRUE,
    review_notes TEXT,
    gmail_id TEXT UNIQUE,
    date TIMESTAMP
);

-- HNSW indexes for vector similarity search
CREATE INDEX idx_documents_embedding ON documents
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_meetings_embedding ON meetings
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_slack_messages_embedding ON slack_messages
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_emails_embedding ON emails
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
