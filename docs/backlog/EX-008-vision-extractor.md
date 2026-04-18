# Micro Sprint EX-008: Vision extractor

> **Scope:** Type-specialist agent voor `vision` — strategische, richtinggevende uitspraken die geen concrete beslissing zijn. Laatste type-sprint voor The Merge (EX-009).

## Doel

Visie-items extracten: uitspraken over langetermijn-richting, strategische ambitie, groeipad. Komen vooral uit strategy- en board-meetings. Waardevol als anker voor proposals en voor "past dit besluit bij onze visie?" later.

## Requirements

| ID        | Beschrijving                                                                               |
| --------- | ------------------------------------------------------------------------------------------ |
| AI-E080   | Nieuwe agent `vision-extractor.ts` (Sonnet) extract visie-items                            |
| AI-E081   | Prompt onderscheidt vision (richting) van decision (iets is beslist) en idea               |
| AI-E082   | Concrete action of deadline in een vision-statement → waarschijnlijk decision, niet vision |
| DATA-E080 | `vision` in type-enum                                                                      |
| FUNC-E090 | `vision` in harness dropdown                                                               |
| FUNC-E091 | Visies zichtbaar op organization-detail (klant-visies) en interne admin-pagina             |
| FUNC-E092 | Project-werkblad: collapsible sectie "Visie bij dit project"                               |
| QUAL-E080 | Spot-check door Stef op 5 strategy/board-meetings >= 70% (subjectiefst, lager thresh)      |
| RULE-E080 | Vision-extractie richt zich op meeting_type `strategy` of `board` (best signal-to-noise)   |
| EDGE-E080 | Visie met concrete deadline → check of het eigenlijk decision is                           |

## Bronverwijzingen

- EX-001 (prerequisite): tier-infrastructuur
- Bestaand: `**Visie:**` markdown-tag in Summarizer
- Meeting types: `packages/ai/src/validations/gatekeeper.ts`

## Context

### Probleem

Visies raken verloren in strategy-transcripten. "Jouw bedrijf is over vijf jaar..." is waardevolle taal voor proposals en positionering maar blijft begraven.

### Oplossing

Focused Vision Extractor met scherp onderscheid met decisions. Vision = richting zonder concrete actie/deadline. Decision = geformaliseerde keuze.

### Files touched

| Bestand                                                         | Wijziging           |
| --------------------------------------------------------------- | ------------------- |
| `packages/ai/src/agents/test-extractors/vision-extractor.ts`    | nieuw               |
| `packages/ai/src/validations/test-extractors/vision.ts`         | nieuw               |
| `packages/ai/src/agents/test-extractors/registry.ts`            | entry               |
| `supabase/migrations/20260427000001_extraction_type_vision.sql` | type-enum           |
| `packages/database/src/queries/visions.ts`                      | nieuw               |
| `apps/cockpit/src/components/organizations/visions-list.tsx`    | nieuw               |
| `apps/cockpit/src/components/projects/visions-section.tsx`      | nieuw (collapsible) |
| Tests                                                           | nieuw               |

## Prerequisites

EX-000, EX-001 done.

## Taken

### TDD-first

- [ ] Agent tests: vision vs decision vs idea; deadline-disambiguation.
- [ ] Component tests: collapsible; lege-staat.

### Database + code

- [ ] Migratie type-enum.
- [ ] Zod + agent + voorbeelden uit strategy-meetings.
- [ ] Registry + dropdown.
- [ ] Query + components.

### Tunen

- [ ] 5 strategy/board-meetings, iteratie (meest subjectieve type).

### Validatie

- [ ] Tests groen.

## Acceptatiecriteria

- [ ] [AI-E080-E082] Agent werkt.
- [ ] [DATA-E080] DB klaar.
- [ ] [FUNC-E090-E092] UI zichtbaar.
- [ ] [QUAL-E080] 70% spot-check.
- [ ] [RULE-E080] Focus op strategy/board.
- [ ] [EDGE-E080] Deadline-disambiguation.

## Dependencies

EX-001.

## Out of scope

- `horizon` (1y/3y/5y) metadata — defer, zelden expliciet in transcript.
- `scope` (company/product/team) — defer.
- Vision-alignment scoring van decisions.
- Cross-meeting vision-evolutie tracking.
- Vision voor portal/klant-zichtbaar.
