# Micro Sprint EX-009: The Merge — MeetingStructurer in productie

> **Scope:** Alle 9 getunede type-specialists samengevoegd tot één `MeetingStructurer` agent die in één Sonnet-call alle 14 types (9 Tier-1 + 5 Tier-2) emit. Summarizer + Extractor uit productie. Cost halveert. Deterministische markdown-renderer.

## Doel

Na EX-001 t/m EX-008 hebben we 9 battle-tested type-specialists. Deze sprint consolideert ze tot één productie-agent, schakelt de pipeline over (via feature flag), en introduceert de 5 Tier-2 types zodat hun data vanaf nu automatisch opbouwt.

## Requirements

| ID        | Beschrijving                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------ |
| AI-E090   | Nieuwe agent `packages/ai/src/agents/meeting-structurer.ts` — single Sonnet-call met merged prompt     |
| AI-E091   | Prompt samengesteld uit 9 getunede type-prompts + 5 compacte Tier-2 instructies                        |
| AI-E092   | Output schema: `{ briefing, kernpunten[], deelnemers[], entities }` — `kernpunten[]` gestructureerd    |
| AI-E093   | Elk kernpunt: theme, type (uit TIER_1+TIER_2), content, source_quote, project_id, confidence, metadata |
| AI-E094   | Prompt-caching (`cacheControl: ephemeral`) op systemprompt                                             |
| FUNC-E100 | Feature flag `USE_MEETING_STRUCTURER` (env var). Default `false`. Pipeline schakelt aan bij `true`     |
| FUNC-E101 | `summary-pipeline.ts` + `gatekeeper-pipeline.ts` respecteren de flag                                   |
| FUNC-E102 | Bij falen van MeetingStructurer → fallback naar legacy Summarizer+Extractor pipeline                   |
| FUNC-E103 | Nieuwe functie `renderMeetingSummary(structured): string` — deterministisch, geen AI                   |
| FUNC-E104 | Renderer matcht markdown-output van legacy `formatSummary()` (snapshot-test)                           |
| FUNC-E105 | `save-extractions.ts` schrijft alle 14 types met juiste metadata-mapping                               |
| FUNC-E106 | Meeting-detail heeft admin-only sectie "Experimental extractions" die `TIER_2_TYPES` toont             |
| DATA-E090 | Alle 5 Tier-2 types toegevoegd aan `extractions.type` enum                                             |
| DATA-E091 | `extraction-types.ts` uit EX-001 up-to-date met alle Tier-2 types                                      |
| QUAL-E090 | Snapshot-test: legacy vs nieuwe markdown-output matcht op 3 bestaande meetings                         |
| QUAL-E091 | Cost-halvering bevestigd via token-telemetry (1 Sonnet-call ipv 2)                                     |
| QUAL-E092 | Spot-check door Stef op 10 meetings na flag-on: output-kwaliteit per type >= niveau van harness-runs   |
| RULE-E090 | Legacy `summarizer.ts` en `extractor.ts` blijven in repo (rollback-safety), niet aangeroepen           |
| RULE-E091 | Tier-2 types alleen zichtbaar op meeting-detail admin-sectie (niet in project-werkblad panelen)        |
| RULE-E092 | Bestaande extractie-rijen blijven intact; geen backfill                                                |
| EDGE-E090 | Agent-timeout → 1 retry met backoff, dan fallback naar legacy pipeline                                 |
| EDGE-E091 | Output met ontbrekend `briefing` → validatie-error, fallback naar legacy                               |

## Bronverwijzingen

- EX-000 t/m EX-008 (alle type-specialists tuned)
- Huidige pipeline: `packages/ai/src/pipeline/summary-pipeline.ts`, `gatekeeper-pipeline.ts`, `save-extractions.ts`
- Huidige agents: `packages/ai/src/agents/summarizer.ts`, `extractor.ts`
- Tier-infrastructuur: `packages/ai/src/extraction-types.ts` (uit EX-001)

## Context

### Probleem

Na 8 type-sprints hebben we 9 goede specialists, maar productie draait nog op oude Summarizer + Extractor (dubbele Sonnet-call, drift-risico, Extractor alleen action_items). Tier-2 types worden nog niet geëxtraheerd. Het is tijd voor de merge.

### Oplossing

**Eén samengestelde agent** met alle 14 types in één Sonnet-call. Schema blijft hetzelfde voor UI-compat (`briefing, kernpunten, deelnemers, entities`) maar `kernpunten[]` wordt array van gestructureerde objects. Een deterministische renderer maakt er markdown van.

### Merged prompt

```
Je bent de Meeting Structurer.

OUTPUT:
1. briefing (3-5 zinnen narratief)
2. kernpunten[] — gestructureerde items
3. deelnemers[]
4. entities (clients, people)

KERNPUNT-TYPES (14 totaal):

TIER 1 — volledig getuned [volledige prompt-fragmenten uit EX-001..EX-008]:
  action_item, decision, risk, need, commitment, question, signal, context, vision

TIER 2 — compact (emit met lower confidence, best-effort):
  idea             (overwogen richting, geen besluit)
  insight          (meta-observatie, patroon)
  client_sentiment (emotioneel signaal van klant)
  pricing_signal   (budget/geld-uitspraak)
  milestone        (projectvoortgang-moment)

KERNREGELS:
- Extraheer ruimhartig
- source_quote altijd uit transcript
- Bij twijfel type: prefereer zachtere classificatie
```

### Rollout-strategie (feature flag via Vercel env var)

