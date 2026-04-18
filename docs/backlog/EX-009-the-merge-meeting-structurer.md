# Micro Sprint EX-009: The Merge — MeetingStructurer in productie

> **Scope:** De grote productie-transitie. Alle 9 getunede type-specialists worden samengevoegd tot één `MeetingStructurer` agent die in één Sonnet-call alle 14 types (9 Tier-1 + 5 Tier-2) emit. Summarizer en Extractor worden uit productie gehaald. Cost halveert. Deterministische markdown-renderer komt erbovenop.

## Doel

Na EX-001 t/m EX-008 hebben we 9 getunede, battle-tested type-specialists op de harness. Deze sprint consolideert ze tot één productie-agent, schakelt de pipeline over, en introduceert de 5 Tier-2 types (idea/insight/client_sentiment/pricing_signal/milestone) als `untuned` data die in de achtergrond accumuleert.

## Requirements

| ID        | Beschrijving                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| AI-E090   | Nieuwe agent `packages/ai/src/agents/meeting-structurer.ts` — single Sonnet-call met merged prompt                                    |
| AI-E091   | Prompt samengesteld uit 9 getunede type-prompts + 5 Tier-2 type-instructies (kortere, niet-getunede secties)                          |
| AI-E092   | Output schema: `{ briefing, kernpunten[], deelnemers[], entities }` waarbij `kernpunten[]` gestructureerde rijen zijn                 |
| AI-E093   | Elk kernpunt heeft: theme, type (enum uit 14), content, source_quote, project_id, confidence, metadata                                |
| AI-E094   | Tier-2 types krijgen `tuning_status='untuned'` automatisch in save-extractions                                                        |
| AI-E095   | Tier-1 types krijgen `tuning_status='tuned'` automatisch                                                                              |
| AI-E096   | Prompt-caching (`cacheControl: ephemeral`) werkt op systemprompt voor cost-optimalisatie                                              |
| FUNC-E100 | `packages/ai/src/pipeline/summary-pipeline.ts` roept MeetingStructurer aan i.p.v. Summarizer                                          |
| FUNC-E101 | `packages/ai/src/pipeline/gatekeeper-pipeline.ts` roept MeetingStructurer aan i.p.v. Extractor (action_items komen nu uit structurer) |
| FUNC-E102 | Nieuwe functie `renderMeetingSummary(structuredOutput): string` — deterministische markdown-renderer, geen AI                         |
| FUNC-E103 | Renderer produceert exact equivalente markdown als huidige `formatSummary()` (backward-compat voor UI)                                |
| FUNC-E104 | `save-extractions.ts` schrijft alle 14 types naar `extractions` tabel met juiste metadata-mapping                                     |
| DATA-E090 | Alle 5 Tier-2 types (`idea`, `insight`, `client_sentiment`, `pricing_signal`, `milestone`) toegevoegd aan type-enum                   |
| DATA-E091 | `save-extractions` respecteert `tuning_status` — Tier-2 default untuned                                                               |
| DATA-E092 | `source_agent` kolom toont 'meeting-structurer' voor alle nieuwe rijen                                                                |
| QUAL-E090 | Geen regressie op bestaande meetings: snapshot-test van markdown-output vóór/na migratie matcht                                       |
| QUAL-E091 | Productie-kosten per meeting gehalveerd (1 Sonnet-call i.p.v. 2) — verify via telemetry                                               |
| QUAL-E092 | Spot-check 10 meetings na deploy: output-kwaliteit per type >= niveau van individuele specialist-runs                                 |
| RULE-E090 | Legacy `summarizer.ts` en `extractor.ts` worden NIET verwijderd in deze sprint (rollback-safety); wel gedeactiveerd in pipeline       |
| RULE-E091 | Tier-2 types zijn niet zichtbaar in productie-UI zonder admin-toegang                                                                 |
| RULE-E092 | Bestaande extractie-rijen blijven intact; geen backfill nodig voor rollout                                                            |
| EDGE-E090 | Meeting met extreem lang transcript (>100k tokens) → fallback naar oude pipeline of chunking-strategie                                |
| EDGE-E091 | Agent-call timeout → retry met exponentieel backoff; dan fallback naar legacy pipeline                                                |
| EDGE-E092 | Output met ontbrekend `briefing` veld → validatie-error, geen partial save                                                            |

## Bronverwijzingen

