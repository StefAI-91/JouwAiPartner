# Sprint 041: Action Item Specialist — productie-integratie

> **Scope.** De Action Item Specialist (Sonnet 4.6, prompt v5, single-stage) hangen aan de gatekeeper-pipeline zodat elke verwerkte meeting automatisch action_items naar de `extractions`-tabel schrijft. Volledig non-blocking, idempotent per meeting. Bouwt op het bestaande agent-framework dat al volledig in productie staat — alleen nooit in de hoofdpijplijn is opgenomen.
>
> **Aanleiding.** Het agent-framework, de schema's, de gates, de validator en de harness staan klaar (`packages/ai/src/agents/action-item-specialist.ts`). Tot nu toe enkel via `apps/cockpit/.../dev/action-items` als dry-run aangesproken voor prompt-tuning. Productie-meetings krijgen nog géén AI-gegenereerde action_items in `extractions`. Deze sprint sluit die gap met dezelfde architectuur die de RiskSpecialist gebruikt.

## Doel

Aan het eind van deze sprint:

1. Draait de Action Item Specialist automatisch in de gatekeeper-pipeline op iedere nieuwe meeting, parallel aan de RiskSpecialist, op `bestTranscript`.
2. Worden geaccepteerde items als `extractions` met `type='action_item'` weggeschreven, idempotent per meeting (re-run wist alleen specialist-rijen, niet handmatig toegevoegde items).
3. Wordt een nieuwe telemetrie-tabel `experimental_action_item_extractions` aangemaakt en gevuld met run-metrics (model, prompt-versie, tokens, latency, accept/gate counts, error).
4. Wordt de specialist-output meegenomen door de embed-step (zelfde `embedding_stale=true` mechanisme als andere extractions).
5. Verandert er **niks** aan UI, MCP-tools of review-flow — die lezen al action_item-rijen uit `extractions` en blijven backwards compatible (drift-checks 1 + 2 hieronder).

Niet in scope: UI-aanpassingen voor `type_werk` / `follow_up_date` / `recipient_per_quote`, promotie naar `tasks`, herstructurering van bestaande handmatige action_items, observability-dashboard voor de nieuwe agent.

## Requirements

| ID       | Beschrijving                                                                                                                                                                                                                                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI-050   | Nieuwe productie-step `runActionItemSpecialistStep` in `packages/ai/src/pipeline/steps/action-item-specialist.ts` (analoog aan `runRiskSpecialistStep`)                                                                                                                                                                            |
| AI-051   | Step gebruikt `runActionItemSpecialist` in **single-stage** modus, prompt **v5**, met `validateAction: true` (default uit agent)                                                                                                                                                                                                   |
| AI-052   | Step is never-throws: agent-failure, save-failure en telemetrie-failure zijn onafhankelijk gevangen en gelogd via `console.error`                                                                                                                                                                                                  |
| AI-053   | Bij agent-crash wordt een error-rij naar `experimental_action_item_extractions` weggeschreven (`error` gevuld, `items: []`) zodat "did it fail?" onderscheidbaar blijft van "did it not run?"                                                                                                                                      |
| FUNC-110 | Nieuwe save-helper `saveActionItemExtractions` in `packages/ai/src/pipeline/save-action-item-extractions.ts` (kopie-pattern van `save-risk-extractions.ts`)                                                                                                                                                                        |
| FUNC-111 | Save-helper schrijft per item één `extractions`-rij met: `type='action_item'`, `content`, `transcript_ref=source_quote`, `confidence`, `reasoning`, `verification_status='draft'`, `embedding_stale=true`                                                                                                                          |
| FUNC-112 | Metadata-shape: `{ assignee, deadline, follow_up_date, follow_up_contact, type_werk, category, recipient_per_quote, jaip_followup_quote, jaip_followup_action, project_context, source: "action_item_specialist" }` (null-velden weglaten)                                                                                         |
| FUNC-113 | Project-mapping conform RiskSpecialist-pattern: match op `project_context` naam tegen `identifiedProjects`, fallback op primary project, anders null                                                                                                                                                                               |
| FUNC-114 | Idempotentie: vóór insert eerst alle bestaande `action_item`-rijen voor deze meeting met `metadata->>'source' = 'action_item_specialist'` verwijderen. Handmatig toegevoegde items (zonder source-marker) blijven staan                                                                                                            |
| FUNC-115 | `processMeeting` in `gatekeeper-pipeline.ts` start de step parallel aan `riskSpecialistPromise` (na step 7.5 theme-detector, vóór step 8 summarize), awaits hem **vóór step 11b link-themes** zodat embed alle rows pakt                                                                                                           |
| FUNC-116 | Nieuwe mutation `insertExperimentalActionItemExtraction` in `packages/database/src/mutations/extractions/experimental-action-items.ts` — append-only, schrijft per run één rij                                                                                                                                                     |
| FUNC-117 | Mutation re-export via `packages/database/src/mutations/extractions/index.ts`                                                                                                                                                                                                                                                      |
| DATA-040 | Nieuwe migratie `experimental_action_item_extractions` tabel: `id` (uuid), `meeting_id` (fk), `model`, `prompt_version`, `mode` (default `'single'`), `items` (jsonb), `gated` (jsonb), `accept_count` (int), `gate_count` (int), `latency_ms`, `input_tokens`, `output_tokens`, `reasoning_tokens`, `error`, `created_at` (now()) |
| DATA-041 | RLS enabled, permissive read voor authenticated users, write alleen via service role (zelfde policy-shape als `experimental_risk_extractions`)                                                                                                                                                                                     |
| DATA-042 | Index op `(meeting_id, created_at desc)` voor latest-run-per-meeting queries                                                                                                                                                                                                                                                       |
| RULE-050 | Confidence-threshold in productie: **0** (alle items die de gates passen worden bewaard). Schema dwingt agent al naar 0.4 minimum; een UI-cutoff kan altijd later worden toegevoegd                                                                                                                                                |
| RULE-051 | Stage-3 action-validator staat AAN (`validateAction: true`). Validator-rejects landen NIET in productie-extractions; ze staan wel in `experimental_action_item_extractions.gated` als audit                                                                                                                                        |
| EDGE-050 | Meeting zonder bruikbaar transcript → step skipt direct, schrijft een telemetrie-rij met `error: "no transcript"` en gaat door                                                                                                                                                                                                     |
| EDGE-051 | 0 geaccepteerde items na gate+validator → save-helper wist nog steeds bestaande specialist-rijen voor deze meeting (intent: "deze run zegt: geen action_items"), telemetrie-rij vastleggen met `accept_count: 0`                                                                                                                   |
| EDGE-052 | Validator-call crasht → fail-open, item passes (zelfde gedrag als de agent al heeft). Logging in `console.error`                                                                                                                                                                                                                   |
| EDGE-053 | Re-run op verified meeting → specialist-rijen worden vervangen, handmatige rijen blijven, verified rijen worden NIET overschreven (filter: `verification_status != 'verified'` toevoegen aan delete?)                                                                                                                              |

