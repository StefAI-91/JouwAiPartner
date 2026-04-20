# Sprint Q1b — Schema Consolidatie (Execution)

**Type:** Uitvoeringssprint — alleen starten na Q1a
**Blokkade:** Q1a spike-rapport `docs/specs/schema-audit.md` moet bestaan en beslissingen moeten goedgekeurd zijn
**Area:** `supabase/migrations/`, `packages/database/`, `packages/ai/pipeline/`, `packages/mcp/tools/`
**Priority:** Hoog — pas zinvol na Q1a

## Doel

Voer de beslissingen uit Q1a uit. Per beslissing een genummerde taakgroep. Geen eigen aannames toevoegen; valt iets niet onder een Q1a-beslissing, dan terug naar spike.

## Context

Taken hieronder verwijzen naar beslissingen A/B/C/D uit `docs/specs/schema-audit.md`. Vervang placeholders (`<beslissing A>`, etc.) met de werkelijke keuze zodra Q1a klaar is.

## Taken

### Q1b-1: Pre-merge schema-uitlijning (afhankelijk van A)

Als beslissing A = unificeren:

- [ ] Migratie: voeg ontbrekende kolommen aan `extractions` toe (`verification_status`, `verified_by`, `verified_at` indien nog niet aanwezig volgens Q1a)
- [ ] Migratie: uitbreiden type-CHECK constraint naar de 6 types (decision, action_item, need, insight, project_update, request)
- [ ] Migratie: voeg `follow_up_context`, `reasoning` asymmetrische kolommen nullable toe aan `email_extractions` of verwijder ze uit `extractions` — per Q1a-aanbeveling

### Q1b-2: RPC-aanpassingen (afhankelijk van A)

- [ ] Update `verify_meeting()` RPC om `source_type`/`source_id` te accepteren
- [ ] Zelfde voor andere RPC's genoemd in Q1a-3
- [ ] Schrijf tests voor beide source-types (meeting + email)

### Q1b-3: Data-migratie (afhankelijk van A + D)

- [ ] Migratie-stap 1: voeg `source_type`, `source_id` toe aan `extractions`, backfill bestaande rijen als `meeting`
- [ ] Migratie-stap 2: kopieer rijen uit `email_extractions` → `extractions` met `source_type='email'`
- [ ] Per rollback-strategie uit D: ofwel maak `email_extractions` een VIEW op `extractions`, ofwel drop in latere migratie na verificatie

### Q1b-4: Index-strategie (afhankelijk van Q1a-3)

- [ ] Drop oude pgvector-indexen op beide tabellen
- [ ] Bouw nieuwe HNSW-index op merged `extractions.embedding`
- [ ] Meet query-performance voor en na

### Q1b-5: Query/mutation consolidatie

- [ ] `packages/database/src/queries/extractions.ts` — unificeer naar één `listExtractions({ source_type?, source_id? })`
- [ ] `packages/database/src/mutations/extractions.ts` — `insertExtractions()` vereist `source_type` + `source_id`
- [ ] Verwijder `queries/email-extractions.ts` en corresponderende mutations
- [ ] Update callers uit Q1a-2 inventaris — elk gedocumenteerd bestand

### Q1b-6: MCP-tools bijwerken

Per Q1a-2 bevatten deze MCP-tools directe verwijzingen:

- [ ] `packages/mcp/src/tools/actions.ts`
- [ ] `packages/mcp/src/tools/decisions.ts`
- [ ] `packages/mcp/src/tools/meetings.ts`
- [ ] `packages/mcp/src/tools/correct-extraction.ts`
- [ ] `packages/mcp/src/tools/get-organization-overview.ts`
- [ ] `packages/mcp/src/tools/write-client-updates.ts`
- [ ] (Lijst aanvullen op basis van Q1a-2)

### Q1b-7: Experimental risk afhandelen (afhankelijk van B)

Per Q1a-beslissing B:

- [ ] Optie verwijderen: drop-migratie + `risk-specialist.ts` schrijft alleen naar `extractions`
- [ ] Optie formaliseren: hernoem naar `risk_signals`, RLS toevoegen, README-entry, code-comment bijwerken
- [ ] Update comment in `packages/ai/src/pipeline/steps/risk-specialist.ts:32-36` die nu ten onrechte "A/B-experiment" zegt

### Q1b-8: Audit-laag (afhankelijk van C)

Alleen als C = centrale tabel:

- [ ] Migratie `content_audit_log` met RLS
- [ ] Backfill uit bestaande `verified_by/at`, `corrected_by/at` kolommen
- [ ] Mutation-helpers `logVerification()`, `logCorrection()`
- [ ] Latere migratie: drop oude kolommen

### Q1b-9: Raw JSONB afhandelen (afhankelijk van Q1a-5)

Alleen als meting rechtvaardigt:

- [ ] Nieuwe tabel `meeting_raw_sources` met `meeting_id` FK
- [ ] Migratie kopieert data, drop kolommen uit `meetings`
- [ ] Update `meetings` SELECT-lijsten om de blobs niet standaard te laden

### Q1b-10: Tests bijwerken

Per Q1a-2 lijst met breaking tests:

- [ ] Update `packages/database/__tests__/mutations/emails.test.ts` en andere
- [ ] Update `packages/ai/__tests__/pipeline/email-pipeline.test.ts`
- [ ] Verifieer dat alle tests nog gedrag testen (geen implementatie)

## Afronding

- [ ] Alle migraties op staging getest, rollback-pad doorlopen
- [ ] `npm run type-check` en `npm run test` groen
- [ ] `docs/dependency-graph.md` geregenereerd
- [ ] `docs/specs/schema-audit.md` bijgewerkt met "executed" markers per beslissing
- [ ] CLAUDE.md "Tasks System" sectie bijgewerkt indien structuur verandert
