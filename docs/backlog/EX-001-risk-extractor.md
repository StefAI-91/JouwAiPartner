# Micro Sprint EX-001: Risk extractor (eerste nieuwe type)

> **Scope:** Type-specialist agent voor `risk` bouwen, tunen op echte meetings via de harness, `risk` toevoegen aan type-enum, en een risico-paneel in het project-werkblad tonen. Legt ook de tier-infrastructuur (hardcoded TIER_1/TIER_2-lijst in code) waar EX-002 t/m EX-008 op voortbouwen.

## Doel

Eerst nieuwe extractie-type uitwerken: `risk`. Aan het eind van deze sprint produceert de Risk Extractor plausibele risico's op 5-10 echte meetings, en zien admins die risico's terug op het project-werkblad.

## Requirements

| ID        | Beschrijving                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------ |
| AI-E010   | Nieuwe agent `risk-extractor.ts` (Sonnet) emit risk-extracties uit transcript + context                |
| AI-E011   | Risk-prompt onderscheidt risk van signal: risk = concrete waarschuwing met impact, signal = observatie |
| AI-E012   | Agent retourneert `severity` (low/medium/high/critical)                                                |
| AI-E013   | Agent retourneert `category` (financial/scope/technical/client_relationship/team/timeline)             |
| AI-E014   | Elke risk-extractie heeft `source_quote` uit transcript + `confidence` 0-1                             |
| AI-E015   | Agent is selectief: liever 2 scherpe risico's dan 8 zwakke (confidence ondergrens 0.5)                 |
| DATA-E010 | Nieuw bestand `packages/ai/src/extraction-types.ts` met TIER_1_TYPES / TIER_2_TYPES constanten         |
| DATA-E011 | `risk` toegevoegd aan `extractions.type` enum                                                          |
| DATA-E012 | Risk-metadata opgeslagen in `extractions.metadata` jsonb met `{severity, category}`                    |
| FUNC-E020 | `risk` toegevoegd aan `/dev/extractor` harness-dropdown via registry                                   |
| FUNC-E021 | Project-werkblad heeft paneel "Risico's" dat `type='risk' AND project_id=X` toont                      |
| FUNC-E022 | Paneel toont severity-dot (rood/oranje/grijs) + content + herkomst (meeting-link)                      |
| FUNC-E023 | Leeg-staat: "Geen risico's gedetecteerd voor dit project"                                              |
| QUAL-E010 | Spot-check door Stef op 5 willekeurige meetings: >= 80% inhoudelijk correct                            |
| EDGE-E010 | Transcript zonder risico's → lege array, geen hallucinaties                                            |
| EDGE-E011 | Confidence < 0.5 → extractie gefilterd uit UI (wel bewaard in DB)                                      |

## Bronverwijzingen

- EX-000 (prerequisite): test-harness
- Index: `docs/backlog/EX-000-009-extraction-series-index.md`
- Shift mockup: `apps/cockpit/src/app/(dashboard)/shift/page.tsx` paneel "Risico's"
- Project-werkblad: `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`

## Context

### Probleem

Risico's zitten als markdown-strings in `summaries.kernpunten[]` met `**Risico:**` prefix. Niet queryable. Het project-werkblad kan niet filteren, geen severity, geen prioritering.

### Oplossing

1. Risk Extractor agent (Sonnet) met focused prompt.
2. `risk` toevoegen aan type-enum, metadata velden in jsonb.
3. Tier-infrastructuur introduceren (hardcoded lijsten in code, GEEN DB-flag).
4. Registry-entry voor harness.
5. Itereren op 5-10 echte meetings tot Stef de output goedkeurt.
6. Project-werkblad paneel bouwen.

### Tier-infrastructuur (hardcoded in code, geen DB)

Nieuw bestand `packages/ai/src/extraction-types.ts`:

```typescript
export const TIER_1_TYPES = [
  "action_item",
  "decision",
  "risk",
  "need",
  "commitment",
  "question",
  "signal",
  "context",
  "vision",
] as const;

export const TIER_2_TYPES = [
  "idea",
  "insight",
  "client_sentiment",
  "pricing_signal",
  "milestone",
] as const;

export type Tier1Type = (typeof TIER_1_TYPES)[number];
export type Tier2Type = (typeof TIER_2_TYPES)[number];
export type ExtractionType = Tier1Type | Tier2Type;

export function isTier1(type: string): type is Tier1Type {
  return (TIER_1_TYPES as readonly string[]).includes(type);
}
```