> **Open vraag bij EDGE-053:** moeten we ook al-verified specialist-rijen behouden bij een re-run, of mogen die vervangen worden? Voorzet: behouden (verification = waarheid; AI mag waarheid niet overschrijven). Stef bevestigen vóór implementatie.

## Bronverwijzingen

- **Blueprint step:** `packages/ai/src/pipeline/steps/risk-specialist.ts` — pattern voor never-throws + dual-write (productie + telemetrie)
- **Blueprint save-helper:** `packages/ai/src/pipeline/save-risk-extractions.ts` — idempotent replace-by-type, project-mapping
- **Blueprint mutation:** `packages/database/src/mutations/extractions/experimental-risks.ts` + analoge migratie in `packages/database/supabase/migrations/`
- **Pipeline-call site:** `packages/ai/src/pipeline/gatekeeper-pipeline.ts` regels 287-310 (RiskSpecialist start) + 350-355 (await-volgorde vóór link-themes/embed)
- **Agent zelf:** `packages/ai/src/agents/action-item-specialist.ts` — `runActionItemSpecialist` (single-stage) is publieke entry; `ACTION_ITEM_SPECIALIST_MODEL` constante voor model-naam
- **Schema:** `packages/ai/src/validations/action-item-specialist.ts` → `ActionItemSpecialistItem`
- **Bestaande consumers van `metadata.assignee`/`metadata.deadline`** (drift-check 1):
  - `packages/mcp/src/tools/actions.ts` regel 255: `metadata->>assignee.ilike` filter
  - `packages/database/src/queries/action-items.ts` regel 7: leest `metadata.assignee/deadline/scope`
- **Handmatige writer** (drift-check 2): `apps/cockpit/src/features/meetings/components/add-extraction-form.tsx` schrijft `type='action_item'` zonder source-marker
- **Harness (geen wijzigingen, blijft dry-run):** `apps/cockpit/src/app/(dashboard)/dev/action-items/`
- **Vision:** `docs/specs/vision-ai-native-architecture.md` — Cockpit-quadrant; AI als Project Manager die signalen capteert

## Context

### Wat er al staat (geen werk)

- Agent volledig: single-stage, two-stage, validator, gates, follow-up resolver, golden-comparison
- Prompts v2/v3/v4/v5 op disk (`packages/ai/prompts/action_item_specialist*.md`)
- Telemetrie via `withAgentRun` schrijft `agent_runs`-rijen — die blijven werken zonder wijziging
- DB-tabel `extractions` ondersteunt `type='action_item'` al sinds sprint 005
- MCP `get_action_items` leest al uit `extractions` met `type='action_item'`
- Embed-step pakt alle `embedding_stale=true` extractions, ongeacht type — geen wijziging nodig

### Wat ontbreekt

1. **Step-bestand** dat de agent in de pipeline-context aanroept
2. **Save-helper** die de output normaliseert naar `ExtractionInsertRow[]` met de juiste metadata-shape
3. **Telemetrie-tabel + mutation** voor run-audit
4. **Aanroep in `processMeeting`** met juiste `Promise.all`/`await`-volgorde

