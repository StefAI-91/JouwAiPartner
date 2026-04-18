# Micro Sprint EX-005: Question extractor

> **Scope:** Type-specialist agent voor `question`. Voedt "Prep voor volgende gesprek"-paneel op project-werkblad.

## Doel

Open vragen uit meetings extracten zodat ze niet verdwijnen tussen beslissingen door. Vragen hebben een urgentie, een persoon die moet antwoorden, en een status (open/answered). Zo kan de gebruiker voor een vervolgmeeting in één oogopslag zien welke vragen er nog liggen.

## Requirements

| ID        | Beschrijving                                                                        |
| --------- | ----------------------------------------------------------------------------------- |
| AI-E050   | Nieuwe agent `question-extractor.ts` (Sonnet) extract open vragen uit transcript    |
| AI-E051   | Retourneert `needs_answer_from` — naam of rol van persoon die moet antwoorden       |
| AI-E052   | Retourneert `status` (default `open`, kan later `answered` worden)                  |
| AI-E053   | Retourneert `urgency` (low/medium/high) op basis van tijdsdruk en impact            |
| AI-E054   | Retourneert `topic` — korte onderwerp-tag (bv. "auth", "pricing", "scope")          |
| AI-E055   | Prompt onderscheidt vraag (nog geen antwoord) van afgehandelde rethorische vraag    |
| AI-E056   | Retorische of afgehandelde vragen worden NIET geëxtraheerd                          |
| DATA-E050 | `question` in type-enum                                                             |
| FUNC-E060 | `question` in harness dropdown                                                      |
| FUNC-E061 | Paneel "Open vragen" in project-werkblad (onder "Prep volgende gesprek")            |
| FUNC-E062 | Paneel groepeert vragen per `needs_answer_from` (wie moet antwoorden)               |
| FUNC-E063 | Urgent-vragen (urgency=high) krijgen visuele nadruk                                 |
| QUAL-E050 | Spot-check 5 meetings >= 80%                                                        |
| RULE-E050 | untuned questions niet in productie                                                 |
| EDGE-E050 | "Wat vinden jullie ervan?" als rhetorical → niet extracten                          |
| EDGE-E051 | Vraag zonder duidelijke answerer → `needs_answer_from='unknown'`, lagere confidence |

## Bronverwijzingen

- EX-001 (infrastructuur)
- Shift mockup: "Pulse & Prep" paneel

## Context

### Probleem

Vragen in meetings raken verloren tussen besluiten door. "Hebben we dit eigenlijk besloten?" komt pas weken later aan het licht. Het prep-lijstje voor een vervolgmeeting moet open vragen automatisch oplepelen.

### Oplossing

Focused Question Extractor die expliciet onderscheid maakt tussen een open vraag en een retorische/afgehandelde formulering. "Kun je X bekijken?" van Joris aan Wouter → open question. "Goed idee toch?" van Stef (met instemming uit de groep) → geen question.

### Files touched

| Bestand                                                           | Wijziging |
| ----------------------------------------------------------------- | --------- |
| `packages/ai/src/agents/test-extractors/question-extractor.ts`    | nieuw     |
| `packages/ai/src/validations/test-extractors/question.ts`         | nieuw     |
| `packages/ai/src/agents/test-extractors/registry.ts`              | entry     |
| `supabase/migrations/20260424000001_extraction_type_question.sql` | nieuw     |
| `packages/database/src/queries/questions.ts`                      | nieuw     |
| `apps/cockpit/src/components/projects/questions-panel.tsx`        | nieuw     |
| Tests                                                             | nieuw     |

## Prerequisites

EX-000, EX-001 done.

## Taken

### TDD-first

- [ ] Agent tests: onderscheid open vs rhetorical; urgency-cues; answerer-attribution.
- [ ] Panel tests: groepering per answerer; urgency-markering; lege staat.

### Database

- [ ] Migratie type-enum.

### Agent + Harness

- [ ] Zod schema + prompt + 5 voorbeelden.
- [ ] Registry entry + dropdown.

### UI

- [ ] Query + panel.

### Tunen

- [ ] 5 meetings, iteratie.

### Validatie

- [ ] Tests + checks groen.

## Acceptatiecriteria

- [ ] [AI-E050-E056] Agent werkt.
- [ ] [DATA-E050] DB klaar.
- [ ] [FUNC-E060-E063] Panel functioneel.
- [ ] [QUAL-E050] Spot-check.
- [ ] [RULE-E050] untuned hidden.
- [ ] [EDGE-E050, E051] Edge-cases gedekt.

## Dependencies

EX-001.

## Out of scope

- Automatisch `status='answered'` zetten bij follow-up meetings (aparte sprint).
- Integratie met Communicator om antwoorden te drafen.