- EX-000 t/m EX-008 (alle type-specialists moeten tuned zijn)
- Huidige pipeline: `packages/ai/src/pipeline/summary-pipeline.ts`, `gatekeeper-pipeline.ts`, `save-extractions.ts`
- Huidige agents: `packages/ai/src/agents/summarizer.ts`, `extractor.ts`
- Huidige renderer: `formatSummary()` in `summarizer.ts` regel ~215
- Vision: §3.1 bridges — deze sprint realiseert de "knowledge → context" brug

## Context

### Probleem

Na 8 type-sprints hebben we 9 goede type-specialists op de harness, maar productie draait nog steeds op de oude Summarizer + Extractor combinatie:

- Summary produceert markdown (niet queryable voor nieuwe panelen)
- Extractor produceert alleen action_items
- Dubbele Sonnet-call per meeting (cost)
- Drift-risico tussen beide

### Oplossing

**Eén samengestelde agent** met alle types in één call. Het schema blijft `{ briefing, kernpunten[], deelnemers[], entities }` maar `kernpunten[]` wordt een array van gestructureerde objects i.p.v. markdown-strings. Een deterministische renderer maakt daarvan alsnog de leesbare markdown voor de UI.

### Merged prompt structuur

```
Je bent de Meeting Structurer. Eén pass over het transcript.

OUTPUT STRUCTUUR:
1. briefing (narrative, 3-5 zinnen)
2. kernpunten[] — gestructureerde items (zie types hieronder)
3. deelnemers[]
4. entities (clients + people mentioned)

KERNPUNT-TYPES — 14 totaal:

TIER 1 (getuned, volledig gedetailleerde instructies):
1. action_item     [prompt-fragment uit extractor.ts, behouden]
2. decision        [prompt-fragment uit EX-002]
3. risk            [prompt-fragment uit EX-001]
4. need            [prompt-fragment uit EX-004]
5. commitment      [prompt-fragment uit EX-003]
6. question        [prompt-fragment uit EX-005]
7. signal          [prompt-fragment uit EX-006]
8. context         [prompt-fragment uit EX-007]
9. vision          [prompt-fragment uit EX-008]

TIER 2 (ongetuned, compacte instructies — emitten met lower confidence):
10. idea            (overwogen richting, geen besluit)
11. insight         (meta-observatie, patroon)
12. client_sentiment (emotioneel signaal van klant)
13. pricing_signal  (budget/geld-uitspraak)
14. milestone       (projectvoortgang-moment)

KERNREGELS:
- Extraheer ruimhartig; beter meer dan minder
- Confidence 0-1 per item
- source_quote altijd uit transcript
- Bij twijfel type: prefereer de minder-invasieve (signal > risk, idea > decision)
```

### Rollout-strategie

1. Feature flag `USE_MEETING_STRUCTURER` (env var) default `false` op productie.
2. Deploy code met nieuwe agent + flag off → oude pipeline blijft draaien.
3. Flag on voor één test-meeting in productie → verifieer output + kosten.
4. Flag on voor nieuwe meetings voor 48 uur → monitor error rate.
5. Flag on permanent → oude agents dead code (wordt in volgende sprint verwijderd).

### Files touched

| Bestand                                                   | Wijziging                                     |
| --------------------------------------------------------- | --------------------------------------------- |
| `packages/ai/src/agents/meeting-structurer.ts`            | nieuw — merged agent                          |
| `packages/ai/src/validations/meeting-structurer.ts`       | nieuw — structured kernpunten schema          |
| `packages/ai/src/agents/render-summary.ts`                | nieuw — deterministische markdown-renderer    |
| `packages/ai/src/pipeline/summary-pipeline.ts`            | schakelt naar structurer bij flag on          |
| `packages/ai/src/pipeline/gatekeeper-pipeline.ts`         | schakelt naar structurer bij flag on          |
| `packages/ai/src/pipeline/save-extractions.ts`            | handle alle 14 types, zet tuning_status       |
| `supabase/migrations/20260428000001_tier2_types.sql`      | 5 Tier-2 types aan enum toevoegen             |
| `supabase/migrations/20260428000002_source_agent.sql`     | `source_agent` kolom op extractions           |
| `packages/ai/__tests__/agents/meeting-structurer.test.ts` | nieuw — integration test                      |
| `packages/ai/__tests__/agents/render-summary.test.ts`     | nieuw — snapshot test vs legacy formatSummary |
| `packages/ai/__tests__/pipeline/summary-pipeline.test.ts` | extend — feature flag branches                |
| Env: `USE_MEETING_STRUCTURER` in `.env.example`           | nieuw                                         |

