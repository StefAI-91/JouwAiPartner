# Micro Sprint EX-001: Risk extractor (eerste nieuwe type)

> **Scope:** Type-specialist agent voor `risk` bouwen, tunen op echte meetings via de harness, database uitbreiden met het type + `tuning_status` veld, en een risico-paneel in het project-werkblad tonen. Geen merge met productie-pipeline (dat gebeurt in EX-009).

## Doel

De eerste nieuwe extractie-type uitwerken en tunen: `risk`. Dit sprint zet ook de **infrastructuur** neer waar alle EX-002 t/m EX-008 sprints op voortbouwen: de `tuning_status` kolom op `extractions`, de registry-uitbreiding, de "bless as tuned"-flow in de harness, en het eerste type-specifieke project-workspace-paneel.

Aan het eind van deze sprint produceert de Risk Extractor plausibele, gereviewde risico's op 5-10 echte meetings, en zien admins die risico's terug op het project-werkblad (paneel "Risico's & stale").

## Requirements

| ID        | Beschrijving                                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| AI-E010   | Nieuwe agent `risk-extractor.ts` (Sonnet) leest transcript + context en emit risk-extracties                                      |
| AI-E011   | Risk-prompt onderscheidt risk van signal: risk = concrete waarschuwing met impact, signal = zwak signaal/observatie               |
| AI-E012   | Agent retourneert `severity` (low/medium/high/critical) op basis van explicit cues en impact                                      |
| AI-E013   | Agent retourneert `category` (financial/scope/technical/client_relationship/team/timeline)                                        |
| AI-E014   | Agent retourneert `time_horizon` (immediate/this_sprint/this_quarter/long_term)                                                   |
| AI-E015   | Agent vult `mitigation_hint` alleen als transcript een concrete mitigatie suggereert, anders null                                 |
| AI-E016   | Elke risk-extractie heeft `source_quote` uit transcript + `confidence` 0-1                                                        |
| AI-E017   | Agent is selectief: liever 2 scherpe risico's dan 8 zwakke (confidence ondergrens 0.5)                                            |
| DATA-E010 | Nieuwe kolom `tuning_status` op `extractions` tabel (enum: untuned/in_tuning/tuned), default `untuned`                            |
| DATA-E011 | `extractions.type` enum wordt uitgebreid met `risk` (als nog niet aanwezig)                                                       |
| DATA-E012 | Risk-metadata wordt opgeslagen in `extractions.metadata` jsonb met velden: severity, category, time_horizon, mitigation_hint      |
| DATA-E013 | Index op `(project_id, type, tuning_status)` voor snelle project-workspace queries                                                |
| FUNC-E020 | `risk` toegevoegd aan dropdown van `/dev/extractor` harness                                                                       |
| FUNC-E021 | Harness kan `risk` runnen via `TEST_EXTRACTOR_REGISTRY.risk` entry                                                                |
| FUNC-E022 | Nieuwe "Bless as tuned"-actie in harness: zet `tuning_status='tuned'` voor dit type (of update een config-waarde die UI gebruikt) |
| FUNC-E023 | Project-werkblad heeft paneel "Risico's" dat `extractions WHERE type='risk' AND tuning_status='tuned' AND project_id=X` toont     |
| FUNC-E024 | Paneel toont severity-dot (rood/oranje/grijs) + titel + 1-regel context + herkomst (meeting-link)                                 |
| FUNC-E025 | Paneel is leeg-staat-proof: "Geen risico's gedetecteerd voor dit project"                                                         |
| QUAL-E010 | Spot-check: >= 80% van risk-extracties op 5 willekeurige recent-verifieerde meetings is inhoudelijk correct volgens reviewer      |
| QUAL-E011 | Confidence-gemiddelde over spot-check >= 0.65                                                                                     |
| RULE-E010 | Risk-extracties met tuning_status='untuned' zijn niet zichtbaar in productie-UI (alleen in /dev/extractor)                        |
| RULE-E011 | Risk-extractor gebruikt geen verbinding met Summarizer- of Extractor-code; het is een standalone test-specialist                  |
| EDGE-E010 | Transcript waarin geen enkel risico staat → agent retourneert lege array, geen hallucinaties                                      |
| EDGE-E011 | Transcript met heel veel risico-woorden ("misschien", "zorgen", "risico") → agent blijft selectief                                |
| EDGE-E012 | Confidence < 0.5 → extractie wordt gefilterd weg voor UI (wel bewaard in DB voor diagnose)                                        |

