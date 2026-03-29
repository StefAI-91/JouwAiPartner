-- Sprint 001 — Migratie 6: Koppeltabellen
-- DATA-031, DATA-032

-- Meeting <-> Project (many-to-many)
CREATE TABLE meeting_projects (
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (meeting_id, project_id)
);

-- Meeting <-> Person (many-to-many)
CREATE TABLE meeting_participants (
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (meeting_id, person_id)
);
