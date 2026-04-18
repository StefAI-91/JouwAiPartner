# Micro Sprint EX-006: Signal extractor

> **Scope:** Type-specialist agent voor `signal` — zwakke signalen, observaties, pre-risks. Zichtbaar in meeting-detail + secundair op project-werkblad.

## Doel

Observaties en zwakke signalen extracten die niet sterk genoeg zijn voor een risk maar wel iets betekenen. Denk aan klant-gedrag-patronen, markt-signalen, team-dynamieken. Voedt later de Risk Synthesizer en Analyst agents.

## Requirements

| ID        | Beschrijving                                                                          |
| --------- | ------------------------------------------------------------------------------------- |
| AI-E060   | Nieuwe agent `signal-extractor.ts` (Sonnet) extract signalen                          |
| AI-E061   | Prompt onderscheidt signal van risk (waarschuwing) en context (achtergrond)           |
| AI-E062   | Retourneert `direction` (positive/neutral/concerning)                                 |
| AI-E063   | Retourneert `domain` (market/client/team/technical)                                   |
| AI-E064   | Bij twijfel risk-vs-signal: agent kiest signal (voorkomt false-positive risks)        |
| DATA-E060 | `signal` in type-enum                                                                 |
| FUNC-E070 | `signal` in harness dropdown                                                          |
| FUNC-E071 | Signalen zichtbaar in meeting-detail onder aparte sectie                              |
| FUNC-E072 | Secundair op project-werkblad onder risk-paneel als "Signalen om op te letten"        |
| QUAL-E060 | Spot-check door Stef op 5 meetings >= 75% (subjectiever type, lager threshold)        |
| EDGE-E060 | Positieve signalen ("klant is enthousiast over X") ook extracten — niet alleen zorgen |

## Bronverwijzingen

- EX-001 (prerequisite): tier-infrastructuur
- Bestaand: `**Signaal:**` markdown-tag in Summarizer

## Context

### Probleem

Signalen zitten als markdown-strings in summaries. "Heeft de klant de laatste weken vaker gezegd dat..." blijft gut-feeling. Structured signal-data maakt het queryable.

### Oplossing

Focused Signal Extractor. Signals zijn observaties zonder directe dreiging. Als iets direct dreigt → risk. Als het puur achtergrond is → context. Alles ertussenin = signal.

### Files touched

| Bestand                                                         | Wijziging                 |
| --------------------------------------------------------------- | ------------------------- |
| `packages/ai/src/agents/test-extractors/signal-extractor.ts`    | nieuw                     |
| `packages/ai/src/validations/test-extractors/signal.ts`         | nieuw                     |
| `packages/ai/src/agents/test-extractors/registry.ts`            | entry                     |
| `supabase/migrations/20260425000001_extraction_type_signal.sql` | type-enum                 |
| `packages/database/src/queries/signals.ts`                      | nieuw                     |
| `apps/cockpit/src/components/projects/signals-section.tsx`      | nieuw (secundair)         |
| `apps/cockpit/src/components/meetings/signals-list.tsx`         | nieuw (op meeting-detail) |
| Tests                                                           | nieuw                     |

## Prerequisites

EX-000, EX-001 done.

## Taken

### TDD-first

- [ ] Agent tests: signal vs risk vs context; positive/neutral/concerning.
- [ ] Component tests: compacte weergave; domain-badges.

### Database + code

- [ ] Migratie type-enum.
- [ ] Zod + agent + voorbeelden (positief én concerning).
- [ ] Registry + dropdown.
- [ ] Query + components.

### Tunen

- [ ] 5 meetings, iteratie (kan meer iteraties vragen vanwege subjectiviteit).

### Validatie

- [ ] Tests groen.

## Acceptatiecriteria

- [ ] [AI-E060-E064] Agent werkt.
- [ ] [DATA-E060] DB klaar.
- [ ] [FUNC-E070-E072] UI op 2 locaties.
- [ ] [QUAL-E060] 75% spot-check.
- [ ] [EDGE-E060] Positieve signals ook geëxtraheerd.

## Dependencies

EX-001.

## Out of scope

- `escalation` metadata-flag (defer — geen consumer).
- Risk Synthesizer agent (future sprint).
- Cross-project signal-aggregation.
- Alerting bij concerning signals.
