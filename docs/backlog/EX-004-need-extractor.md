# Micro Sprint EX-004: Need extractor

> **Scope:** Type-specialist agent voor `need` (behoefte). Bestaande `needs-scanner.ts` blijft draaien — we voegen meeting-level extractie toe.

## Doel

Needs structureel per-meeting extracten (zowel klant-needs als intern-team needs), met party/urgency/category-metadata. De bestaande nachtelijke `needs-scanner.ts` blijft werken; beide schrijven naar dezelfde `extractions` tabel met `type='need'` en coexisten.

## Requirements

| ID        | Beschrijving                                                              |
| --------- | ------------------------------------------------------------------------- |
| AI-E040   | Nieuwe agent `need-extractor.ts` (Sonnet) extract needs per meeting       |
| AI-E041   | Retourneert `party` (client/team/partner)                                 |
| AI-E042   | Retourneert `urgency` (nice_to_have/should_have/must_have)                |
| AI-E043   | Retourneert `category` (tooling/knowledge/capacity/process/client/other)  |
| AI-E044   | Prompt onderscheidt need van question (open vraag) en risk (dreiging)     |
| DATA-E040 | `need` toegevoegd aan type-enum (als nog niet aanwezig via needs-scanner) |
| FUNC-E050 | `need` in harness dropdown                                                |
| FUNC-E051 | Paneel "Behoeften" op project-werkblad, gesorteerd op urgency DESC        |
| FUNC-E052 | Toont party-badge (klant/team/partner)                                    |
| QUAL-E040 | Spot-check door Stef op 5 meetings >= 80%, party-attributie >= 90%        |
| EDGE-E040 | Klant-klacht ("ik vind X frustrerend") → need voor mitigatie              |

## Bronverwijzingen

- EX-001 (prerequisite): tier-infrastructuur
- Bestaande agent: `packages/ai/src/agents/needs-scanner.ts`
- Bestaande pipeline-stap: `packages/ai/src/pipeline/scan-needs.ts`

## Context

### Probleem

`needs-scanner.ts` draait nachtelijk over verified meetings heen. Voor het project-werkblad willen we direct na een meeting zien welke needs er speelden — niet wachten tot de nacht.

### Oplossing

Meeting-level need-extractie tijdens de normale pipeline. Beide agents (de nachtelijke scanner en de nieuwe per-meeting extractor) schrijven naar dezelfde `extractions` tabel met `type='need'`. Geen conflict — same row-shape. In EX-009 kan geconsolideerd worden of blijft het naast elkaar.

### Files touched

| Bestand                                                       | Wijziging                            |
| ------------------------------------------------------------- | ------------------------------------ |
| `packages/ai/src/agents/test-extractors/need-extractor.ts`    | nieuw                                |
| `packages/ai/src/validations/test-extractors/need.ts`         | nieuw                                |
| `packages/ai/src/agents/test-extractors/registry.ts`          | entry                                |
| `supabase/migrations/20260423000001_extraction_type_need.sql` | `need` aan type-enum als nodig       |
| `packages/database/src/queries/needs.ts`                      | extend (nieuwe `listNeedsByProject`) |
| `apps/cockpit/src/components/projects/needs-panel.tsx`        | nieuw                                |
| Tests                                                         | nieuw                                |

## Prerequisites

EX-000, EX-001 done.

## Taken

### TDD-first

- [ ] Agent tests: party + urgency + category; onderscheid need/question.
- [ ] Panel tests: sortering; party-badges; lege-staat.

### Database + code

- [ ] Migratie (als `need` nog niet in enum).
- [ ] Zod + agent + 5 voorbeelden.
- [ ] Registry + dropdown.
- [ ] Query + panel.

### Tunen

- [ ] 5 meetings, iteratie.

### Validatie

- [ ] Tests + checks groen.
- [ ] Verifieer: bestaande needs-scanner output werkt nog (geen regressie).

## Acceptatiecriteria

- [ ] [AI-E040-E044] Agent werkt.
- [ ] [DATA-E040] DB klaar.
- [ ] [FUNC-E050-E052] Panel werkt.
- [ ] [QUAL-E040] Spot-check + party-accuracy.
- [ ] [EDGE-E040] Klacht → need.

## Dependencies

EX-001.

## Out of scope

- `source_agent` kolom (defer tot EX-009 als het écht nodig blijkt).
- Vervanging van needs-scanner (aparte sprint later).
- Cross-project need-aggregatie.
- Communicator agent die needs gebruikt.
