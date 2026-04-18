# Micro Sprint EX-002: Decision extractor

> **Scope:** Type-specialist agent voor `decision` (besluit). Tune op echte meetings. DB-enum uitbreiden. Beslissingen-paneel in project-werkblad.

## Doel

Extractie van besluiten — de ruggengraat van project-regie. Besluiten hebben een status (open/closed/reversed), een impact-gebied en eventueel een voorganger-besluit dat ze vervangen. Dit type voedt straks ook de Planner (PRDs uit besluiten) en Decision Tracker.

## Requirements

| ID        | Beschrijving                                                                                                           |
| --------- | ---------------------------------------------------------------------------------------------------------------------- |
| AI-E020   | Nieuwe agent `decision-extractor.ts` (Sonnet) extract decisions uit transcript                                         |
| AI-E021   | Prompt onderscheidt besluit (iets is beslist) van voornemen/idee/visie                                                 |
| AI-E022   | Retourneert `status` (open/closed/reversed) — closed = uitgevoerde beslissing, open = besloten maar nog niet effectief |
| AI-E023   | Retourneert `decided_by` — naam van persoon of "team"                                                                  |
| AI-E024   | Retourneert `impact_area` (pricing/scope/technical/hiring/process/other)                                               |
| AI-E025   | Retourneert optioneel `supersedes_extraction_id` als besluit een eerder besluit herroept (nullable, later ingevuld)    |
| AI-E026   | Conditionele besluiten ("als X dan Y") krijgen `metadata.conditional=true`                                             |
| DATA-E020 | `decision` toegevoegd aan `extractions.type` enum                                                                      |
| DATA-E021 | Metadata-velden gedocumenteerd in schema                                                                               |
| FUNC-E030 | `decision` toegevoegd aan harness dropdown                                                                             |
| FUNC-E031 | Paneel "Recente besluiten" in project-werkblad toont `type='decision' AND tuning_status='tuned'`                       |
| FUNC-E032 | Besluiten gesorteerd op `created_at DESC`, gescheiden in "open" en "closed" secties                                    |
| FUNC-E033 | Elk besluit toont: content + decided_by + date + impact_area badge + herkomst-link                                     |
| QUAL-E020 | Spot-check op 5 meetings >= 80% correct                                                                                |
| QUAL-E021 | Confidence-gemiddelde >= 0.70                                                                                          |
| RULE-E020 | Decisions met tuning_status='untuned' niet zichtbaar in productie-UI                                                   |
| EDGE-E020 | "We overwegen X" → geen decision (vs AI-E021)                                                                          |
| EDGE-E021 | "Lagen we vorige keer niet vast dat..." → geen nieuwe decision                                                         |

## Bronverwijzingen

- EX-001 (prerequisite): patroon voor type-specialist sprints
- EX-000 (prerequisite): test-harness
- Vision: §4.1 (agent roster — Decision Tracker is planned)
- Bestaand: `**Besluit:**` markdown-tag in Summarizer prompt

## Context

### Probleem

Besluiten zijn de belangrijkste eenheid van projectsturing, maar nu onzichtbaar als query-able data. "Wat hebben we afgelopen maand besloten voor project X" is een kernvraag waar Stef geen antwoord op kan krijgen zonder alle kernpunten door te lezen.

### Oplossing

Focused Decision Extractor met scherp onderscheid: een besluit is een genomen keuze, geen overweging, geen wens, geen plan. "We gaan X doen" is een besluit. "Misschien moeten we X overwegen" is niet. "We hebben X besloten" is trivially een besluit.

### Conditionele besluiten

"Als de businesscase niet haalbaar blijkt, durven we nee te verkopen" — dit is een besluit met een conditie. `metadata.conditional=true` markeert deze zodat de UI ze anders kan tonen (bijvoorbeeld: wegkleuren tot de conditie waar wordt).

### Files touched

| Bestand                                                                   | Wijziging                                   |
| ------------------------------------------------------------------------- | ------------------------------------------- |
| `packages/ai/src/agents/test-extractors/decision-extractor.ts`            | nieuw                                       |
| `packages/ai/src/validations/test-extractors/decision.ts`                 | nieuw — Zod schema                          |
| `packages/ai/src/agents/test-extractors/registry.ts`                      | entry `decision`                            |
| `supabase/migrations/20260421000001_extraction_type_decision.sql`         | nieuw                                       |
| `packages/database/src/queries/decisions.ts`                              | nieuw — `listDecisionsByProject(projectId)` |
| `apps/cockpit/src/components/projects/decisions-panel.tsx`                | nieuw                                       |
| `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`                 | paneel toevoegen                            |
| `packages/ai/__tests__/agents/test-extractors/decision-extractor.test.ts` | nieuw                                       |
| `apps/cockpit/src/components/projects/__tests__/decisions-panel.test.tsx` | nieuw                                       |

## Prerequisites

EX-000, EX-001 done.

## Taken

### TDD-first

- [ ] Unit test agent: onderscheid besluit/voornemen; juist invullen status; conditional flag.
- [ ] Component test panel: open vs closed secties; lege-staat; sortering.

### Database

- [ ] Migratie: `decision` in type-enum.
- [ ] Types regenereren.

### Agent

- [ ] Zod schema `decision.ts`.
- [ ] `decision-extractor.ts` met prompt en 5 voorbeelden uit echte meetings.
- [ ] Registry entry.

### Harness

- [ ] Dropdown optie.

### UI

- [ ] Query + panel.
- [ ] Integratie in project-page.

### Tunen

- [ ] 5 meetings via harness.
- [ ] Prompt itereren tot >= 80% correct.

### Validatie

- [ ] Type-check, lint, test groen.

## Acceptatiecriteria

- [ ] [AI-E020-E026] Agent werkt, tests groen.
- [ ] [DATA-E020-E021] Migratie + types.
- [ ] [FUNC-E030-E033] Harness en paneel.
- [ ] [QUAL-E020] 80% spot-check.
- [ ] [QUAL-E021] Avg confidence >= 0.70.
- [ ] [RULE-E020] `untuned` hidden.
- [ ] [EDGE-E020-E021] Edge-cases gedekt.

## Dependencies

EX-001 (infrastructuur — tuning_status kolom is al aangemaakt).

## Out of scope

- Planner agent (turn decision → PRD).
- Supersession detection (AI-E025 is wel veld, maar invulling komt later).
- Cross-project decision-index.
