# Micro Sprint EX-003: Commitment extractor

> **Scope:** Type-specialist agent voor `commitment`. Voedt "Wie wacht op wie"-paneel. Verschilt van action_item: commitment = wie beloofde wat aan wie, action_item = iets dat wij kunnen mailen om op te volgen.

## Doel

Commitments expliciet extracten: elke keer dat iemand iets belooft aan iemand anders. Levert voor het eerst een gestructureerd "wie wacht op wie"-overzicht, zowel outgoing (wij beloven extern) als incoming (extern belooft ons).

## Requirements

| ID        | Beschrijving                                                                                   |
| --------- | ---------------------------------------------------------------------------------------------- |
| AI-E030   | Nieuwe agent `commitment-extractor.ts` (Sonnet) extract commitments                            |
| AI-E031   | Retourneert `committer` (wie belooft) en `committed_to` (aan wie)                              |
| AI-E032   | Retourneert `direction`: `outgoing` (wij beloven) of `incoming` (zij beloven ons)              |
| AI-E033   | Prompt onderscheidt commitment van action_item (trackable follow-up) en agreement (wederzijds) |
| DATA-E030 | `commitment` in type-enum                                                                      |
| FUNC-E040 | `commitment` in harness dropdown                                                               |
| FUNC-E041 | Paneel "Wie wacht op wie" op project-werkblad, gesorteerd op leeftijd DESC                     |
| FUNC-E042 | Outgoing en incoming visueel onderscheiden                                                     |
| FUNC-E043 | Commitments ouder dan 7 dagen → waarschuwingsbadge (client-side berekening uit created_at)     |
| QUAL-E030 | Spot-check door Stef op 5 meetings >= 80% correct, direction >= 90%                            |
| EDGE-E030 | "We bespreken dit volgende week" → agreement, geen commitment                                  |

## Bronverwijzingen

- EX-001 (prerequisite): tier-infrastructuur
- Shift mockup: paneel "Wie wacht op wie"

## Context

### Probleem

"Wie wacht op wie" is gut-feeling. Wouter denkt Joris moet leveren, Joris denkt Wouter. Zonder gestructureerde commitment-tracking gaat tijd verloren op dubbel-werk of onbeantwoorde ballen.

### Oplossing

Expliciete commitment-extractie. Commitment ≠ action_item — dezelfde zin kan beide opleveren. Voorbeeld "Wouter werkt met Tibor aan presentatie":

- commitment: Wouter → Tibor (outgoing)
- action_item: optioneel (Stef mailt Wouter voor status)

Direction is het kern-onderscheid tussen deze feature en action_item.

### Files touched

| Bestand                                                             | Wijziging                             |
| ------------------------------------------------------------------- | ------------------------------------- |
| `packages/ai/src/agents/test-extractors/commitment-extractor.ts`    | nieuw                                 |
| `packages/ai/src/validations/test-extractors/commitment.ts`         | nieuw                                 |
| `packages/ai/src/agents/test-extractors/registry.ts`                | entry                                 |
| `supabase/migrations/20260422000001_extraction_type_commitment.sql` | type-enum                             |
| `packages/database/src/queries/commitments.ts`                      | `listCommitmentsByProject(projectId)` |
| `apps/cockpit/src/components/projects/commitments-panel.tsx`        | nieuw                                 |
| `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`           | paneel toevoegen                      |
| Tests                                                               | nieuw                                 |

## Prerequisites

EX-000, EX-001 done.

## Taken

### TDD-first

- [ ] Agent tests: direction-identificatie; commitment vs action vs agreement.
- [ ] Panel tests: outgoing/incoming onderscheid; age-badges; lege-staat.

### Database + code

- [ ] Migratie + types regenereren.
- [ ] Zod + agent + 5 voorbeelden.
- [ ] Registry + dropdown.
- [ ] Query + panel.

### Tunen

- [ ] 5 meetings, iteratie tot 80%+ en direction >= 90%.

### Validatie

- [ ] Tests + checks groen.

## Acceptatiecriteria

- [ ] [AI-E030-E033] Agent werkt.
- [ ] [DATA-E030] DB klaar.
- [ ] [FUNC-E040-E043] Panel met directionaliteit.
- [ ] [QUAL-E030] Spot-check en direction-accuracy.
- [ ] [EDGE-E030] Agreement-disambiguation.

## Dependencies

EX-001.

## Out of scope

- `deadline_hint` metadata (defer — UI gebruikt het nog niet).
- Notifications bij commitment-age > N dagen.
- Auto-escalatie naar Slack.
- Preemptieve indexes op `direction` (voeg toe als performance dat vraagt).
- Commitment tussen 2 externe partijen (niet wij) — edge case, defer.
