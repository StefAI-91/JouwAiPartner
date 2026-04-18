# EX-000 t/m EX-009 — Extractie-refactor tranche (index + traceability)

> **Doel:** Van fragmentarische extractie (Summarizer markdown + Extractor alleen action_items) naar unified 14-type structured extractie-laag in één gemergde `MeetingStructurer` productie-agent. Per-type tuning-discipline via admin-only test-harness. Cost gehalveerd, project-werkblad-panelen queryable, fundering voor toekomstige specialized agents.

## Overview

| Sprint | Scope                                                           | Duur    | Consumer                                       |
| ------ | --------------------------------------------------------------- | ------- | ---------------------------------------------- |
| EX-000 | Test-harness `/dev/extractor` (admin-only dev-tool)             | 3-5 dgn | Dev-tool                                       |
| EX-001 | `risk` extractor + TIER-lijsten in code                         | 4-6 dgn | Project-werkblad paneel "Risico's"             |
| EX-002 | `decision` extractor                                            | 3-5 dgn | Project-werkblad paneel "Besluiten"            |
| EX-003 | `commitment` extractor                                          | 3-5 dgn | Project-werkblad paneel "Wie wacht op wie"     |
| EX-004 | `need` extractor (coexistence met needs-scanner)                | 3-5 dgn | Project-werkblad paneel "Behoeften"            |
| EX-005 | `question` extractor                                            | 3-5 dgn | Project-werkblad paneel "Open vragen"          |
| EX-006 | `signal` extractor                                              | 3-5 dgn | Meeting-detail + secundair op project-werkblad |
| EX-007 | `context` extractor (incl. sensitive-flag admin-only)           | 3-5 dgn | Organization/people/project detail             |
| EX-008 | `vision` extractor                                              | 3-5 dgn | Organization + project (collapsible)           |
| EX-009 | **The Merge** — MeetingStructurer in productie + 5 Tier-2 types | 5-7 dgn | Hele pipeline, cost-halvering                  |

**Totaal:** 10 sprints, ~35-55 werkdagen.

## Beslissingen van Stef (bron van waarheid)

| Vraag                                        | Antwoord                                                                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Tijdelijke extra AI-kost tijdens tuning-fase | ✓ akkoord                                                                                                         |
| Review/spot-check                            | Stef solo                                                                                                         |
| `tuning_status` kolom                        | **Geschrapt** — vervangen door hardcoded `TIER_1_TYPES` / `TIER_2_TYPES` in `packages/ai/src/extraction-types.ts` |
| Feature flag merge-sprint                    | ✓ env var `USE_MEETING_STRUCTURER` in Vercel                                                                      |
| Fallback bij falen merged agent              | ✓ automatisch terug naar legacy Summarizer+Extractor pipeline                                                     |
| Tier-2 types zichtbaar voor admin            | ✓ aparte sectie op meeting-detail                                                                                 |

## Dependencies

```
EX-000 ─→ EX-001 ─→ EX-002..EX-008 (volgorde flexibel) ─→ EX-009
```

- **EX-000** eerst — harness infrastructure.
- **EX-001** tweede — introduceert `extraction-types.ts` met TIER-lijsten waar alle andere op leunen.
- **EX-002 t/m EX-008** — volgorde flexibel maar aanbevolen zoals hierboven (afnemend direct nut).
- **EX-009** laatste — vereist alle 9 types goed getuned in harness.

## Cumulatieve scope

| Na sprint | Types in productie                                        | Panelen actief                                                |
| --------- | --------------------------------------------------------- | ------------------------------------------------------------- |
| EX-000    | action_item (legacy)                                      | n.v.t.                                                        |
| EX-001    | + risk                                                    | + Risico's                                                    |
| EX-002    | + decision                                                | + Besluiten                                                   |
| EX-003    | + commitment                                              | + Wie wacht op wie                                            |
| EX-004    | + need                                                    | + Behoeften                                                   |
| EX-005    | + question                                                | + Open vragen                                                 |
| EX-006    | + signal                                                  | + Signalen (meeting + project)                                |
| EX-007    | + context                                                 | + Context (org/people/project)                                |
| EX-008    | + vision                                                  | + Visie                                                       |
| EX-009    | + 5 Tier-2 (idea, insight, sentiment, pricing, milestone) | + admin-only "Experimental" op meeting-detail; cost-halvering |

## Tier-in-code aanpak (vervangt `tuning_status`)

Nieuw bestand in EX-001:

```typescript
// packages/ai/src/extraction-types.ts
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
```