### Ontwerpkeuzes (door Stef bevestigd, 2026-04-27)

| Vraag             | Beslissing                                                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Modus             | **single-stage, prompt v5** — goedkoper dan two-stage, v5 is de nieuwste prompt met sales-context-nuance                               |
| Transcript        | **`bestTranscript` van pipeline** (elevenlabs_named → elevenlabs → fireflies fallback). Zelfde input als RiskSpecialist + Summarizer   |
| Storage           | **`transcript_ref = source_quote`**, **rest in `metadata`** met fixed shape (zie FUNC-112)                                             |
| Idempotentie      | **Replace-by-source-marker**: delete only `metadata->>'source' = 'action_item_specialist'`, handmatige rows blijven                    |
| Telemetrie        | **Nieuwe tabel** `experimental_action_item_extractions` (analoog aan risks) — niet de productie-extractions vervuilen met run-metadata |
| Validator         | **AAN** (agent default) — extra Haiku-call per C/D-item is goedkoop en compenseert rationalisatie                                      |
| Confidence cutoff | **0** — agent gaat zelf al niet onder 0.4; productie-cutoff is een latere UI-keuze                                                     |

### Drift-risico's met fix

1. **MCP-compat** ✅ — `get_action_items` filtert op `metadata->>assignee` en `metadata->>deadline`. Onze keys passen 1-op-1. Geen breaking change.
2. **Handmatige action_items** ✅ — `add-extraction-form.tsx` schrijft zonder `metadata.source`. Onze delete filtert op `source = 'action_item_specialist'` zodat handmatig werk blijft.
3. **Verified specialist-rijen** ⚠️ — open vraag in EDGE-053. Voorzet: filter delete óók op `verification_status != 'verified'` zodat een eenmaal-geverifieerde extraction niet door een re-run overschreven wordt.

### Pipeline-volgorde (concreet)

In `processMeeting`, na step 7.5 theme-detector, parallel met RiskSpecialist:

```ts
// Step 8a (parallel start)
const riskSpecialistPromise = runRiskSpecialistStep(...);  // bestaand
const actionItemPromise = runActionItemSpecialistStep(     // NIEUW
  meetingId,
  bestTranscript,
  {
    title: input.title,
    meeting_type: finalMeetingType,
    party_type: partyType,
    meeting_date: input.date,
    participants: <participants met role/org/org_type>,
  },
  identifiedProjects,
);

// ... step 8 summarize ... step 9 title ... step 10 tag-and-segment ...

// Step 11a (TH-011): await beide vóór link-themes + embed
await Promise.all([riskSpecialistPromise, actionItemPromise]);

// Step 11b: link-themes + 11c: embed pakken nu ook action_item-rows mee
```

### Participant-context bouwen

`ActionItemSpecialistContext.participants` heeft `role`, `organization`, `organization_type` per persoon — die info hangt aan `meeting_attendees` + de `speakerMap`. Helper nodig die deze bouwt vanuit wat de pipeline al heeft. Zelfde data als RiskSpecialist al gebruikt; in `gatekeeper-pipeline.ts` regel 296-305 staat een vergelijkbare context-build waar we van kunnen kopiëren.

## Bouwvolgorde

1. **Migratie** voor `experimental_action_item_extractions` (DATA-040/041/042)
2. **Mutation** `insertExperimentalActionItemExtraction` + re-export (FUNC-116/117)
3. **Save-helper** `saveActionItemExtractions` (FUNC-110/111/112/113/114)
4. **Step** `runActionItemSpecialistStep` (AI-050/051/052/053)
5. **Aanroep** in `processMeeting` met juiste await-volgorde (FUNC-115)
6. **Test** op één productie-meeting via dev-trigger (geen automatische deploy yet) — verifieer:
   - Rijen verschijnen in `extractions` met `metadata.source = 'action_item_specialist'`
   - Telemetrie-rij in `experimental_action_item_extractions`
   - Embed-step pakt ze (`embedding != null` na pipeline)
   - MCP `get_action_items` ziet ze terug
   - Verified-pad in review-UI werkt onveranderd

## Acceptatiecriteria

- [ ] Migratie loopt schoon door op staging
- [ ] `npm run type-check` en `npm run lint` groen
- [ ] Geen wijzigingen in `apps/*/components` of MCP-tools (alleen DB-write toegevoegd)
- [ ] Eén productie-meeting handmatig getriggerd → zowel `extractions`-rijen als telemetrie-rij aanwezig
- [ ] Re-run op dezelfde meeting → telemetrie krijgt 2e rij, specialist-extractions worden vervangen, eventuele handmatige rijen blijven
- [ ] `npm run dep-graph` regenereert zonder errors
- [ ] Tests: minimaal save-helper-test (DB-payload capture) + step-test (agent-mock + assert telemetrie + assert save-call). Pipeline-integratietest mag in een latere sprint
