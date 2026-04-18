# Micro Sprint EX-008: Vision extractor

> **Scope:** Type-specialist agent voor `vision` — strategische, richtinggevende uitspraken die geen concrete beslissing zijn. Laatste type-sprint voor The Merge (EX-009).

## Doel

Visie-items extracten: uitspraken over langetermijn-richting, strategische ambitie, groeipad. Deze komen vooral uit strategy- en board-meetings en zijn waardevol als anker voor beslissingen later ("dit besluit sluit aan bij onze visie X").

## Requirements

| ID        | Beschrijving                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------------- |
| AI-E080   | Nieuwe agent `vision-extractor.ts` (Sonnet) extract visie-items                                          |
| AI-E081   | Prompt onderscheidt vision (richting, geen concreet besluit) van decision (iets is beslist) en idea      |
| AI-E082   | Retourneert `horizon` (1y/3y/5y) op basis van tijdsindicatie in transcript                               |
| AI-E083   | Retourneert `scope` (company/product/team)                                                               |
| AI-E084   | Vision items krijgen default lagere confidence-threshold want ze zijn abstracter                         |
| AI-E085   | Concrete action of deadline in een vision-statement → het is waarschijnlijk een decision, niet vision    |
| DATA-E080 | `vision` in type-enum                                                                                    |
| FUNC-E090 | `vision` in harness dropdown                                                                             |
| FUNC-E091 | Visies zichtbaar op organization-pagina (voor klant-visies) en interne admin-pagina (voor bedrijfsvisie) |
| FUNC-E092 | Project-werkblad toont relevante visie-items in collapsible sectie (optioneel paneel)                    |
| QUAL-E080 | Spot-check 5 meetings >= 70% (meest subjectieve type, laagste threshold)                                 |
| RULE-E080 | untuned visions niet in productie                                                                        |
| RULE-E081 | Visions komen bijna alleen uit meeting_type `strategy` of `board` — prompt filter hierop                 |
| EDGE-E080 | Visie met deadline → check of het eigenlijk decision is                                                  |

## Bronverwijzingen

- EX-001 (infrastructuur)
- Bestaand: `**Visie:**` markdown-tag in Summarizer
- Meeting types: `packages/ai/src/validations/gatekeeper.ts` (`strategy`, `board`)

## Context

### Probleem

Visies raken verloren in meeting-transcripten. "Jouw bedrijf is over vijf jaar niet meer het bedrijf wat je nu gewend bent" — dat is waardevolle taal voor proposals en positionering, maar zit begraven in een strategy-call van vorig kwartaal. Structured extractie maakt het vindbaar.

### Oplossing

Focused Vision Extractor die scherp onderscheid maakt met decisions. Een visie is een richting zonder concrete actie of deadline. "We worden langetermijnpartner" = vision. "We lanceren pakket X op 1 juni" = decision. Conditionele visies ("als we deze kant op gaan, dan...") krijgen `metadata.conditional=true`.

### Files touched

| Bestand                                                         | Wijziging           |
| --------------------------------------------------------------- | ------------------- |
| `packages/ai/src/agents/test-extractors/vision-extractor.ts`    | nieuw               |
| `packages/ai/src/validations/test-extractors/vision.ts`         | nieuw               |
| `packages/ai/src/agents/test-extractors/registry.ts`            | entry               |
| `supabase/migrations/20260427000001_extraction_type_vision.sql` | nieuw               |
| `packages/database/src/queries/visions.ts`                      | nieuw               |
| `apps/cockpit/src/components/organizations/visions-list.tsx`    | nieuw               |
| `apps/cockpit/src/components/projects/visions-section.tsx`      | nieuw (collapsible) |
| Tests                                                           | nieuw               |

## Prerequisites

EX-000, EX-001 done.

## Taken

### TDD-first

- [ ] Agent tests: onderscheid vision/decision/idea; horizon-identificatie; scope-attributie.
- [ ] Component tests: conditionele visualisatie; collapsible.

### Database

- [ ] Migratie type-enum.

### Agent + Harness

- [ ] Zod schema + prompt met voorbeelden uit strategy-meetings.
- [ ] Registry entry + dropdown.

### UI

- [ ] Query + components op org en project.

### Tunen

- [ ] 5 strategy/board meetings (want dáár komen visies het meest voor).

### Validatie

- [ ] Tests groen.

## Acceptatiecriteria

- [ ] [AI-E080-E085] Agent werkt.
- [ ] [DATA-E080] DB klaar.
- [ ] [FUNC-E090-E092] UI zichtbaar.
- [ ] [QUAL-E080] 70% spot-check.
- [ ] [RULE-E080, E081] untuned hidden + meeting-type focus.
- [ ] [EDGE-E080] Deadline-disambiguation.

## Dependencies

EX-001.

## Out of scope

- Cross-meeting vision-tracking (is de visie geëvolueerd?).
- Vision-alignment scoring van decisions ("klopt dit besluit met onze visie?").
- Vision voor portal/klant-zichtbaar.