### Niet-verwijderd

- `packages/ai/src/agents/summarizer.ts` blijft code in de repo (alleen niet aangeroepen).
- `packages/ai/src/agents/extractor.ts` idem.
- Verwijdering in een volgende opruim-sprint.

## Prerequisites

EX-001 t/m EX-008 moeten ALLE done zijn. Elk type moet `tuned` status hebben na zijn sprint.

## Taken

### TDD-first

- [ ] Schrijf `meeting-structurer.test.ts`:
  - Integration test met echte AI-call op 1 representatieve meeting (or mocked for CI).
  - Verify: output bevat alle 14 types (of plausibele subset), briefing niet leeg, kernpunten structured.
  - Verify: Tier-1 types krijgen tuned, Tier-2 krijgen untuned in save.
- [ ] Schrijf `render-summary.test.ts`:
  - Snapshot test: input structured output → output markdown. Matcht legacy `formatSummary()` output op 3 voorbeeld-meetings.
- [ ] Schrijf pipeline-tests voor beide branches (flag on/off).

### Database

- [ ] Migratie 1: Tier-2 types aan enum.
- [ ] Migratie 2: `source_agent` kolom op extractions.
- [ ] Types regenereren.

### Agent + renderer

- [ ] Verzamel 9 getunede prompt-fragments uit `test-extractors/*.ts` (elk heeft zijn eigen system-prompt).
- [ ] Schrijf merged prompt in `meeting-structurer.ts` — structureer per type genummerd.
- [ ] Voeg Tier-2 type-instructies toe (kort, lagere verwachtingen).
- [ ] Implementeer `render-summary.ts` — pure functie, geen AI.

### Pipeline

- [ ] Feature flag check toevoegen in summary-pipeline en gatekeeper-pipeline.
- [ ] `save-extractions.ts` aanpassen: mapping van kernpunten → rijen met juiste metadata + tuning_status.
- [ ] Backward-compat voor oude markdown-summaries in bestaande `summaries` tabel.

### Monitoring

- [ ] Voeg telemetry toe: token-usage, latency, per-type count.
- [ ] Dashboard-check na deploy: kosten gehalveerd.

### Rollout

- [ ] Flag off deployen.
- [ ] Test op 1 meeting productie, verify output + opslag.
- [ ] Flag on, monitor 48u.
- [ ] Flag permanent.

### Validatie

- [ ] Alle tests groen.
- [ ] Snapshot-test markdown-renderer matcht legacy output.
- [ ] Handmatig: 10 recente meetings draaien door nieuwe pipeline → spot-check kwaliteit.
- [ ] Cost-review: verify halvering.

## Acceptatiecriteria

- [ ] [AI-E090-E096] Merged agent werkt, cache actief.
- [ ] [FUNC-E100-E104] Pipeline gebruikt structurer, renderer produceert juiste markdown.
- [ ] [DATA-E090-E092] Tier-2 types in DB, source_agent gevuld.
- [ ] [QUAL-E090] Snapshot test groen (backward-compat).
- [ ] [QUAL-E091] Cost-telemetry bevestigt halvering.
- [ ] [QUAL-E092] 10-meeting spot-check passeert.
- [ ] [RULE-E090] Legacy agents bestaan nog in repo.
- [ ] [RULE-E091] Tier-2 niet zichtbaar zonder admin.
- [ ] [RULE-E092] Geen backfill-errors op bestaande data.
- [ ] [EDGE-E090-E092] Long transcripts, timeouts, missing fields gedekt.

## Dependencies

EX-001 t/m EX-008 — ALLE moeten tuned zijn. Blokkerende dependency.

## Out of scope

- Verwijderen van legacy summarizer/extractor (volgende cleanup-sprint).
- Re-processing van historische meetings (optionele follow-up sprint).
- Tunen van Tier-2 types (gebeurt pas als hun consumer komt).
- Cost-optimalisaties verder dan halvering (Haiku voor briefing etc.).
- UI-panelen voor Tier-2 types (komen bij activering per type).

## Toekomstige volg-sprints (niet in deze tranche)

- Cleanup-sprint: legacy agents verwijderen, oude tests opruimen.
- Per Tier-2 type een eigen activatie-sprint wanneer consumer (Communicator, Planner, etc.) wordt gebouwd.
- Historische re-processing als klant-portal lanceert.
