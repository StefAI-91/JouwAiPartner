-- Seed data: Organizations, People, Projects
-- Idempotent: ON CONFLICT DO UPDATE
-- Run via: psql -f supabase/seed/seed.sql

-- =============================================================================
-- Organizations
-- =============================================================================
INSERT INTO organizations (id, name, aliases, type, contact_person, email, status)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'JouwAiPartner', ARRAY['JAP', 'Jouw AI Partner'], 'other', 'Stefan', 'stefan@jouwaipartner.nl', 'active'),
    ('a0000000-0000-0000-0000-000000000002', 'TechVentures BV', ARRAY['TechVentures', 'TV'], 'client', 'Mark de Vries', 'mark@techventures.nl', 'active'),
    ('a0000000-0000-0000-0000-000000000003', 'CreativeMinds Agency', ARRAY['CreativeMinds', 'CMA'], 'client', 'Lisa Jansen', 'lisa@creativeminds.nl', 'active'),
    ('a0000000-0000-0000-0000-000000000004', 'DataFlow Solutions', ARRAY['DataFlow'], 'partner', 'Pieter Bakker', 'pieter@dataflow.io', 'active'),
    ('a0000000-0000-0000-0000-000000000005', 'GreenEnergy Corp', ARRAY['GreenEnergy', 'GEC'], 'client', 'Anna de Groot', 'anna@greenenergy.nl', 'prospect')
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
INSERT INTO people (id, name, email, team, role)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Stefan', 'stefan@jouwaipartner.nl', 'leadership', 'founder'),
    ('b0000000-0000-0000-0000-000000000002', 'Mark de Vries', 'mark@techventures.nl', NULL, 'cto'),
    ('b0000000-0000-0000-0000-000000000003', 'Lisa Jansen', 'lisa@creativeminds.nl', NULL, 'creative director'),
    ('b0000000-0000-0000-0000-000000000004', 'Pieter Bakker', 'pieter@dataflow.io', NULL, 'lead engineer'),
    ('b0000000-0000-0000-0000-000000000005', 'Anna de Groot', 'anna@greenenergy.nl', NULL, 'sustainability manager'),
    ('b0000000-0000-0000-0000-000000000006', 'Tom Hendriks', 'tom@jouwaipartner.nl', 'engineering', 'developer'),
    ('b0000000-0000-0000-0000-000000000007', 'Eva Willems', 'eva@jouwaipartner.nl', 'marketing', 'marketing lead')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    team = EXCLUDED.team,
    role = EXCLUDED.role,
    updated_at = NOW();

-- =============================================================================
-- Projects
-- =============================================================================
INSERT INTO projects (id, name, aliases, organization_id, status)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'AI Kennisplatform', ARRAY['Kennisplatform', 'Knowledge Platform'], 'a0000000-0000-0000-0000-000000000001', 'active'),
    ('c0000000-0000-0000-0000-000000000002', 'TechVentures Portal', ARRAY['TV Portal', 'Klantenportaal TV'], 'a0000000-0000-0000-0000-000000000002', 'active'),
    ('c0000000-0000-0000-0000-000000000003', 'Brand Refresh CMA', ARRAY['CMA Rebrand'], 'a0000000-0000-0000-0000-000000000003', 'active'),
    ('c0000000-0000-0000-0000-000000000004', 'Data Pipeline Integratie', ARRAY['Pipeline', 'ETL Project'], 'a0000000-0000-0000-0000-000000000004', 'active'),
    ('c0000000-0000-0000-0000-000000000005', 'GreenEnergy Dashboard', ARRAY['GEC Dashboard'], 'a0000000-0000-0000-0000-000000000005', 'lead')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    aliases = EXCLUDED.aliases,
    organization_id = EXCLUDED.organization_id,
    status = EXCLUDED.status,
    updated_at = NOW();