## Bronverwijzingen

- EX-000 (prerequisite): `docs/backlog/EX-000-test-harness-dev-extractor.md`
- Index: `docs/backlog/EX-000-009-extraction-series-index.md`
- Vision: `docs/specs/vision-ai-native-architecture.md` §5.2 knowledge graph + §7.2 AI bereidt werk voor
- Shift mockup: `apps/cockpit/src/app/(dashboard)/shift/page.tsx` — paneel "Risico's & stale"
- Project-werkblad huidig: `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`
- Bestaande extractions tabel: zie migration `supabase/migrations/20260329000007_extractions.sql`

## Context

### Probleem

Risico's zitten nu opgesloten als markdown-strings in `summaries.kernpunten[]` met een `**Risico:**` prefix. Het project-werkblad kan er niet op filteren, agents kunnen er niet op query'en, en er is geen severity/category om op te prioriteren. Eerst dit type structureel extracten geeft de grootste directe waarde: het risico-paneel op het project-werkblad wordt bruikbaar.

### Oplossing

1. Bouw een focused Risk Extractor agent (Sonnet) met scherpe instructies voor wanneer iets wel/niet een risk is.
2. Breid de extractions tabel uit met `tuning_status` kolom + `risk` in type-enum.
3. Voeg een entry toe aan de test-harness registry.
4. Itereer op 5-10 echte meetings via `/dev/extractor` tot kwaliteit goed is.
5. "Bless as tuned" — zet alle bestaande + toekomstige risk-rijen op `tuning_status='tuned'` voor deze release.
6. Bouw het project-werkblad paneel dat deze data rendert.

### Risk vs Signal — het cruciale onderscheid

Deze sprint zet de toon voor hoe we types van elkaar onderscheiden. Expliciete regel in de prompt:

- **Risk:** concrete waarschuwing met vermoedelijke negatieve impact. "Deploy staat stil door ontbrekende credentials" → risk (scope+timeline, medium).
- **Signal:** observatie die (nog) geen schade is maar wel iets betekent. "Klant heeft 6 dagen niet gereageerd" → signal (kan later een risk worden als het aanhoudt).

Bij twijfel: de prompt prefereert `signal` (wordt later in EX-006 apart getuned). Dit voorkomt false-positives in het risico-paneel.

### Severity-calibratie

| severity | cue                                                                           |
| -------- | ----------------------------------------------------------------------------- |
| critical | blokkeert release/deploy/klanttraject nu; budget-overschrijding met zekerheid |
| high     | dreigt een deadline, commitment of klantrelatie te breken binnen weken        |
| medium   | maakt werk moeilijker, kan oplopen zonder actie, geen directe escalatie       |
| low      | zachte waarschuwing, gemakkelijk te mitigeren                                 |

### Risk-extractor files

| Bestand                                                               | Wijziging                                                      |
| --------------------------------------------------------------------- | -------------------------------------------------------------- |
| `packages/ai/src/agents/test-extractors/risk-extractor.ts`            | nieuw — Sonnet agent met focused prompt                        |
| `packages/ai/src/validations/test-extractors/risk.ts`                 | nieuw — Zod schema voor risk-output                            |
| `packages/ai/src/agents/test-extractors/registry.ts`                  | entry `risk` toevoegen                                         |
| `supabase/migrations/20260420000001_extraction_tuning_status.sql`     | nieuw — `tuning_status` enum + kolom met default `untuned`     |
| `supabase/migrations/20260420000002_extraction_type_risk.sql`         | nieuw — `risk` toevoegen aan type-enum (als ontbreekt) + index |
| `packages/database/src/types/database.ts`                             | regeneratie (npm run db:types)                                 |
| `packages/database/src/queries/risks.ts`                              | nieuw — `listRisksByProject(projectId)`                        |
| `apps/cockpit/src/components/projects/risk-panel.tsx`                 | nieuw — paneel op project-werkblad                             |
| `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`             | paneel toevoegen aan layout                                    |
| `packages/ai/__tests__/agents/test-extractors/risk-extractor.test.ts` | nieuw — unit + integration test via mocked AI SDK              |
| `apps/cockpit/src/components/projects/__tests__/risk-panel.test.tsx`  | nieuw — states: leeg/gevuld/severity-mix                       |

