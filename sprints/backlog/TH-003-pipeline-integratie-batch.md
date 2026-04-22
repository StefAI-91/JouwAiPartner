# Micro Sprint TH-003: Pipeline-integratie + retroactieve batch-run

## Doel

De ThemeTagger uit TH-002 daadwerkelijk in de gatekeeper-pipeline hangen zodat elke nieuwe verified meeting wordt getagd, én eenmalig een batch-run uitvoeren over bestaande verified meetings zodat de themes-data bij launch niet leeg is. Na deze sprint: nieuwe meetings verschijnen met theme-links, historische meetings zijn retroactief getagd. Nog geen UI — je ziet het effect via Supabase Studio. Grootste meetbare deliverable: `SELECT count(*) FROM meeting_themes` > 0 na batch-run.

## Requirements

| ID       | Beschrijving                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| FUNC-210 | ThemeTagger draait **na** summarizer/extractor en parallel aan embed-save in `gatekeeper-pipeline.ts`                    |
| FUNC-211 | Gatekeeper-rejected meetings (relevance_score laag) triggeren ThemeTagger NIET                                           |
| FUNC-212 | ThemeTagger ontvangt summary + extractions + lijst verified themes + recente negative_examples per thema                 |
| FUNC-213 | Matches → rows in `meeting_themes` met evidence_quote                                                                    |
| FUNC-214 | Proposals → nieuwe rows in `themes` met `status='emerging'`, `created_by_agent='theme_tagger'`                           |
| FUNC-215 | Gedenormaliseerde `mention_count` en `last_mentioned_at` worden bijgewerkt op elk getagd thema                           |
| FUNC-216 | `getVerifiedThemesWithNegativeExamples` query haalt themes op inclusief laatste 2–3 rejections                           |
| FUNC-217 | Eenmalig script `packages/ai/src/pipeline/batch-tag-existing-meetings.ts` draait ThemeTagger over alle verified meetings |
| FUNC-218 | Batch-run is idempotent: als een meeting al `meeting_themes` heeft wordt hij overgeslagen (tenzij `--force`)             |
| FUNC-219 | Batch-run heeft rate-limiting (max 5 concurrent calls) om API-limits te respecteren                                      |
| DATA-210 | `listVerifiedThemes` uitgebreid met optionele `includeNegativeExamples` parameter                                        |
| EDGE-200 | Meeting zonder extractions (leeg) → ThemeTagger wordt niet aangeroepen, geen error                                       |
| EDGE-201 | ThemeTagger Zod-fail → error gelogd, meeting gaat door zonder themes; niet hele pipeline crashen                         |

## Bronverwijzingen

- PRD: `docs/specs/prd-themes.md` → §4.4 batch-run, §5.1 pipeline-positie, §4.6 scope alle meetings
- Repo: `packages/ai/src/pipeline/gatekeeper-pipeline.ts` — bestaande pipeline-file
- Repo: `packages/database/src/mutations/` — nieuwe `meeting-themes.ts` hier

## Context

### Pipeline-wijziging

```
[bestaand]                                                  [nieuw]
Gatekeeper → (gereject? stop)
           → Summarizer
           → Extractor
           → Embed + Save                  parallel →  ThemeTagger
```

ThemeTagger draait parallel aan embed-save zodat totale pipeline-tijd laag blijft.

### Nieuwe mutations

```typescript
// packages/database/src/mutations/meeting-themes.ts
export async function linkMeetingToThemes(client, meetingId, matches: Match[]);
export async function createEmergingTheme(client, proposal: Proposal);
export async function recalculateThemeStats(client, themeIds: string[]);
```

### Batch-run script

`scripts/batch-tag-themes.ts` → leest `meetings WHERE status='verified' AND id NOT IN (SELECT meeting_id FROM meeting_themes)`, runt ThemeTagger, schrijft weg. Console-log per meeting voor voortgang. Draait via `npx tsx scripts/batch-tag-themes.ts [--force] [--limit=N]`.

### Error-handling

Elke stap in ThemeTagger-integratie moet falen naar "meeting gaat door zonder themes" — nooit de hele pipeline breken. Errors loggen in Sentry / console.

## Deliverables

- [ ] `packages/ai/src/pipeline/gatekeeper-pipeline.ts` — ThemeTagger-stap toegevoegd
- [ ] `packages/database/src/mutations/meeting-themes.ts` — `linkMeetingToThemes`, `createEmergingTheme`, `recalculateThemeStats`
- [ ] `packages/database/src/queries/themes.ts` — `listVerifiedThemes` uitgebreid met negative_examples join
- [ ] `scripts/batch-tag-themes.ts` — one-off batch script
- [ ] Integratie-test: mock pipeline-run met Supabase local → verified meeting krijgt meeting_themes rows

## Acceptance criteria

- Nieuwe meeting door pipeline → `meeting_themes` rows verschijnen binnen 30s na save.
- Batch-run over N bestaande meetings → N entries in `meeting_themes` (of 0 als geen match), 0 duplicates bij re-run.
- Pipeline crasht niet als ThemeTagger error gooit — rest van extractions blijft werken.
- `mention_count` per thema komt overeen met daadwerkelijke count in junction-tabel.

## Handmatige test-stappen

1. Push test-transcript door echte pipeline op staging.
2. Check `meeting_themes` en `themes` tabellen.
3. `npx tsx scripts/batch-tag-themes.ts --limit=5` → verwerkt 5 meetings, geen duplicates.
4. Re-run zelfde command → "0 meetings to process".
5. `--force` flag → hertagt alle 5 opnieuw.
6. Check `/agents` pagina: ThemeTagger toont hit-count.

## Out of scope

- UI (TH-004).
- Review-flow voor emerging themes (TH-006).
- Handmatig re-taggen via UI-knop (TH-006).
- Candidate-pool / v1.5 vangnet (uitgesteld).
