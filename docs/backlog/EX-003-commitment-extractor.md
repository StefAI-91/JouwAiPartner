# Micro Sprint EX-003: Commitment extractor

> **Scope:** Type-specialist agent voor `commitment`. Voedt "Wie wacht op wie"-paneel. Verschilt van action_item: commitment = wie beloofde wat aan wie, action_item = iets dat wij kunnen mailen om op te volgen.

## Doel

Commitments expliciet extracten: elke keer dat iemand iets belooft (aan iemand anders) in een meeting. Dit geeft voor het eerst een gestructureerd "wie wacht op wie"-overzicht per project, zowel in-bound (externen beloven ons) als out-bound (wij beloven externen).

## Requirements

| ID        | Beschrijving                                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------------------------- |
| AI-E030   | Nieuwe agent `commitment-extractor.ts` (Sonnet) extract commitments                                                     |
| AI-E031   | Retourneert `committer` (wie belooft) en `committed_to` (aan wie)                                                       |
| AI-E032   | Retourneert `direction`: `outgoing` (wij beloven extern) of `incoming` (extern belooft ons)                             |
| AI-E033   | Retourneert optioneel `deadline_hint` als tijd genoemd is                                                               |
| AI-E034   | Prompt onderscheidt commitment (personenlijke belofte) van action_item (trackable follow-up) van agreement (wederzijds) |
| AI-E035   | Impliciete commitments ("ik kijk er naar") worden wel geëxtraheerd met lagere confidence                                |
| DATA-E030 | `commitment` in type-enum                                                                                               |
| DATA-E031 | Index op `(project_id, metadata->>'direction', tuning_status)` voor snelle filter                                       |
| FUNC-E040 | `commitment` in harness dropdown                                                                                        |
| FUNC-E041 | Paneel "Wie wacht op wie" in project-werkblad toont commitments gesorteerd op leeftijd                                  |
| FUNC-E042 | Paneel kleurt outgoing anders dan incoming (visueel verschil wie de bal heeft)                                          |
| FUNC-E043 | Commitments ouder dan 7 dagen krijgen waarschuwings-badge                                                               |
| QUAL-E030 | Spot-check op 5 meetings >= 80% correct                                                                                 |
| QUAL-E031 | Correcte direction-identificatie in >= 90% van gevallen                                                                 |
| RULE-E030 | Commitments met `tuning_status='untuned'` niet in productie                                                             |
| EDGE-E030 | "We bespreken dit volgende week" → agreement, geen commitment (niemand persoonlijk)                                     |
| EDGE-E031 | Commitment tussen 2 externe partijen (niet wij) → agent extract het maar flags via metadata                             |

## Bronverwijzingen

- EX-001 t/m EX-002 (patroon + infrastructuur)
- Shift mockup: paneel "Wie wacht op wie"
- Verwantschap met action_item — let op overlap

## Context

### Probleem

"Wie wacht op wie" is nu een gut-feeling-vraag. Wouter denkt dat Joris iets moet leveren, Joris denkt dat Wouter nog iets moet doen. Zonder gestructureerde commitment-tracking gaat er tijd verloren op dubbel-werk of onbeantwoorde ballen.

### Oplossing

Expliciete commitment-extractie die distinguished van action_item: action_item is wat wíj kunnen opvolgen (mailen), commitment is een beloofde hand-over tussen personen. Dezelfde zin kan beide opleveren — dat is oké, ze dekken verschillende lagen.

Voorbeeld: "Wouter werkt met Tibor aan presentatie"

- commitment: Wouter → aan Tibor (outgoing) / Tibor → aan Wouter (incoming, afh. wie het geïnitieerd heeft)
- action_item: mogelijk óók (Stef kan Wouter mailen om voortgang te checken)

### Files touched

| Bestand                                                             | Wijziging                             |
| ------------------------------------------------------------------- | ------------------------------------- |
| `packages/ai/src/agents/test-extractors/commitment-extractor.ts`    | nieuw                                 |
| `packages/ai/src/validations/test-extractors/commitment.ts`         | nieuw                                 |
| `packages/ai/src/agents/test-extractors/registry.ts`                | entry                                 |
| `supabase/migrations/20260422000001_extraction_type_commitment.sql` | nieuw                                 |
| `packages/database/src/queries/commitments.ts`                      | `listCommitmentsByProject(projectId)` |
| `apps/cockpit/src/components/projects/commitments-panel.tsx`        | nieuw                                 |
| `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`           | paneel toevoegen                      |
| Tests: agent + panel                                                | nieuw                                 |

## Prerequisites

EX-000, EX-001 done.

## Taken

### TDD-first

- [ ] Agent tests: direction-identificatie, onderscheid commitment/action/agreement, impliciete vs expliciete.
- [ ] Panel tests: outgoing/incoming gescheiden, age-badges, lege staat.

### Database

- [ ] Migratie: type-enum + index.
- [ ] Types regenereren.

### Agent

- [ ] Zod schema + prompt + 5 echte voorbeelden.
- [ ] Registry entry.

### Harness + UI

- [ ] Dropdown optie.
- [ ] Query + panel, integratie.

### Tunen

- [ ] 5 meetings via harness, itereer tot 80%+ en correcte direction.

### Validatie

- [ ] Type-check, lint, test groen.

## Acceptatiecriteria

- [ ] [AI-E030-E035] Agent werkt.
- [ ] [DATA-E030-E031] DB klaar.
- [ ] [FUNC-E040-E043] Panel werkt met visuele directionaliteit.
- [ ] [QUAL-E030, E031] Spot-check en direction-accuracy.
- [ ] [RULE-E030] untuned hidden.
- [ ] [EDGE-E030, E031] Edge-cases.

## Dependencies

EX-001.

## Out of scope

- Notifications bij commitment-age > N dagen.
- Auto-escalatie naar Slack.
- Cross-commitment dependency chains.
