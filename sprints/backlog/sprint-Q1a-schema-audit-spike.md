# Sprint Q1a — Schema Audit (Spike)

**Type:** Spike — alleen onderzoek, geen code-wijzigingen
**Duur:** 1-2 uur
**Area:** `supabase/migrations/`, `packages/database/`, `packages/mcp/`, `packages/ai/`
**Priority:** Blokkeert Q1b
**Aanleiding:** Review van schema-onderzoek (2026-04-20) onthulde meerdere foute aannames in de oorspronkelijke Q1-sprint (verificatie-kolommen bestaan niet waar gedacht, type-constraints verschillen, callers in MCP genegeerd, experimental-table is productie geworden). Voor we schema-werk doen, moet de feitelijke situatie eerst vastliggen.

## Doel

Produceer één rapport `docs/specs/schema-audit.md` dat als enige bron van waarheid dient voor Q1b. Geen migraties, geen code. Alleen feiten + beslissingen.

## Taken

### Q1a-1: Tabel-diff `extractions` vs `email_extractions`

- [ ] Exporteer alle kolommen uit beide tabellen (uit latest migratie-staat)
- [ ] Tabel-diff: kolom voor kolom (naam, type, default, nullable, check-constraints)
- [ ] Documenteer welke kolommen asymmetrisch zijn, inclusief recent toegevoegde (`follow_up_context`, `reasoning`, `verification_status`)
- [ ] Vergelijk type-CHECK constraints (`extractions` heeft 4, `email_extractions` 6 types)

### Q1a-2: Volledige callers-inventaris

- [ ] Grep `"extractions"` en `"email_extractions"` (als tabelnaam) in de hele repo
- [ ] Lijst per bestand: read of write, regel, doel
- [ ] Expliciet checken: `packages/mcp/src/tools/*`, `packages/ai/src/pipeline/*`, `packages/database/src/queries/`, `/mutations/`, `apps/cockpit/src/actions/`, tests
- [ ] Vergelijkbaar voor `experimental_risk_extractions`

### Q1a-3: RPC en index-inventaris

- [ ] Lijst alle RPC-functies uit migraties die deze tabellen raken (`verify_meeting`, etc.) — welke filter-kolommen gebruiken ze?
- [ ] Lijst alle indexen (HNSW pgvector, btree) op beide tabellen
- [ ] Bepaal wat er moet gebeuren met indexen bij een merge (rebuild-plan)

### Q1a-4: Status `experimental_risk_extractions`

- [ ] Grep alle callers + migraties voor deze tabel
- [ ] Bepaal: experiment (nog actief?), productie-audit (formaliseren?), of dood (verwijderen?)
- [ ] Check de RLS-status (hij heeft er nu geen)

### Q1a-5: Raw JSONB metingen

- [ ] Meet queryfrequentie van `meetings.raw_fireflies`, `meetings.raw_elevenlabs` — in hoeveel queries worden ze geselecteerd?
- [ ] Grootte-schatting: gemiddelde payload-size, totaal opgeslagen (query op pg_stats of pg_table_size)
- [ ] Beoordeel of verplaatsing naar aparte tabel de moeite waard is

### Q1a-6: Drie concrete beslissingen vastleggen

In rapport `docs/specs/schema-audit.md`, sectie "Decisions":

- [ ] **A. Extractions-unificatie:** samenvoegen (met `source_type`/`source_id` kolommen) vs aparte tabellen behouden — met argumenten
- [ ] **B. Experimental risk:** verwijderen / formaliseren / behouden — met argumenten
- [ ] **C. Audit-kolommen:** los houden per tabel vs `content_audit_log` tabel — met argumenten
- [ ] **D. Rollback-strategie:** twee-staps migratie vs backwards-compat VIEW op oude tabel

## Output

**Bestand:** `docs/specs/schema-audit.md` met secties:

1. Tabel-diffs (feiten)
2. Callers (volledige lijst per tabel)
3. RPC's en indexen
4. JSONB blob-metingen
5. Beslissingen A/B/C/D met onderbouwing
6. Impact-lijst: bestanden die zullen breken bij elke beslissing

## Afronding

- [ ] Rapport gecommit op feature-branch
- [ ] Beslissingen door Stef goedgekeurd (comment op PR of ✓ in rapport)
- [ ] Q1b sprint kan starten met harde cijfers in plaats van aannames