Panels filteren simpelweg op specifiek type (`type='risk'`). Een type is "actief" in UI wanneer er een paneel voor bestaat — niks in DB nodig.

Meeting-detail admin-sectie (EX-009): `type IN TIER_2_TYPES` + `requireAdmin()`.

## Traceability matrix

### EX-000 — Test-harness

FUNC-E001..E010, AUTH-E001, UI-E001..E005, RULE-E001..E003, DATA-E001, SEC-E001, EDGE-E001..E003.

### EX-001 — Risk

AI-E010..E015, DATA-E010..E012, FUNC-E020..E023, QUAL-E010, EDGE-E010..E011.

### EX-002 — Decision

AI-E020..E024, DATA-E020, FUNC-E030..E033, QUAL-E020, EDGE-E020.

### EX-003 — Commitment

AI-E030..E033, DATA-E030, FUNC-E040..E043, QUAL-E030, EDGE-E030.

### EX-004 — Need

AI-E040..E044, DATA-E040, FUNC-E050..E052, QUAL-E040, EDGE-E040.

### EX-005 — Question

AI-E050..E054, DATA-E050, FUNC-E060..E063, QUAL-E050, EDGE-E050..E051.

### EX-006 — Signal

AI-E060..E064, DATA-E060, FUNC-E070..E072, QUAL-E060, EDGE-E060.

### EX-007 — Context

AI-E070..E074, DATA-E070, FUNC-E080..E083, QUAL-E070, RULE-E070, EDGE-E070..E071.

### EX-008 — Vision

AI-E080..E082, DATA-E080, FUNC-E090..E092, QUAL-E080, RULE-E080, EDGE-E080.

### EX-009 — The Merge

AI-E090..E094, FUNC-E100..E106, DATA-E090..E091, QUAL-E090..E092, RULE-E090..E092, EDGE-E090..E091.

## Totaal

- **Sprints:** 10
- **Requirements:** ~90 unieke IDs (was 115 — ~25 weggetrimd als overengineering)
- **Extractie-types:** 14 (9 Tier-1 getuned + 5 Tier-2 best-effort)
- **Nieuwe DB-migraties:** 10 (9 × type-enum + 1 × Tier-2 batch in EX-009)
- **Cost-impact:** Halvering van Sonnet-calls per meeting na EX-009
- **UI-panelen toegevoegd:** 8 op project-werkblad + secties op org/people + meeting-detail admin-sectie

## Geschrapt (overengineering-reductie)

Verwijderd tijdens trimming-ronde op verzoek van Stef:

- **`tuning_status` enum + kolom** — vervangen door hardcoded tier-lijst in code
- **"Bless as tuned"-flow in harness** — niet meer nodig, types activeren via code-release
- **Preemptieve indexes** op `(project_id, type, tuning_status)` etc. — voeg toe als performance het vraagt
- **Metadata die geen consumer heeft:** `mitigation_hint`, `time_horizon`, `supersedes_extraction_id`, `conditional`, `reversed` status, `topic` tag, `escalation` flag, `deadline_hint`, `horizon`, `scope` (vision)
- **`source_agent` kolom** (EX-004) — defer tot EX-009 als het blijkt nodig
- **Chunking-strategie voor lange transcripts** (EX-009) — edge case die in praktijk niet voorkomt
- **Ruim 25 RULE-E0X0 "untuned hidden" requirements** — niet meer relevant zonder tuning_status

## Buiten scope (vervolgtranches)

- **Tier-2 activatie:** aparte sprints per type wanneer consumer gebouwd wordt
- **Specialized aggregators:** Risk Synthesizer, Decision Tracker, Project Orchestrator
- **Legacy cleanup:** verwijderen van `summarizer.ts` + `extractor.ts` na stabiele rollout
- **Historische re-processing** voor Tier-2 data op bestaande meetings
- **Automatisering-laag:** opvolgmail-drafts, proposal-drafts, PR-creation (vereist person_profile, policies, ai_actions)

## Wat volgt na EX-009

- Productie-pipeline extract 14 types per meeting
- 9 getunede types actief op project-werkblad
- 5 Tier-2 types opbouwend op de achtergrond voor toekomstige agents
- Halvering AI-kosten
- Fundering voor automatisering-laag (person_profile, policies, ai_actions)

Natuurlijke vervolg-tranche: **Project Orchestrator + Risk Synthesizer** — agents die over structured extractions heen patronen detecteren en het "Next actions"-paneel vullen met proactief advies.