1. Deploy code met `USE_MEETING_STRUCTURER=false` → oude pipeline blijft draaien.
2. Stef zet env var op `true` voor één test-meeting → verifieer output + kosten via Vercel logs.
3. Flag on voor 48u → monitor error rate.
4. Flag on permanent.
5. Oude agents dead code (verwijderen in opvolg-sprint).

### Fallback

Bij MeetingStructurer-failure (timeout, validatie-error, schema-mismatch): pipeline roept automatisch de legacy Summarizer + Extractor aan. Jij krijgt een alert (Slack/email of console). Dit voorkomt dat een bug in de nieuwe agent je Fireflies-flow breekt.

### Files touched

| Bestand                                                             | Wijziging                                         |
| ------------------------------------------------------------------- | ------------------------------------------------- |
| `packages/ai/src/agents/meeting-structurer.ts`                      | nieuw — merged agent                              |
| `packages/ai/src/validations/meeting-structurer.ts`                 | nieuw — structured kernpunten schema              |
| `packages/ai/src/agents/render-summary.ts`                          | nieuw — deterministische markdown-renderer        |
| `packages/ai/src/extraction-types.ts`                               | TIER_2_TYPES uitbreiden (al voorbereid in EX-001) |
| `packages/ai/src/pipeline/summary-pipeline.ts`                      | feature-flag branch                               |
| `packages/ai/src/pipeline/gatekeeper-pipeline.ts`                   | feature-flag branch                               |
| `packages/ai/src/pipeline/save-extractions.ts`                      | handle 14 types                                   |
| `supabase/migrations/20260428000001_tier2_types.sql`                | 5 Tier-2 types aan enum                           |
| `apps/cockpit/src/components/meetings/experimental-extractions.tsx` | nieuw — admin-only sectie op meeting-detail       |
| `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx`           | sectie toevoegen met admin-check                  |
| `.env.example`                                                      | `USE_MEETING_STRUCTURER=false`                    |
| `packages/ai/__tests__/agents/meeting-structurer.test.ts`           | integration test                                  |
| `packages/ai/__tests__/agents/render-summary.test.ts`               | snapshot-test vs legacy `formatSummary()`         |

### Niet verwijderd (in deze sprint)

- `packages/ai/src/agents/summarizer.ts` — blijft in repo, niet aangeroepen als flag on
- `packages/ai/src/agents/extractor.ts` — idem
- Cleanup-sprint daarna verwijdert ze definitief

## Prerequisites

EX-001 t/m EX-008 moeten done zijn. Elke type-specialist moet stabiel werken in de harness.

## Taken

### TDD-first

- [ ] `meeting-structurer.test.ts`: integration test met 1 voorbeeld-transcript (of mocked), verify 14 types in schema + correcte metadata-mapping.
- [ ] `render-summary.test.ts`: snapshot-test op 3 voorbeeld-structured-outputs, vergelijken met huidige `formatSummary()` output.

### Database

- [ ] Migratie Tier-2 types aan enum + `npm run db:types`.
- [ ] Update `extraction-types.ts` met complete TIER_2_TYPES lijst.

### Agent + renderer

- [ ] Verzamel 9 getunede prompt-fragments uit `test-extractors/*.ts`.
- [ ] Schrijf merged prompt in `meeting-structurer.ts` (genummerde secties per type).
- [ ] Voeg Tier-2 instructies toe (kort, best-effort).
- [ ] Implementeer `render-summary.ts` als pure functie.

### Pipeline

- [ ] Feature-flag check toevoegen in summary-pipeline + gatekeeper-pipeline.
- [ ] Fallback-logic: catch error → roep legacy pipeline aan + log.
- [ ] `save-extractions.ts` aanpassen voor alle 14 types.

### UI

- [ ] `ExperimentalExtractions` component op meeting-detail (admin-only via `requireAdmin()`).
- [ ] Query: `SELECT * FROM extractions WHERE meeting_id = X AND type IN (TIER_2_TYPES)`.

### Rollout

- [ ] Deploy met flag off.
- [ ] Stef zet flag on voor 1 test-meeting → verifieer via Vercel logs.
- [ ] 48u monitoring, flag permanent als stabiel.

### Validatie

- [ ] Alle tests groen.
- [ ] Snapshot-test renderer matcht legacy output.
- [ ] 10-meeting spot-check na flag-on: Stef akkoord.
- [ ] Cost-telemetry bevestigt halvering.

## Acceptatiecriteria

- [ ] [AI-E090-E094] Merged agent werkt.
- [ ] [FUNC-E100-E106] Pipeline + flag + fallback + renderer + meeting-detail sectie.
- [ ] [DATA-E090, E091] Tier-2 types in DB + code.
- [ ] [QUAL-E090] Snapshot-test groen.
- [ ] [QUAL-E091] Cost gehalveerd (1 Sonnet-call per meeting).
- [ ] [QUAL-E092] 10-meeting spot-check door Stef akkoord.
- [ ] [RULE-E090-E092] Legacy niet verwijderd, Tier-2 scoped, geen backfill.
- [ ] [EDGE-E090, E091] Timeout en validatie-error vangen fallback naar legacy.

## Dependencies

EX-001 t/m EX-008 — allemaal done en getuned.

## Out of scope

- Verwijderen legacy agents (volgt in cleanup-sprint).
- Tunen Tier-2 types (aparte activatie-sprints per consumer).
- Historische re-processing (optionele follow-up).
- Chunking-strategie voor extreem lange transcripts (edge case die in praktijk niet voorkomt).

## Toekomstige volg-sprints

- Cleanup: legacy agents verwijderen.
- Per Tier-2 type een activatie-sprint wanneer consumer komt (Portal → milestone, Communicator → client_sentiment, etc.).
- Project Orchestrator + Risk Synthesizer agents bovenop de extractions-laag.
