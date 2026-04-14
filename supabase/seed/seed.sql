-- Seed data: Organizations, People, Projects
-- Idempotent: ON CONFLICT DO UPDATE
-- Run via Supabase SQL Editor of: psql -f supabase/seed/seed.sql

-- =============================================================================
-- Organizations
-- =============================================================================
INSERT INTO organizations (id, name, aliases, type, contact_person, email, status)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Jouw AI Partner', ARRAY[]::TEXT[], 'internal', 'Stef Banninga', NULL, 'active'),
    ('a0000000-0000-0000-0000-000000000002', 'Ordus', ARRAY[]::TEXT[], 'client', 'Bart Nelissen', 'bartnelissen@ordus.nl', 'active'),
    ('a0000000-0000-0000-0000-000000000003', 'Effect op maat', ARRAY['Effect op Maat', 'EOM'], 'client', 'Fleur Timmerman', 'info@effectopmaat.nl', 'active')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    aliases = EXCLUDED.aliases,
    type = EXCLUDED.type,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    status = EXCLUDED.status,
    updated_at = NOW();

-- =============================================================================
-- People
-- =============================================================================
INSERT INTO people (id, name, email, team, role, organization_id)
VALUES
    -- Eigen team
    ('b0000000-0000-0000-0000-000000000001', 'Stef Banninga', 'stef@jouwaipartner.nl', 'leadership', 'mede-eigenaar', NULL),
    ('b0000000-0000-0000-0000-000000000002', 'Wouter van den Heuvel', 'wouter@jouwaipartner.nl', 'leadership', 'mede-eigenaar', NULL),
    ('b0000000-0000-0000-0000-000000000003', 'Ege', 'ege@jouwaipartner.nl', 'engineering', 'teamlid', NULL),
    ('b0000000-0000-0000-0000-000000000004', 'Tibor', NULL, NULL, 'partner', NULL),
    ('b0000000-0000-0000-0000-000000000005', 'Kenji', 'kenji@jouwaipartner.nl', 'engineering', 'outsource teamlid', NULL),
    ('b0000000-0000-0000-0000-000000000006', 'Myrrh', 'myrrh@jouwaipartner.nl', 'engineering', 'outsource teamlid', NULL),
    -- Klanten
    ('b0000000-0000-0000-0000-000000000007', 'Bart Nelissen', 'bartnelissen@ordus.nl', NULL, 'klant', 'a0000000-0000-0000-0000-000000000002'),
    ('b0000000-0000-0000-0000-000000000008', 'Fleur Timmerman', 'info@effectopmaat.nl', NULL, 'klant', 'a0000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    team = EXCLUDED.team,
    role = EXCLUDED.role,
    organization_id = EXCLUDED.organization_id,
    updated_at = NOW();

-- =============================================================================
-- Projects
-- =============================================================================
INSERT INTO projects (id, name, aliases, organization_id, status)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Ordus', ARRAY[]::TEXT[], 'a0000000-0000-0000-0000-000000000002', 'active'),
    ('c0000000-0000-0000-0000-000000000002', 'Fleur op zak', ARRAY['Fleur op Zak'], 'a0000000-0000-0000-0000-000000000003', 'active'),
    ('c0000000-0000-0000-0000-000000000003', 'HelperU', ARRAY['Helper U'], 'a0000000-0000-0000-0000-000000000001', 'active')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    aliases = EXCLUDED.aliases,
    organization_id = EXCLUDED.organization_id,
    status = EXCLUDED.status,
    updated_at = NOW();
