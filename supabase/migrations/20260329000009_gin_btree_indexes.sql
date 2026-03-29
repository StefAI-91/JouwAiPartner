-- Sprint 002 — Migratie 9: GIN + B-tree indexes
-- DATA-046, DATA-047, DATA-048, DATA-049

-- GIN indexes for full-text search on tsvector columns
CREATE INDEX idx_meetings_search_vector_gin
    ON meetings USING gin (search_vector);

CREATE INDEX idx_extractions_search_vector_gin
    ON extractions USING gin (search_vector);

-- B-tree indexes on foreign keys
CREATE INDEX idx_projects_organization_id
    ON projects (organization_id);

CREATE INDEX idx_meetings_organization_id
    ON meetings (organization_id);

CREATE INDEX idx_meetings_fireflies_id
    ON meetings (fireflies_id);

CREATE INDEX idx_meeting_projects_project_id
    ON meeting_projects (project_id);

CREATE INDEX idx_meeting_participants_person_id
    ON meeting_participants (person_id);

CREATE INDEX idx_extractions_meeting_id
    ON extractions (meeting_id);

CREATE INDEX idx_extractions_organization_id
    ON extractions (organization_id);

CREATE INDEX idx_extractions_project_id
    ON extractions (project_id);

CREATE INDEX idx_extractions_type
    ON extractions (type);

-- B-tree indexes on commonly filtered columns
CREATE INDEX idx_meetings_date
    ON meetings (date DESC);

CREATE INDEX idx_people_embedding_stale
    ON people (embedding_stale) WHERE embedding_stale = TRUE;

CREATE INDEX idx_projects_embedding_stale
    ON projects (embedding_stale) WHERE embedding_stale = TRUE;

CREATE INDEX idx_meetings_embedding_stale
    ON meetings (embedding_stale) WHERE embedding_stale = TRUE;

CREATE INDEX idx_extractions_embedding_stale
    ON extractions (embedding_stale) WHERE embedding_stale = TRUE;
