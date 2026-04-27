-- CP-006 (SCHEMA-V1-01) — voeg client-facing vertaalkolommen toe aan `issues`.
--
-- De v1 client portal toont per issue een klantvriendelijke titel +
-- beschrijving die door DevHub-redacteuren handmatig worden gevuld. Beide
-- kolommen zijn NULL-baar zonder DEFAULT: de UI/query-laag valt terug op de
-- interne `title`/`description` wanneer de vertaling leeg is. Zie
-- docs/specs/prd-client-portal/06-data-model.md.
--
-- Idempotent: gebruikt IF NOT EXISTS zodat herhaaldelijk draaien geen errors
-- oplevert. Geen RLS-wijziging — bestaande role-aware policies uit
-- 20260418110000_issues_rls_client_hardening.sql blijven schrijfregels bewaken.

ALTER TABLE issues ADD COLUMN IF NOT EXISTS client_title TEXT;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS client_description TEXT;

COMMENT ON COLUMN issues.client_title IS
  'CP-006 — Klantvriendelijke titel voor het portal. NULL = portal valt terug op `title` (PRD §6).';
COMMENT ON COLUMN issues.client_description IS
  'CP-006 — Klantvriendelijke beschrijving voor het portal. NULL = portal valt terug op `description` (PRD §6).';
