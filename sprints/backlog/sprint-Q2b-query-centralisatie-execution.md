# Sprint Q2b — Query Centralisatie (Execution)

**Type:** Uitvoeringssprint — alleen starten na Q2a
**Blokkade:** Q2a spike-rapport `docs/specs/query-inventory.md` moet bestaan en beslissingen moeten goedgekeurd zijn
**Area:** `apps/*/src/actions/`, `apps/*/src/app/`, `packages/database/`
**Priority:** Hoog

## Doel

Elimineer alle directe Supabase-calls uit `apps/*` die per Q2a-inventaris in scope vallen. Zet de gekozen lint/check-tool live zodat regressies geblokkeerd worden.

## Context

Alle aantallen en lijsten komen uit `docs/specs/query-inventory.md` (Q2a). Deze sprint voegt geen nieuwe aannames toe.

## Taken

### Q2b-1: Nieuwe helpers bouwen

Op basis van Q2a-3 hergebruik-matrix, bouw ontbrekende helpers:

- [ ] Functies in `packages/database/src/mutations/meetings.ts` voor operaties die nu direct gebeuren in `meeting-pipeline.ts`
- [ ] Nieuw `packages/database/src/mutations/slack-config.ts` (als Q2a bevestigt dat dit ontbreekt)
- [ ] Functies in `packages/database/src/queries/projects.ts` voor devhub-classify
- [ ] Functies in `packages/database/src/queries/emails.ts` voor filter-logica + geëxporteerde `parseDirection`, `parseFilterStatus`
- [ ] Elke nieuwe helper krijgt docstring over client-scope per beleid uit Q2a-5

### Q2b-2: Transactie-flows

Voor flows die per Q2a-4 atomair moeten blijven:

- [ ] Schrijf Postgres-functies of RPC's (in `supabase/migrations/`) die de flow server-side atomair maken
- [ ] Vervang sequentiële calls door één `.rpc()` aanroep
- [ ] Voeg test toe die verifieert dat partial-failure niet tot inconsistente staat leidt

### Q2b-3: Server Actions migreren

Voor elk bestand uit Q2a-2 met categorie "Server Action":

- [ ] Vervang directe `.from()` door helper-aanroep
- [ ] Behoud bestaande Zod validatie en `revalidatePath`
- [ ] Controleer `{ success, data }` / `{ error }` contract ongewijzigd

### Q2b-4: API Routes (indien in scope per Q2a-8)

- [ ] Migreer `app/api/ingest/reprocess/route.ts`
- [ ] Migreer `app/api/ingest/backfill-sentences/route.ts`
- [ ] Migreer `app/api/email/reclassify/route.ts`
- [ ] Auth-callback routes expliciet gedocumenteerd als uitzondering

### Q2b-5: Server Components (indien in scope per Q2a-8)

- [ ] Migreer per bestand uit de 26-lijst
- [ ] Focus op pages in `apps/cockpit/src/app/(dashboard)/` en `apps/devhub/src/app/`
- [ ] Bepaal: direct importeren van helpers of via page-local loader-functies

### Q2b-6: Lint / check-tool activeren

Per Q2a-6 keuze:

- [ ] Implementeer gekozen optie (ESLint-rule, bash-check, of Husky-hook)
- [ ] Test regressie: voeg tijdelijk fout terug → check blokkeert
- [ ] Documenteer hoe een bewuste uitzondering te markeren

### Q2b-7: README en CLAUDE.md bijwerken

- [ ] `packages/database/README.md` (komt uit Q4b) — beschrijf client-scope beleid uit Q2a-5
- [ ] CLAUDE.md "Database & Queries" sectie — verwijs naar check-tool uit Q2b-6
- [ ] `docs/specs/query-inventory.md` markeren als "executed"

## Afronding

- [ ] Grep-count `.from(` in `apps/*/src/` buiten API-callbacks = 0 (of gelijk aan goedgekeurde uitzonderingen)
- [ ] Check-tool blokkeert nieuwe overtredingen in CI of pre-commit
- [ ] Alle tests groen
- [ ] Dependency-graph geregenereerd
