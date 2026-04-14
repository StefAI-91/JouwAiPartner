-- Sprint 032: Administratie datamodel
-- Uitbreiding van organizations.type CHECK constraint met 'advisor' en 'internal'
-- Covered requirements: DATA-054, DATA-055, DATA-056, DATA-057

-- =============================================================================
-- 1. CHECK constraint vervangen: 'advisor' + 'internal' toevoegen aan allowed set
-- =============================================================================
-- Oude set: ('client', 'partner', 'supplier', 'other')
-- Nieuwe set: ('client', 'partner', 'supplier', 'advisor', 'internal', 'other')
-- 'advisor'  = externe adviseurs (boekhouder, fiscalist, jurist, notaris)
-- 'internal' = eigen bedrijfsentiteit (Jouw AI Partner / Flowwijs)

ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_type_check;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_type_check
  CHECK (type IN ('client', 'partner', 'supplier', 'advisor', 'internal', 'other'));

-- =============================================================================
-- 2. Flowwijs (eigen bedrijf) van 'other' naar 'internal'
-- =============================================================================
-- Idempotent: UPDATE doet niets als de rij al 'internal' is of niet bestaat.

UPDATE organizations
  SET type = 'internal',
      updated_at = NOW()
  WHERE id = 'a0000000-0000-0000-0000-000000000001'
    AND type = 'other';
