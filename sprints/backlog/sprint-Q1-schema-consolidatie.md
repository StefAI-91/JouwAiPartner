# Sprint Q1 — Schema Consolidatie

**Area:** Database (`supabase/migrations/`, `packages/database/src/`)
**Priority:** Hoog — voorkomt dat elke nieuwe feature opnieuw duplicate kolommen aanmaakt
**Aanleiding:** Schema-sprawl onderzoek (2026-04-20): 101 migraties in 3 weken, 4 tabellen (`meetings`, `emails`, `extractions`, `email_extractions`) dragen bijna-identieke verification-kolommen; `extractions` en `email_extractions` zijn bijna-duplicate tabellen; `experimental_risk_extractions` is een parallelle schaduw-tabel.

## Doel

Elimineer duplicate kolommen en parallelle tabellen door één consistente audit- en extraction-laag. Na deze sprint is er één plek per concept, één migratie-pad per wijziging, en één set queries/mutations.

## Context

**Bewijs uit onderzoek:**

- `extractions` en `email_extractions` delen deze kolommen: `id`, `type`, `content`, `confidence`, `metadata`, `organization_id`, `project_id`, `embedding` (1024D), `embedding_stale`, `verification_status`, `verified_by`, `verified_at`, `corrected_by`, `corrected_at`. Types overlappen volledig op `decision`, `action_item`, `need`, `insight`; email voegt `project_update`, `request` toe.
- `meetings` en `emails` dragen allebei: `embedding`, `embedding_stale`, `verification_status`, `verified_by`, `verified_at`, `rejection_reason` (alleen emails).
- `experimental_risk_extractions` schrijft parallel aan `extractions` vanuit `risk-specialist.ts`. Geen verificatie-gate, geen UI. Doel onduidelijk.
- Migratie-log toont 13× `ALTER TABLE meetings ADD COLUMN` verspreid over 7 migraties (20260402–20260416).

## Taken

### Q1-1: Beslissingsdocument

**Bestand:** `docs/specs/schema-consolidation-decisions.md`

- [ ] Beslissing A: één `extractions` tabel met `source_type: 'meeting'|'email'` en `source_id uuid` vs aparte tabellen behouden. Onderbouw met query-patronen (hoe vaak worden ze samen geraadpleegd?).
- [ ] Beslissing B: `experimental_risk_extractions` → samenvoegen, hernoemen, of verwijderen. Check eerst welke code er nog van leest.
- [ ] Beslissing C: audit-kolommen (`verified_by/at`, `corrected_by/at`) los laten vs centrale `content_audit_log` tabel (`target_table`, `target_id`, `actor_id`, `action`, `at`).
- [ ] Publiceer keuzes voordat code verandert; laat Stef goedkeuren.

### Q1-2: Migratie — extractions unificatie (afhankelijk van Q1-1 beslissing A)

**Bestand:** `supabase/migrations/YYYYMMDDHHMMSS_merge_extractions.sql`

- [ ] Voeg `source_type`, `source_id` toe aan `extractions`
- [ ] Migreer rijen uit `email_extractions` naar `extractions` met `source_type: 'email'`
- [ ] Update FK's in `summaries`, `tasks` en queries
- [ ] Drop `email_extractions` tabel pas in volgende migratie (2-staps)
- [ ] Update `packages/database/src/types/database.ts` via `npm run db:types`

### Q1-3: Mutations/queries consolideren

- [ ] `packages/database/src/queries/extractions.ts` — één `listExtractions({ source_type?, source_id? })` ipv twee functies
- [ ] `packages/database/src/mutations/extractions.ts` — één `insertExtractions()` die source-velden vereist
- [ ] Update alle callers in `packages/ai/src/pipeline/` en `apps/cockpit/src/actions/`
- [ ] Verwijder `packages/database/src/queries/email-extractions.ts` + mutations

### Q1-4: Experimental risk table afhandelen (afhankelijk van Q1-1 beslissing B)

- [ ] Optie "verwijderen": migratie die tabel dropt, `risk-specialist.ts` schrijft alleen naar `extractions`
- [ ] Optie "formaliseren": hernoem naar `risk_signals`, documenteer doel in `packages/database/README.md`, voeg RLS toe

### Q1-5: Audit-laag (afhankelijk van Q1-1 beslissing C)

Alleen als beslissing = centrale audit-tabel:

- [ ] Migratie `content_audit_log` met RLS
- [ ] Backfill vanuit bestaande `verified_by/at` en `corrected_by/at` kolommen
- [ ] Mutation helpers `logVerification()`, `logCorrection()`
- [ ] In nieuwe migratie: drop kolommen uit `meetings`, `emails`, `extractions`

### Q1-6: Raw JSONB blobs evalueren

- [ ] Meet queryfrequentie van `meetings.raw_fireflies` en `raw_elevenlabs` (grep door queries/)
- [ ] Als ongebruikt in queries: verplaats naar `meeting_raw_sources` tabel met `meeting_id` FK
- [ ] Haal uit main `meetings` SELECT-lijst om full-text performance te verbeteren

## Afronding

- [ ] `npm run type-check` groen
- [ ] Bestaande tests in `packages/database/__tests__/` en `packages/ai/__tests__/` groen
- [ ] `docs/dependency-graph.md` geregenereerd (`npm run dep-graph`)
- [ ] Beslissingsdocument uit Q1-1 verwijst naar uitgevoerde migraties
- [ ] `CLAUDE.md` sectie "Tasks System" bijgewerkt als extractions-structuur verandert
