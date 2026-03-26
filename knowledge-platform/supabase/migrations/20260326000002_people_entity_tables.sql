-- Sprint 02 Task 2: People & entity tables
-- Tables: people, people_skills, people_projects, projects

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
    UNIQUE(person_id, skill)
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

-- HNSW indexes
CREATE INDEX idx_people_embedding ON people
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_projects_embedding ON projects
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