Panels filteren op specifiek type (`type='risk'`). Tier-2 types komen pas zichtbaar als hun paneel gebouwd wordt. Admin-only "experimental"-sectie op meeting-detail filtert op `TIER_2_TYPES`. Geen `tuning_status` kolom, geen enum, geen bless-flow.

### Risk vs Signal — het cruciale onderscheid

- **Risk:** concrete waarschuwing met vermoedelijke negatieve impact.
- **Signal:** observatie die (nog) geen schade is (volgt in EX-006).

Bij twijfel: prompt prefereert de zachtere classificatie (signal > risk).

### Severity-calibratie

| severity | cue                                                                           |
| -------- | ----------------------------------------------------------------------------- |
| critical | blokkeert release/deploy/klanttraject nu; budget-overschrijding met zekerheid |
| high     | dreigt een deadline, commitment of klantrelatie binnen weken                  |
| medium   | maakt werk moeilijker, geen directe escalatie                                 |
| low      | zachte waarschuwing, gemakkelijk te mitigeren                                 |

### Files touched

| Bestand                                                               | Wijziging                              |
| --------------------------------------------------------------------- | -------------------------------------- |
| `packages/ai/src/extraction-types.ts`                                 | nieuw — TIER constanten + helpers      |
| `packages/ai/src/agents/test-extractors/risk-extractor.ts`            | nieuw — Sonnet agent                   |
| `packages/ai/src/validations/test-extractors/risk.ts`                 | nieuw — Zod schema                     |
| `packages/ai/src/agents/test-extractors/registry.ts`                  | entry `risk`                           |
| `supabase/migrations/20260420000001_extraction_type_risk.sql`         | `risk` aan type-enum toevoegen         |
| `packages/database/src/types/database.ts`                             | regeneratie (`npm run db:types`)       |
| `packages/database/src/queries/risks.ts`                              | `listRisksByProject(projectId)`        |
| `apps/cockpit/src/components/projects/risk-panel.tsx`                 | nieuw paneel                           |
| `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`             | paneel integreren                      |
| `packages/ai/__tests__/agents/test-extractors/risk-extractor.test.ts` | agent unit test met mocked AI SDK      |
| `apps/cockpit/src/components/projects/__tests__/risk-panel.test.tsx`  | panel states: leeg / gevuld / severity |

## Prerequisites

EX-000 done.

## Taken

### TDD-first

- [ ] `risk-extractor.test.ts`: transcript met 2 risico's → 2 items met juiste severity/category; transcript zonder risico → lege array; confidence < 0.5 → gefilterd.
- [ ] `risk-panel.test.tsx`: 0 risks → leeg-staat; 3 risks verschillende severity → juiste sortering + dots.

### Implementatie

- [ ] `extraction-types.ts` met TIER lijsten.
- [ ] Migratie `risk` aan type-enum + `npm run db:types`.
- [ ] Zod schema + Sonnet agent + 5 voorbeelden in prompt.
- [ ] Registry entry + harness-dropdown.
- [ ] Query + panel + integratie.

### Tunen (door Stef)

- [ ] Run agent via harness op 5 recente verified meetings.
- [ ] Spot-check output, itereer prompt 2-3× tot >= 80% correct.
- [ ] Kort notitie in sprint-log: welke iteraties, welke lessen.

### Validatie

- [ ] `npm run type-check` + `lint` + `test` groen.
- [ ] Handmatig: /dev/extractor werkt voor risk; projects/[id] toont paneel.

## Acceptatiecriteria

- [ ] [AI-E010-E015] Agent werkt, tests groen.
- [ ] [DATA-E010-E012] TIER-code + migratie + types.
- [ ] [FUNC-E020-E023] Harness + paneel functioneel.
- [ ] [QUAL-E010] 5 meetings >= 80% correct volgens Stef.
- [ ] [EDGE-E010, E011] Edge-cases gedekt.

## Dependencies

EX-000.

## Out of scope

- Merge met productie-pipeline (EX-009).
- Andere types.
- Mitigation_hint, time_horizon (defer — geen consumer nu).
- Risk Synthesizer agent (future).
- Alerts bij high-severity risks.
- Preemptieve indexes (voeg toe als performance-data dat vraagt).
