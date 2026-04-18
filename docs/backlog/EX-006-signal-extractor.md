# Micro Sprint EX-006: Signal extractor

> **Scope:** Type-specialist agent voor `signal` — zwakke signalen, observaties, pre-risks. Geen dedicated project-workspace paneel; voedt latere Risk Synthesizer en Analyst.

## Doel

Observaties en zwakke signalen extracten die niet sterk genoeg zijn voor een risk maar wel iets betekenen. Denk aan gedrag-patronen bij klanten, markt-signalen van prospects, team-dynamieken. Dit is de data waar de Risk Synthesizer en Analyst later patronen uit halen.

## Requirements

| ID        | Beschrijving                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------ |
| AI-E060   | Nieuwe agent `signal-extractor.ts` (Sonnet) extract signalen                                           |
| AI-E061   | Prompt onderscheidt signal (observatie) van risk (waarschuwing) en context (achtergrond)               |
| AI-E062   | Retourneert `direction` (positive/neutral/concerning)                                                  |
| AI-E063   | Retourneert `domain` (market/client/team/technical/competitor)                                         |
| AI-E064   | Signalen die bij herhaling konden escaleren worden expliciet gemarkeerd met `metadata.escalation=true` |
| DATA-E060 | `signal` in type-enum                                                                                  |
| FUNC-E070 | `signal` in harness dropdown                                                                           |
| FUNC-E071 | Signalen zichtbaar in meeting-detail onder een aparte sectie (niet in project-werkblad hoofdpaneel)    |
| FUNC-E072 | Signalen op project-werkblad tonen secundair onder risico-paneel als "Signalen om op te letten"        |
| QUAL-E060 | Spot-check 5 meetings >= 75% (lager dan andere types — signals zijn subjectiever)                      |
| RULE-E060 | untuned signals niet in productie                                                                      |
| RULE-E061 | Bij twijfel risk-vs-signal: agent kiest signal (voorkomt false-positive risks)                         |
| EDGE-E060 | Positieve signalen ("klant is enthousiast over X") worden óók geëxtraheerd — niet alleen zorgen        |

## Bronverwijzingen

- EX-001 (infrastructuur)
- Vision: Risk Synthesizer (future), Analyst (Phase E)
- Bestaand: `**Signaal:**` markdown-tag in Summarizer

## Context

### Probleem

Signalen zitten in markdown-vorm in summaries maar zijn niet queryable. "Heeft de klant de laatste weken vaker gezegd dat..." blijft een gut-feeling. Met structured signal-data wordt dit een query.

### Oplossing

Focused Signal Extractor met duidelijk onderscheid van risk en context. Signals zijn **observaties zonder directe dreiging**. Ze kunnen escaleren, maar zijn er op zich niet. Als iets direct dreigt: risk. Als het puur achtergrond is: context.

### Files touched

| Bestand                                                         | Wijziging                 |
| --------------------------------------------------------------- | ------------------------- |
| `packages/ai/src/agents/test-extractors/signal-extractor.ts`    | nieuw                     |
| `packages/ai/src/validations/test-extractors/signal.ts`         | nieuw                     |
| `packages/ai/src/agents/test-extractors/registry.ts`            | entry                     |
| `supabase/migrations/20260425000001_extraction_type_signal.sql` | nieuw                     |
| `packages/database/src/queries/signals.ts`                      | nieuw                     |
| `apps/cockpit/src/components/projects/signals-section.tsx`      | nieuw (secundair)         |
| `apps/cockpit/src/components/meetings/signals-list.tsx`         | nieuw (in meeting-detail) |
| Tests                                                           | nieuw                     |

## Prerequisites

EX-000, EX-001 done.

## Taken

### TDD-first

- [ ] Agent tests: onderscheid signal/risk/context; positive/neutral/concerning; escalation flag.
- [ ] Component tests: compacte weergave; domein-badges.

### Database

- [ ] Migratie type-enum.

### Agent + Harness

- [ ] Zod schema + prompt met veel voorbeelden van signals uit echte meetings.
- [ ] Registry entry + dropdown.

### UI

- [ ] Query.
- [ ] Meeting-detail sectie.
- [ ] Project-werkblad secundaire sectie onder risk-panel.

### Tunen

- [ ] 5 meetings, iteratie (let op: subjectiever dus mogelijk meer iteraties).

### Validatie

- [ ] Tests groen.

## Acceptatiecriteria

- [ ] [AI-E060-E064] Agent werkt.
- [ ] [DATA-E060] DB klaar.
- [ ] [FUNC-E070-E072] UI zichtbaar.
- [ ] [QUAL-E060] 75% spot-check (lager threshold).
- [ ] [RULE-E060, E061] untuned hidden + signal-preference bij twijfel.
- [ ] [EDGE-E060] Positieve signals ook geëxtraheerd.

## Dependencies

EX-001.

## Out of scope

- Risk Synthesizer agent (future sprint) — dit sprint levert alleen de data.
- Cross-project signal aggregation.
- Alerting bij concerning signals.