## Prerequisites

- EX-000 done (test-harness werkt, registry bestaat).
- DH-013/014/015 done (admin-rol check).

## Taken

### TDD-first

- [ ] Test `risk-extractor.test.ts`:
  - Mock Anthropic SDK, geef een fake transcript met 2 duidelijke risico's → assert exact 2 items, juiste severity/category.
  - Transcript zonder risico → lege array.
  - Transcript met signalen maar geen risico → lege array (onderscheid met signal).
  - Confidence onder 0.5 → extractie wordt gefilterd uit resultaat.
- [ ] Test `risk-panel.test.tsx`:
  - Render met 0 risks → leeg-staat-melding.
  - Render met 3 risks (low/medium/high) → juiste severity-dots, gesorteerd op severity DESC.
  - Render met 5 risks → toont alleen top 3, link "Toon alle".

### Database

- [ ] Migratie 1: `tuning_status` enum (untuned/in_tuning/tuned) + kolom op `extractions` met default `untuned` + backfill `tuned` voor bestaande rijen (om current action_item-data niet weg te filteren).
- [ ] Migratie 2: `risk` toevoegen aan `extractions.type` enum + index `idx_extractions_project_type_tuning`.
- [ ] `npm run db:types` voor TypeScript types.

### Agent + schema

- [ ] Zod schema `risk.ts` met verplichte velden + metadata.
- [ ] Agent `risk-extractor.ts` — Sonnet call via `generateObject`, focused system-prompt met 5 voorbeelden (van jullie echte meetings).
- [ ] Registry entry in `test-extractors/registry.ts`.

### Harness

- [ ] `risk` dropdown-optie in `/dev/extractor` type-picker.
- [ ] "Bless as tuned"-knop: migreert alle risk-extractions in DB van `untuned` naar `tuned`. (Voor deze sprint is dat de bulk-promote-actie.)

### UI

- [ ] Query `listRisksByProject` met filter `tuning_status='tuned'`.
- [ ] Component `risk-panel.tsx` gebruikt `@repo/ui/card` + severity-dot.
- [ ] Integreren in `projects/[id]/page.tsx`.

### Tunen (handmatig)

- [ ] Run Risk Extractor via harness op 5 willekeurige verifieerde meetings.
- [ ] Spot-check: lees output, noteer false-positives en false-negatives.
- [ ] Itereer prompt 2-3 keer tot 80%+ correct.
- [ ] Documenteer tuning-iteraties in een `tuning-log.md` (kort).

### Validatie

- [ ] `npm run type-check` + `lint` + `test` groen.
- [ ] Handmatig: /dev/extractor → run op 3 meetings → DB check (rijen staan als `tuned` na bless).
- [ ] Handmatig: projects/[id] toont paneel met risks.

## Acceptatiecriteria

- [ ] [AI-E010-E017] Agent werkt, tests groen.
- [ ] [DATA-E010-E013] Migraties gedraaid, types gegenereerd.
- [ ] [FUNC-E020-E025] Harness + paneel zichtbaar en functioneel.
- [ ] [QUAL-E010] 5 meetings spot-checked, >= 80% correct.
- [ ] [QUAL-E011] Gemiddelde confidence op die 5 meetings >= 0.65.
- [ ] [RULE-E010] `untuned` rijen niet zichtbaar in productie-UI (verified via browser).
- [ ] [EDGE-E010-E012] Edge-cases gedekt door tests.

## Dependencies

EX-000 (test-harness). Geen andere.

## Out of scope

- Merge met productie-pipeline (EX-009).
- Andere types (EX-002 t/m EX-008).
- Risk Synthesizer agent (aparte toekomstige sprint).
- Alerts/Slack-notificaties op high-severity risks.
- Historische re-processing van alle meetings (optioneel in EX-009).
