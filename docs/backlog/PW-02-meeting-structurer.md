# Micro Sprint PW-02: MeetingStructurer + test-harness

> **Scope:** Bouw één gemergde `MeetingStructurer` agent die alle 14 types (9 Tier-1 + 5 Tier-2) in één Sonnet-call emit. Bouw test-harness `/dev/extractor` met per-type dropdown voor prompt-tuning. Deploy met feature flag + fallback naar legacy. Panelen uit PW-01 schakelen over naar structured queries.

## Doel

Vervang Summarizer + Extractor in productie door één gemergde agent. Data wordt structured opgeslagen in `extractions` tabel met 14 types. Stef kan via `/dev/extractor` elk type apart testen op echte meetings en prompt-fragments aanscherpen. Kosten halveren (1 Sonnet-call ipv 2).

Belangrijkste winst: vanaf deploy bouwt de database structured data op voor álle types — inclusief Tier-2 types waarvoor nog geen agent bestaat — zodat future agents (Orchestrator, Risk Synthesizer, Communicator) direct historische data hebben.

## Requirements

| ID        | Beschrijving                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------- |
| AI-P020   | Nieuwe agent `packages/ai/src/agents/meeting-structurer.ts` (Sonnet) — 1 call, 14 types                 |
| AI-P021   | Output schema: `{ briefing, kernpunten[], deelnemers[], entities }` — `kernpunten` gestructureerd       |
| AI-P022   | Elk kernpunt: theme, type (14), content, source_quote, project_id, confidence, metadata                 |
| AI-P023   | Tier-1 types met volledig gedetailleerde prompt-instructies                                             |
| AI-P024   | Tier-2 types met compacte best-effort instructies                                                       |
| AI-P025   | Prompt-caching (`cacheControl: ephemeral`) op systemprompt                                              |
| AI-P026   | Bij twijfel risk/signal → prefereer signal (voorkomt false-positive risks)                              |
| DATA-P020 | Nieuw `packages/ai/src/extraction-types.ts` met `TIER_1_TYPES` / `TIER_2_TYPES`                         |
| DATA-P021 | Alle 14 types toegevoegd aan `extractions.type` enum (1 migratie)                                       |
| DATA-P022 | Metadata-velden per type gedocumenteerd in schema                                                       |
| FUNC-P020 | Test-harness `/dev/extractor` (admin-only)                                                              |
| FUNC-P021 | Harness: meeting-picker + type-picker (14 opties) + run-knop                                            |
| FUNC-P022 | Harness runt de merged MeetingStructurer en filtert output naar gekozen type                            |
| FUNC-P023 | Harness toont: transcript, fresh output voor dit type, huidige output uit DB, system-prompt (read-only) |
| FUNC-P024 | Harness slaat niks op in DB (ephemeral)                                                                 |
| FUNC-P025 | Feature flag `USE_MEETING_STRUCTURER` (env var, default `false`)                                        |
| FUNC-P026 | `summary-pipeline.ts` + `gatekeeper-pipeline.ts` respecteren de flag                                    |
| FUNC-P027 | Bij MeetingStructurer-failure → automatische fallback naar legacy Summarizer+Extractor                  |
| FUNC-P028 | Deterministische `renderMeetingSummary(structured): string` — produceert dezelfde markdown als legacy   |
| FUNC-P029 | `save-extractions.ts` schrijft alle 14 types met type-specifieke metadata-mapping                       |
| FUNC-P030 | PW-01 panelen (risks, decisions) schakelen van markdown-parse over naar structured DB-query             |
| FUNC-P031 | "Wie wacht op wie"-paneel gevuld met `type='commitment'` data (was placeholder in PW-01)                |
| FUNC-P032 | Meeting-detail krijgt admin-only sectie "Experimental extractions" met `TIER_2_TYPES` data              |
| QUAL-P020 | Snapshot-test: legacy `formatSummary()` output matcht nieuwe renderer op 3 bestaande meetings           |
| QUAL-P021 | Cost-halvering bevestigd via Vercel token-telemetry                                                     |
| QUAL-P022 | Per-type spot-check door Stef via harness op 5 meetings per type (Tier-1) — iteratief                   |
| RULE-P020 | Legacy `summarizer.ts` + `extractor.ts` blijven in repo (rollback-safety)                               |
| RULE-P021 | Tier-2 types alleen zichtbaar via admin-only sectie (niet op project-werkblad)                          |
| RULE-P022 | Geen backfill — bestaande rijen blijven intact                                                          |
| SEC-P020  | Harness + admin-sectie op meeting-detail vereisen `requireAdmin()`                                      |
| EDGE-P020 | Agent-timeout → 1 retry met backoff → fallback naar legacy                                              |
| EDGE-P021 | Output met ontbrekend `briefing` → validatie-error → fallback                                           |

