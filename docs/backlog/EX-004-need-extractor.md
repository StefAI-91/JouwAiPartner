# Micro Sprint EX-004: Need extractor

> **Scope:** Type-specialist agent voor `need` (behoefte). Let op: bestaande `needs-scanner.ts` agent wordt hier niet vervangen maar aangevuld — zie reconciliatie-notitie.

## Doel

Needs structureel extracten uit meetings (zowel klant-needs als intern-team needs), met party/urgency/category-metadata zodat Communicator (later) ze kan gebruiken om klant-antwoorden te gronden, en zodat we intern zicht krijgen op terugkerende behoeften.

## Reconciliatie met bestaande `needs-scanner.ts`

De huidige `needs-scanner.ts` is een **aparte pipeline-stap** die nachtelijk draait over alle verified meetings heen. Deze sprint raakt die agent **niet aan** — we bouwen een parallel `need-extractor.ts` dat tijdens de extractie per-meeting direct needs uithaalt. In EX-009 kan geconsolideerd worden (mogelijk wordt de scanner overbodig).

## Requirements

| ID        | Beschrijving                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------------- |
| AI-E040   | Nieuwe agent `need-extractor.ts` (Sonnet) extract needs uit transcript                                |
| AI-E041   | Retourneert `party` (client/team/partner)                                                             |
| AI-E042   | Retourneert `urgency` (nice_to_have/should_have/must_have)                                            |
| AI-E043   | Retourneert `category` (tooling/knowledge/capacity/process/client/other)                              |
| AI-E044   | Prompt onderscheidt need (gewenste staat) van question (open vraag) en risk (dreiging)                |
| AI-E045   | Impliciete needs ("het zou fijn zijn als...") wel extracten met lagere confidence                     |
| DATA-E040 | `need` in type-enum                                                                                   |
| DATA-E041 | Metadata-velden gedocumenteerd                                                                        |
| FUNC-E050 | `need` in harness dropdown                                                                            |
| FUNC-E051 | Paneel "Behoeften" in project-werkblad, gesorteerd op urgency DESC                                    |
| FUNC-E052 | Paneel toont party-badge (klant/team/partner)                                                         |
| QUAL-E040 | Spot-check 5 meetings >= 80%                                                                          |
| QUAL-E041 | Party-attributie correct in >= 90%                                                                    |
| RULE-E040 | Reconcilement met needs-scanner: beide schrijven naar `extractions` met `type='need'`, geen conflicts |
| RULE-E041 | `need` extracties krijgen `metadata.source_agent` (`need-extractor` of `needs-scanner`)               |
| EDGE-E040 | Klant-klacht ("ik vind X frustrerend") → need voor mitigatie, urgency=must_have                       |

## Bronverwijzingen

- Bestaande: `packages/ai/src/agents/needs-scanner.ts`
- Bestaande: `packages/ai/src/pipeline/scan-needs.ts`
- EX-001 (infrastructuur)

## Context

### Probleem

Needs worden nu nachtelijk door scanner geaggregeerd, maar op meeting-niveau ontbreekt real-time extractie. Voor het project-werkblad willen we direct na een meeting zien welke needs er speelden.

### Oplossing

Meeting-level need-extractie via specialist agent, parallel aan bestaande nightly scanner. Beide schrijven naar dezelfde tabel met verschillende `source_agent`. Later (EX-009 of daarna) mogelijk consolideren.

### Files touched

| Bestand                                                       | Wijziging                              |
| ------------------------------------------------------------- | -------------------------------------- |
| `packages/ai/src/agents/test-extractors/need-extractor.ts`    | nieuw                                  |
| `packages/ai/src/validations/test-extractors/need.ts`         | nieuw                                  |
| `packages/ai/src/agents/test-extractors/registry.ts`          | entry                                  |
| `supabase/migrations/20260423000001_extraction_type_need.sql` | nieuw (+ optioneel source_agent kolom) |
| `packages/database/src/queries/needs.ts`                      | extend met `tuning_status` filter      |
| `apps/cockpit/src/components/projects/needs-panel.tsx`        | nieuw                                  |
| Tests                                                         | nieuw                                  |

## Prerequisites

EX-000, EX-001 done.

## Taken

### TDD-first

- [ ] Agent tests: party-identificatie; urgency-calibratie; onderscheid need/question.
- [ ] Panel tests: sortering urgency; party-badges.

### Database

- [ ] Migratie type-enum. Optioneel: `source_agent` kolom op extractions.
- [ ] Types regenereren.

### Agent

- [ ] Zod schema + prompt met 5 voorbeelden.
- [ ] Registry entry.

### Harness + UI

- [ ] Dropdown optie. Query, panel, integratie.

### Tunen

- [ ] 5 meetings, iteratie, 80%+ target.

### Validatie

- [ ] Type-check, lint, test groen.
- [ ] Verifieer geen regressie op bestaande needs-scanner output.

## Acceptatiecriteria

- [ ] [AI-E040-E045] Agent werkt.
- [ ] [DATA-E040-E041] DB klaar.
- [ ] [FUNC-E050-E052] Panel functioneel.
- [ ] [QUAL-E040, E041] Spot-check en party-accuracy.
- [ ] [RULE-E040, E041] Coexistence met needs-scanner zonder breaking changes.
- [ ] [EDGE-E040] Klacht → need-mitigatie extractie.

## Dependencies

EX-001.

## Out of scope

- Vervanging van needs-scanner (later in EX-009 of eigen sprint).
- Cross-project need-aggregatie.
- Communicator agent die needs gebruikt voor klant-antwoorden.
