-- Sprint 001 — Migratie 4: Organizations, people, projects
-- DATA-005..020

-- Organizations
-- DATA-005, DATA-006, DATA-007, DATA-008, DATA-009, DATA-010
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    aliases TEXT[] DEFAULT '{}',
    type TEXT NOT NULL DEFAULT 'other',
    contact_person TEXT,
    email TEXT,
    status TEXT DEFAULT 'prospect',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT organizations_type_check CHECK (type IN ('client', 'partner', 'supplier', 'other')),
    CONSTRAINT organizations_status_check CHECK (status IN ('prospect', 'active', 'inactive'))
);

-- People
-- DATA-011, DATA-012, DATA-013, DATA-014
CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    team TEXT,
    role TEXT,
    embedding VECTOR(1024),
    embedding_stale BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
-- DATA-015, DATA-016, DATA-017, DATA-018, DATA-019, DATA-020
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    aliases TEXT[] DEFAULT '{}',
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'lead',
    embedding VECTOR(1024),
    embedding_stale BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
