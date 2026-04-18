# Micro Sprint EX-005: Question extractor

> **Scope:** Type-specialist agent voor `question`. Voedt "Prep voor volgende gesprek"-paneel op project-werkblad.

## Doel

Open vragen uit meetings extracten zodat ze niet tussen beslissingen door verdwijnen. Vragen hebben een urgentie en een persoon die moet antwoorden — zo zie je voor een vervolgmeeting in één oogopslag wat er nog ligt.

## Requirements

| ID        | Beschrijving                                                                        |
| --------- | ----------------------------------------------------------------------------------- |
| AI-E050   | Nieuwe agent `question-extractor.ts` (Sonnet) extract open vragen uit transcript    |
| AI-E051   | Retourneert `needs_answer_from` — naam of rol van persoon die moet antwoorden       |
| AI-E052   | Retourneert `urgency` (low/medium/high)                                             |
| AI-E053   | Prompt onderscheidt open vraag van rhetorical / afgehandelde vraag                  |
| AI-E054   | Retorische of afgehandelde vragen worden NIET geëxtraheerd                          |
| DATA-E050 | `question` in type-enum                                                             |
| FUNC-E060 | `question` in harness dropdown                                                      |
| FUNC-E061 | Paneel "Open vragen" op project-werkblad                                            |
| FUNC-E062 | Gegroepeerd per `needs_answer_from`                                                 |
| FUNC-E063 | Urgent-vragen krijgen visuele nadruk                                                |
| QUAL-E050 | Spot-check door Stef op 5 meetings >= 80%                                           |
| EDGE-E050 | "Wat vinden jullie ervan?" als rhetorical met instemming → niet extracten           |
| EDGE-E051 | Vraag zonder duidelijke answerer → `needs_answer_from='unknown'`, lagere confidence |

## Bronverwijzingen

- EX-001 (prerequisite): tier-infrastructuur
- Shift mockup: "Pulse & Prep" paneel

## Context

### Probleem

Vragen raken verloren. "Hebben we dit eigenlijk besloten?" komt pas weken later aan het licht. Het prep-lijstje voor vervolgmeeting moet open vragen automatisch oplepelen.

### Oplossing

Focused Question Extractor met scherp onderscheid: open vraag vs rhetorical/afgehandeld. "Kun je X bekijken?" = open. "Goed idee toch?" (met instemming) = geen question.

### Files touched

| Bestand                                                           | Wijziging |
| ----------------------------------------------------------------- | --------- |
| `packages/ai/src/agents/test-extractors/question-extractor.ts`    | nieuw     |
| `packages/ai/src/validations/test-extractors/question.ts`         | nieuw     |
| `packages/ai/src/agents/test-extractors/registry.ts`              | entry     |
| `supabase/migrations/20260424000001_extraction_type_question.sql` | type-enum |
| `packages/database/src/queries/questions.ts`                      | nieuw     |
| `apps/cockpit/src/components/projects/questions-panel.tsx`        | nieuw     |
| Tests                                                             | nieuw     |

## Prerequisites

EX-000, EX-001 done.

## Taken

### TDD-first

- [ ] Agent tests: open vs rhetorical; urgency-cues; answerer-attribution.
- [ ] Panel tests: groepering; urgency-markering; lege-staat.

### Database + code

- [ ] Migratie type-enum.
- [ ] Zod + agent + 5 voorbeelden.
- [ ] Registry + dropdown.
- [ ] Query + panel.

### Tunen

- [ ] 5 meetings, iteratie.

### Validatie

- [ ] Tests + checks groen.

## Acceptatiecriteria

- [ ] [AI-E050-E054] Agent werkt.
- [ ] [DATA-E050] DB klaar.
- [ ] [FUNC-E060-E063] Panel functioneel.
- [ ] [QUAL-E050] Spot-check.
- [ ] [EDGE-E050, E051] Edge-cases.

## Dependencies

EX-001.

## Out of scope

- `topic` tag (defer — nog geen filter-consumer).
- `status` (open/answered) transitie-logica (later: auto-mark-answered bij vervolgmeeting).
- Integratie met Communicator voor antwoord-drafts.
