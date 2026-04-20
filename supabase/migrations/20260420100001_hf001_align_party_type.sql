-- HF-001: Align party_type CHECK constraints on meetings + emails
--
-- Beide tabellen krijgen exact dezelfde 8-waarden enum zodat drift
-- structureel voorkomen wordt. De contract-test
-- `packages/database/__tests__/party-type-drift.test.ts` verifieert
-- dat de sets blijven matchen met `PARTY_TYPES` uit
-- `@repo/ai/validations/communication`.
--
-- Oude sets:
--   meetings.party_type (from 20260329000005_meetings.sql):
--     ('client', 'partner', 'internal', 'other')  -- 4 waardes
--   emails.party_type (from 20260408000009_email_type_party_type.sql):
--     ('internal', 'client', 'accountant', 'tax_advisor', 'lawyer', 'partner', 'other')  -- 7 waardes
--
-- Nieuwe set (beide tabellen):
--   ('internal', 'client', 'partner', 'accountant', 'tax_advisor', 'lawyer', 'advisor', 'other')
--   -- 8 waardes. `supplier` zit ALLEEN in organizations.type, niet in party_type.
--
-- Geen data-migratie nodig: bestaande rijen vallen altijd binnen de nieuwe set
-- (die is strikt een superset van beide oude sets).

-- =============================================================================
-- meetings.party_type
-- =============================================================================

ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_party_type_check;

ALTER TABLE meetings ADD CONSTRAINT meetings_party_type_check CHECK (
    party_type IS NULL OR party_type IN (
        'internal', 'client', 'partner',
        'accountant', 'tax_advisor', 'lawyer', 'advisor',
        'other'
    )
);

-- =============================================================================
-- emails.party_type
-- =============================================================================

ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_party_type_check;

ALTER TABLE emails ADD CONSTRAINT emails_party_type_check CHECK (
    party_type IS NULL OR party_type IN (
        'internal', 'client', 'partner',
        'accountant', 'tax_advisor', 'lawyer', 'advisor',
        'other'
    )
);