## Bronverwijzingen

- PW-01 (prerequisite): panelen bestaan al met markdown-parse
- Shift mockup: `apps/cockpit/src/app/(dashboard)/shift/page.tsx`
- Huidige pipeline: `packages/ai/src/pipeline/summary-pipeline.ts`, `gatekeeper-pipeline.ts`, `save-extractions.ts`
- Huidige agents: `packages/ai/src/agents/summarizer.ts`, `extractor.ts`
- Gearchiveerde tranche: `docs/archive/extraction-tranche-v1/` — voor extra detail per type en metadata-velden

## Context

### Probleem

PW-01 werkt met markdown-parsing — dat is lelijk en traag ten opzichte van structured queries. Bovendien zijn commitments, questions, signals en andere types niet uit markdown te parsen (ze zitten er niet in). Om het werkblad volledig te maken én om future agents data te geven, moeten we naar structured extractie.

### Oplossing — één agent, 14 types, per-type testbaar

**Eén merged agent** i.p.v. per-type specialisten. Voordelen:

- 1 Sonnet-call ipv 2 (halvering kosten)
- Geen drift tussen summarizer en extractor
- Harness laat je per type testen via dropdown-filter

**Feature flag rollout:**

1. Deploy met flag `false` → oude pipeline draait.
2. Stef zet flag `true` → 1 test-meeting verifiëren.
3. 48u monitoring → flag permanent.
4. Oude agents ongebruikt maar nog in repo (cleanup later).

**Fallback:** bij elke fout in MeetingStructurer roept de pipeline automatisch de legacy Summarizer+Extractor aan. Stef krijgt een log-alert. Dit voorkomt dat een bug de Fireflies-flow breekt.

### De 14 types

**Tier-1 (9 types, volledig getuned, op project-werkblad):**
action_item, decision, risk, need, commitment, question, signal, context, vision

**Tier-2 (5 types, best-effort, alleen admin-sectie meeting-detail):**
idea, insight, client_sentiment, pricing_signal, milestone

Zie `docs/archive/extraction-tranche-v1/` voor metadata-velden per type — die blijven ongewijzigd.

### Harness-design

```
┌──────────────────────────────────────────────────────┐
│  /dev/extractor (admin-only)                         │
│                                                      │
│  Meeting: [dropdown recent verified ▾]               │
│  Type:    [risk ▾]          [RUN]                    │
│                                                      │
│  ┌─────────────┬──────────────┬─────────────────┐   │
│  │ Transcript  │ Huidige DB   │ Fresh output    │   │
│  │ (highlight) │ (type='risk')│ (alleen type=   │   │
│  │             │              │  'risk' uit     │   │
│  │             │              │  merged run)    │   │
│  └─────────────┴──────────────┴─────────────────┘   │
│                                                      │
│  System-prompt (read-only, collapsible)              │
└──────────────────────────────────────────────────────┘
```

De harness roept de volledige MeetingStructurer aan maar filtert de UI naar één type. Zo tune je in context (agent kent andere types) maar focus je review op één aspect.

### Panelen-upgrade

Na deploy:

- `risks-panel.tsx` (PW-01): `parseMarkdownExtractions()` → `listRisksByProject()`
- `decisions-panel.tsx`: idem → `listDecisionsByProject()`
- `waiting-placeholder.tsx` → vervangen door `commitments-panel.tsx` met echte data
- Nieuw: `questions-panel.tsx`, `needs-panel.tsx`, `signals-section.tsx`

### Files touched

