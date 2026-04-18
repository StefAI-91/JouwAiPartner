# Micro Sprint EX-002: Decision extractor

> **Scope:** Type-specialist agent voor `decision` (besluit). Tune op echte meetings, enum uitbreiden, beslissingen-paneel op project-werkblad.

## Doel

Besluiten structureel extracten — de ruggengraat van project-regie. Elke beslissing heeft een status (open/closed) en een impact-gebied. Voedt straks de Planner (PRDs uit besluiten).

## Requirements

| ID        | Beschrijving                                                                           |
| --------- | -------------------------------------------------------------------------------------- |
| AI-E020   | Nieuwe agent `decision-extractor.ts` (Sonnet) extract decisions uit transcript         |
| AI-E021   | Prompt onderscheidt besluit van voornemen/overweging/idee/visie                        |
| AI-E022   | Retourneert `status` (open/closed) — closed = uitgevoerd, open = besloten maar pending |
| AI-E023   | Retourneert `decided_by` (persoon of "team")                                           |
| AI-E024   | Retourneert `impact_area` (pricing/scope/technical/hiring/process/other)               |
| DATA-E020 | `decision` toegevoegd aan `extractions.type` enum                                      |
| FUNC-E030 | `decision` in harness dropdown                                                         |
| FUNC-E031 | Paneel "Recente besluiten" op project-werkblad (`type='decision' AND project_id=X`)    |
| FUNC-E032 | Open en closed besluiten gescheiden getoond, sortering op datum DESC                   |
| FUNC-E033 | Toont: content + decided_by + impact_area badge + herkomst-link                        |
| QUAL-E020 | Spot-check door Stef op 5 meetings >= 80% correct                                      |
| EDGE-E020 | "We overwegen X" → geen decision                                                       |

## Bronverwijzingen

- EX-001 (prerequisite): tier-infrastructuur
- Bestaand: `**Besluit:**` markdown-tag in Summarizer prompt
- Vision: §4.1 — Planner agent (future, consumer van deze data)

## Context

### Probleem

"Wat hebben we afgelopen maand besloten voor project X?" — nu onbeantwoordbaar zonder alle kernpunten door te lezen. Besluiten zitten opgesloten in markdown-strings.

### Oplossing

Focused Decision Extractor. Een besluit is een genomen keuze, geen wens, geen plan. Status open/closed onderscheidt "besloten, nog te implementeren" van "besloten én uitgevoerd". Impact_area maakt straks filtering mogelijk voor Planner agent.

### Files touched

| Bestand                                                           | Wijziging                           |
| ----------------------------------------------------------------- | ----------------------------------- |
| `packages/ai/src/agents/test-extractors/decision-extractor.ts`    | nieuw                               |
| `packages/ai/src/validations/test-extractors/decision.ts`         | nieuw — Zod schema                  |
| `packages/ai/src/agents/test-extractors/registry.ts`              | entry                               |
| `supabase/migrations/20260421000001_extraction_type_decision.sql` | `decision` aan type-enum            |
| `packages/database/src/queries/decisions.ts`                      | `listDecisionsByProject(projectId)` |
| `apps/cockpit/src/components/projects/decisions-panel.tsx`        | nieuw paneel                        |
| `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`         | paneel integreren                   |
| Tests: agent + panel                                              | nieuw                               |

## Prerequisites

EX-000, EX-001 done.

## Taken

### TDD-first

- [ ] Agent tests: besluit vs voornemen; status-identificatie; impact_area-attributie.
- [ ] Panel tests: open/closed secties; lege-staat.

### Database + code

- [ ] Migratie + types regenereren.
- [ ] Zod schema + agent + 5 voorbeelden.
- [ ] Registry + dropdown.
- [ ] Query + panel + integratie.

### Tunen

- [ ] 5 meetings via harness, iteratie tot >= 80% correct.

### Validatie

- [ ] Tests + type-check + lint groen.

## Acceptatiecriteria

- [ ] [AI-E020-E024] Agent werkt.
- [ ] [DATA-E020] DB klaar.
- [ ] [FUNC-E030-E033] Harness + paneel.
- [ ] [QUAL-E020] Spot-check.
- [ ] [EDGE-E020] Edge-case.

## Dependencies

EX-001.

## Out of scope

- Planner agent (turn decision → PRD).
- `reversed` status (voeg toe als het voorkomt in praktijk).
- `supersedes_extraction_id` linking (later — Curator/Analyst feature).
- Conditional-decisions flag (defer — geen UI-consumer).
- Cross-project decision-index.
