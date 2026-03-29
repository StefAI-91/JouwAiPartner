-- Sprint 002 — Migratie 8: HNSW vector indexes (1024-dim)
-- DATA-042, DATA-043, DATA-044, DATA-045

-- HNSW indexes for vector similarity search on embedding columns
-- Using cosine distance operator (<=>)
-- m=16, ef_construction=64 are good defaults for datasets < 100k rows

CREATE INDEX idx_people_embedding_hnsw
    ON people USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_projects_embedding_hnsw
    ON projects USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_meetings_embedding_hnsw
    ON meetings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_extractions_embedding_hnsw
    ON extractions USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