| Bestand                                                             | Wijziging                           |
| ------------------------------------------------------------------- | ----------------------------------- |
| `packages/ai/src/extraction-types.ts`                               | nieuw — TIER constanten             |
| `packages/ai/src/agents/meeting-structurer.ts`                      | nieuw — merged agent                |
| `packages/ai/src/validations/meeting-structurer.ts`                 | nieuw — structured schema           |
| `packages/ai/src/agents/render-summary.ts`                          | nieuw — deterministische renderer   |
| `packages/ai/src/pipeline/summary-pipeline.ts`                      | feature-flag branch + fallback      |
| `packages/ai/src/pipeline/gatekeeper-pipeline.ts`                   | feature-flag branch                 |
| `packages/ai/src/pipeline/save-extractions.ts`                      | 14 types + metadata mapping         |
| `supabase/migrations/20260420000001_extractions_14_types.sql`       | alle types aan enum                 |
| `apps/cockpit/src/app/(dashboard)/dev/extractor/page.tsx`           | harness route                       |
| `apps/cockpit/src/app/(dashboard)/dev/extractor/client.tsx`         | harness UI                          |
| `apps/cockpit/src/actions/dev-extractor.ts`                         | Server Action runDevExtractor       |
| `apps/cockpit/src/components/dev-extractor/*.tsx`                   | meeting-picker, type-picker, panels |
| `apps/cockpit/src/components/projects/risks-panel.tsx`              | switch naar structured query        |
| `apps/cockpit/src/components/projects/decisions-panel.tsx`          | idem                                |
| `apps/cockpit/src/components/projects/commitments-panel.tsx`        | nieuw (vervangt placeholder)        |
| `apps/cockpit/src/components/projects/questions-panel.tsx`          | nieuw                               |
| `apps/cockpit/src/components/projects/needs-panel.tsx`              | nieuw                               |
| `apps/cockpit/src/components/projects/signals-section.tsx`          | nieuw (secundair onder risks)       |
| `apps/cockpit/src/components/meetings/experimental-extractions.tsx` | admin-only Tier-2 sectie            |
| `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx`           | sectie toevoegen                    |
| `packages/database/src/queries/extractions-by-type.ts`              | helpers per type                    |
| `.env.example`                                                      | `USE_MEETING_STRUCTURER=false`      |
| Tests: agent, renderer-snapshot, save-extractions, harness action   | nieuw                               |

### Niet verwijderd

`summarizer.ts` en `extractor.ts` blijven bestaan voor fallback. Cleanup in latere sprint.

## Prerequisites

PW-01 done (panelen bestaan).

## Taken

### TDD-first

- [ ] `meeting-structurer.test.ts`: mocked AI-call → 14 types in output; schema-validatie.
- [ ] `render-summary.test.ts`: snapshot-test op 3 voorbeeld-outputs vs legacy `formatSummary()`.
- [ ] `dev-extractor.action.test.ts`: admin required, ephemeral (geen DB-writes), timeout/fout-handling.

### Database

- [ ] Migratie: alle 14 types aan enum + `npm run db:types`.
- [ ] `extraction-types.ts` met TIER lists + helpers.

### Agent + renderer

- [ ] Merged prompt: 14 genummerde type-secties + briefing + deelnemers + entities.
- [ ] `render-summary.ts` als pure functie.
- [ ] Pipeline-integratie met feature flag + fallback-logic.
- [ ] `save-extractions` aanpassen voor 14 types.

### Harness

- [ ] Route `/dev/extractor` met admin-guard.
- [ ] Server Action `runDevExtractor(meetingId, type)` — runt MeetingStructurer, filtert output.
- [ ] UI: 3-panel view (transcript, huidige DB, fresh filtered).

### Panelen upgrade

- [ ] Switch risks/decisions panels van markdown-parse naar queries.
- [ ] Nieuwe panels: commitments, questions, needs, signals-section.
- [ ] Admin-only Tier-2 sectie op meeting-detail.

### Tunen (doorlopend door Stef)

- [ ] Per Tier-1-type: run 5 meetings via harness, itereer prompt-fragment tot kwaliteit goed genoeg.
- [ ] Kort log bijhouden per type: welke iteraties, welke lessen.

### Rollout

- [ ] Deploy met flag off.
- [ ] Test op 1 meeting in productie met flag on (via Vercel env).
- [ ] 48u monitoring.
- [ ] Flag permanent als stabiel.

### Validatie

- [ ] Alle tests groen.
- [ ] Snapshot-test renderer matcht legacy output.
- [ ] Cost-telemetry bevestigt halvering.
- [ ] Stef: 10-meeting spot-check → acceptabel.

## Acceptatiecriteria

- [ ] [AI-P020-P026] Merged agent werkt, alle 14 types.
- [ ] [DATA-P020-P022] Migratie + tier-lists + metadata gedocumenteerd.
- [ ] [FUNC-P020-P032] Harness werkt, pipeline geswapt, panelen upgraded.
- [ ] [QUAL-P020-P022] Snapshot + cost + spot-check akkoord.
- [ ] [RULE-P020-P022] Legacy bewaard, Tier-2 scoped, geen backfill.
- [ ] [SEC-P020] Admin-checks actief.
- [ ] [EDGE-P020-P021] Fallback werkt bij fouten.

## Dependencies

PW-01.

## Out of scope

- Verwijderen legacy agents (cleanup-sprint later).
- Tier-2 types in productie-UI (blijft admin-only).
- Project Orchestrator (komt in PW-03).
- Historische re-processing.
- Chunking voor extreem lange transcripts.
