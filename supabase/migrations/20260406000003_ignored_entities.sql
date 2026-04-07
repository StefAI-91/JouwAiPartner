-- Sprint 020 — Migratie 3: ignored_entities tabel
-- DATA-083..085

CREATE TABLE ignored_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'organization', 'person')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, entity_name, entity_type)
);
