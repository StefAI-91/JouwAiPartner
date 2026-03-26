# Sprint 02: Core Database Schema

**Phase:** 1 — Foundation
**Requirements:** REQ-1000–REQ-1012
**Depends on:** Sprint 01 (Supabase project exists, pgvector enabled)
**Produces:** All database tables created with correct types, indexes, and defaults

---

## Task 1: Create content tables

**What:** Create the 4 source-specific content tables with vector columns and HNSW indexes.

```sql
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
    sensitivity TEXT DEFAULT 'open',    -- 'open', 'restricted'
    status TEXT DEFAULT 'active',       -- 'active', 'quarantined', 'archived'
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
    fireflies_id TEXT UNIQUE,           -- external ID for idempotency
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
    slack_event_id TEXT,                -- for idempotency
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
    gmail_id TEXT UNIQUE,               -- for idempotency
    date TIMESTAMP
);
```

**Create HNSW indexes** (use HNSW, not IVFFlat — works on empty tables, better recall):
```sql
CREATE INDEX idx_documents_embedding ON documents
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_meetings_embedding ON meetings
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_slack_messages_embedding ON slack_messages
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_emails_embedding ON emails
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
```

**Why HNSW over IVFFlat:**
- Can be created on empty tables (IVFFlat needs data first)
- Better query accuracy (recall)
- Faster queries at the cost of slower index builds (fine for <1M rows)

**Technical note on `vector_cosine_ops`:** The `<=>` operator returns cosine *distance* (0 = identical). To get similarity: `1 - (a <=> b)`.

---

## Task 2: Create people & entity tables

**What:** Create the people graph: people, skills, project involvement, and projects.

```sql
CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    team TEXT,
    role TEXT,
    embedding VECTOR(1536),
    embedding_stale BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE people_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    evidence_count INT DEFAULT 1,
    last_seen TIMESTAMP DEFAULT NOW(),
    source_ids JSONB DEFAULT '[]',
    UNIQUE(person_id, skill)            -- one row per person+skill, increment evidence_count
);

CREATE TABLE people_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    project TEXT NOT NULL,
    role_in_project TEXT,
    last_mentioned TIMESTAMP DEFAULT NOW(),
    source_ids JSONB DEFAULT '[]',
    UNIQUE(person_id, project)
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    aliases TEXT[] DEFAULT '{}',
    client TEXT,
    status TEXT DEFAULT 'active',
    embedding VECTOR(1536),
    embedding_stale BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_people_embedding ON people
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_projects_embedding ON projects
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
```

**Design decisions:**
- `UNIQUE(person_id, skill)` prevents duplicate skill rows — on conflict, increment `evidence_count`
- `ON DELETE CASCADE` keeps referential integrity clean
- `aliases TEXT[]` on projects allows fuzzy entity matching during ingestion

---

## Task 3: Create structured extraction + system tables

**What:** Decisions, action items, audit trail, and insights.

```sql
CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision TEXT NOT NULL,
    context TEXT,
    source_type TEXT NOT NULL,       -- 'meeting', 'document', 'slack', 'email'
    source_id UUID NOT NULL,
    made_by TEXT,
    date TIMESTAMP,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    assignee TEXT,
    due_date DATE,
    status TEXT DEFAULT 'open',      -- 'open', 'in_progress', 'done'
    source_type TEXT NOT NULL,
    source_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE content_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL,
    content_table TEXT NOT NULL,      -- 'documents', 'meetings', 'slack_messages', 'emails'
    agent_role TEXT NOT NULL,         -- 'gatekeeper', 'curator', 'analyst'
    action TEXT NOT NULL,             -- 'admitted', 'rejected', 'quarantined', 'merged', 'archived'
    reason TEXT,
    metadata JSONB,                  -- scores, categories, any extra data
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    supporting_sources JSONB DEFAULT '[]',  -- [{source_type, source_id}]
    topic TEXT,
    dispatched BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Useful indexes for common queries
CREATE INDEX idx_action_items_assignee ON action_items(assignee);
CREATE INDEX idx_action_items_status ON action_items(status);
CREATE INDEX idx_decisions_source ON decisions(source_type, source_id);
CREATE INDEX idx_content_reviews_content ON content_reviews(content_id, content_table);
CREATE INDEX idx_content_reviews_agent ON content_reviews(agent_role);
```

---

## Task 4: Create vector similarity search functions

**What:** SQL functions that the MCP server and agents will call for semantic search.

```sql
-- Generic match function for any content table
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

-- Cross-table search (searches all content tables)
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

-- People search by embedding
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
```

**Technical note:** The `ORDER BY d.embedding <=> query_embedding` (distance ascending) ensures the HNSW index is used. If you order by the computed similarity DESC, Postgres may not use the index.

---

## Verification

- [ ] All tables exist: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
- [ ] Vector columns work: `SELECT embedding FROM documents LIMIT 1;` (should return NULL, not error)
- [ ] HNSW indexes exist: `SELECT indexname FROM pg_indexes WHERE tablename = 'documents';`
- [ ] RPC functions work: `SELECT * FROM search_all_content('[0,0,...,0]'::vector(1536), 0.0, 1);`
- [ ] Unique constraints work: try inserting duplicate `fireflies_id` in meetings (should fail)
