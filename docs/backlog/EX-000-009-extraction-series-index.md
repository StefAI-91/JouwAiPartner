# EX-000 t/m EX-009 — Extractie-refactor tranche (index + traceability matrix)

> **Doel van deze tranche:** Van fragmentarische extractie (Summarizer als markdown, Extractor alleen action_items) naar een unified 14-type structured extractie-laag in één gemergde `MeetingStructurer` productie-agent. Per-type tuning-discipline via een admin-only test-harness. Output: cost gehalveerd, project-werkblad-panelen queryable, fundering voor alle toekomstige specialized agents.

## Overview

| Sprint | Type / Scope                                   | Duur (schatting) | Consumer (UI paneel / agent)                   |
| ------ | ---------------------------------------------- | ---------------- | ---------------------------------------------- |
| EX-000 | Test-harness `/dev/extractor`                  | 3-5 dagen        | Dev-tool (admin only)                          |
| EX-001 | `risk` extractor                               | 4-6 dagen        | Project-werkblad paneel "Risico's"             |
| EX-002 | `decision` extractor                           | 3-5 dagen        | Project-werkblad paneel "Besluiten"            |
| EX-003 | `commitment` extractor                         | 3-5 dagen        | Project-werkblad paneel "Wie wacht op wie"     |
| EX-004 | `need` extractor                               | 3-5 dagen        | Project-werkblad paneel "Behoeften"            |
| EX-005 | `question` extractor                           | 3-5 dagen        | Project-werkblad paneel "Open vragen / prep"   |
| EX-006 | `signal` extractor                             | 3-5 dagen        | Meeting-detail + secundair op project-werkblad |
| EX-007 | `context` extractor                            | 3-5 dagen        | Organization/people/project detail             |
| EX-008 | `vision` extractor                             | 3-5 dagen        | Organization/project detail (collapsible)      |
| EX-009 | **The Merge** — MeetingStructurer in productie | 5-7 dagen        | Hele pipeline, cost-halvering                  |

**Totaal:** 10 sprints, ~35-55 werkdagen. Doorlooptijd afhankelijk van tuning-iteraties per type.

## Dependencies

```
EX-000 ─┬─→ EX-001 ─→ EX-002 ─→ ... ─→ EX-008 ─→ EX-009
        │
        └─ EX-002 t/m EX-008 hangen alleen af van EX-001 (dat zet tuning_status infra)
           en kunnen theoretisch parallel, maar volgorde voorkomt DB-migratie-conflicts.
```

- **EX-000** is strict eerste — levert harness infrastructure.
- **EX-001** moet tweede — introduceert `tuning_status` kolom waar alle andere op bouwen.
- **EX-002 t/m EX-008** — mogen in andere volgorde. Aanbeveling: in de volgorde hierboven (op afnemend direct nut voor project-werkblad).
- **EX-009** moet laatste — vereist alle 9 types als `tuned`.

## Cumulatieve scope per sprint

| Na sprint | Types geëxtraheerd in productie        | Types getuned | Panelen actief        |
| --------- | -------------------------------------- | ------------- | --------------------- |
| EX-000    | action_item (legacy)                   | action_item   | n.v.t.                |
| EX-001    | action_item + risk                     | +risk         | +Risico's             |
| EX-002    | + decision                             | +decision     | +Besluiten            |
| EX-003    | + commitment                           | +commitment   | +Wie wacht op wie     |
| EX-004    | + need                                 | +need         | +Behoeften            |
| EX-005    | + question                             | +question     | +Open vragen          |
| EX-006    | + signal                               | +signal       | +Signalen             |
| EX-007    | + context                              | +context      | +Context              |
| EX-008    | + vision                               | +vision       | +Visie                |
| EX-009    | Alle 14 (Tier-1 tuned, Tier-2 untuned) | idem          | idem + cost-halvering |

## Traceability matrix — requirements per sprint

### EX-000 — Test-harness

| ID                 | Beschrijving               |
| ------------------ | -------------------------- |
| FUNC-E001 t/m E010 | UI functionaliteit harness |
| AUTH-E001          | admin-only                 |
| UI-E001 t/m E005   | Layout + styling           |
| RULE-E001 t/m E003 | Read-only naar DB          |
| DATA-E001          | Ephemerale output          |
| SEC-E001           | Server Action rol-check    |
| EDGE-E001 t/m E003 | Foutafhandeling            |

### EX-001 — Risk

| ID                 | Beschrijving                            |
| ------------------ | --------------------------------------- |
| AI-E010 t/m E017   | Agent gedrag + metadata                 |
| DATA-E010 t/m E013 | tuning_status kolom + type-enum + index |
| FUNC-E020 t/m E025 | Harness + project-panel                 |
| QUAL-E010, E011    | Tuning-thresholds                       |
| RULE-E010, E011    | untuned hidden + standalone specialist  |
| EDGE-E010 t/m E012 | Edge-cases                              |

### EX-002 — Decision

| ID                 | Beschrijving                           |
| ------------------ | -------------------------------------- |
| AI-E020 t/m E026   | Decision-agent + conditional flag      |
| DATA-E020, E021    | Type-enum + metadata                   |
| FUNC-E030 t/m E033 | Harness + panel (open/closed sections) |
| QUAL-E020, E021    | Tuning + confidence                    |
| RULE-E020          | untuned hidden                         |
| EDGE-E020, E021    | Overwegingen vs besluit                |

### EX-003 — Commitment

| ID                 | Beschrijving                              |
| ------------------ | ----------------------------------------- |
| AI-E030 t/m E035   | Commitment-agent + direction              |
| DATA-E030, E031    | Type-enum + directionaliteit-index        |
| FUNC-E040 t/m E043 | Harness + wie-wacht-op-wie panel          |
| QUAL-E030, E031    | Tuning + direction-accuracy               |
| RULE-E030          | untuned hidden                            |
| EDGE-E030, E031    | Agreements en externe-externe commitments |

### EX-004 — Need

| ID                 | Beschrijving                        |
| ------------------ | ----------------------------------- |
| AI-E040 t/m E045   | Need-agent + party/urgency/category |
| DATA-E040, E041    | Type-enum + source_agent optie      |
| FUNC-E050 t/m E052 | Harness + behoefte-panel            |
| QUAL-E040, E041    | Tuning + party-accuracy             |
| RULE-E040, E041    | Coexistence met needs-scanner       |
| EDGE-E040          | Klacht → need                       |

### EX-005 — Question

| ID                 | Beschrijving                            |
| ------------------ | --------------------------------------- |
| AI-E050 t/m E056   | Question-agent + answerer/urgency/topic |
| DATA-E050          | Type-enum                               |
| FUNC-E060 t/m E063 | Harness + open-vragen panel             |
| QUAL-E050          | Tuning                                  |
| RULE-E050          | untuned hidden                          |
| EDGE-E050, E051    | Rhetorical vs genuine, unknown answerer |

### EX-006 — Signal

| ID                 | Beschrijving                                       |
| ------------------ | -------------------------------------------------- |
| AI-E060 t/m E064   | Signal-agent + direction/domain/escalation         |
| DATA-E060          | Type-enum                                          |
| FUNC-E070 t/m E072 | Harness + meeting-detail + secundair project-panel |
| QUAL-E060          | Tuning (lager threshold)                           |
| RULE-E060, E061    | untuned hidden + signal-preference                 |
| EDGE-E060          | Positieve signals                                  |

### EX-007 — Context

| ID                 | Beschrijving                                               |
| ------------------ | ---------------------------------------------------------- |
| AI-E070 t/m E075   | Context-agent + entity-attributie + sensitive flag         |
| DATA-E070, E071    | Type-enum + sensitive metadata                             |
| FUNC-E080 t/m E083 | Harness + org/people/project components + sensitive-toggle |
| QUAL-E070          | Tuning                                                     |
| RULE-E070, E071    | untuned hidden + sensitive admin-only                      |
| EDGE-E070, E071    | Project-scope context, persoonlijke info                   |

### EX-008 — Vision

| ID                 | Beschrijving                             |
| ------------------ | ---------------------------------------- |
| AI-E080 t/m E085   | Vision-agent + horizon/scope/conditional |
| DATA-E080          | Type-enum                                |
| FUNC-E090 t/m E092 | Harness + org/project panels             |
| QUAL-E080          | Tuning (laagste threshold 70%)           |
| RULE-E080, E081    | untuned hidden + meeting-type filter     |
| EDGE-E080          | Deadline-disambiguation                  |

### EX-009 — The Merge

| ID                 | Beschrijving                                             |
| ------------------ | -------------------------------------------------------- |
| AI-E090 t/m E096   | MeetingStructurer agent + merged prompt + caching        |
| FUNC-E100 t/m E104 | Pipeline-integratie + renderer + save-extractions        |
| DATA-E090 t/m E092 | Tier-2 types + source_agent kolom                        |
| QUAL-E090 t/m E092 | Backward-compat + cost-halvering + 10-meeting spot-check |
| RULE-E090 t/m E092 | Legacy-bewaar + Tier-2 hidden + geen backfill            |
| EDGE-E090 t/m E092 | Long transcripts, timeouts, partial output               |

## Totaal

- **Sprints:** 10
- **Requirements:** ~115 unieke IDs
- **Nieuwe extractie-types:** 14 (9 Tier-1 getuned + 5 Tier-2 untuned)
- **Nieuwe DB-migraties:** ~12 (tuning_status + 11 type/metadata migraties)
- **Cost-impact:** Halvering van Sonnet-calls per meeting na EX-009
- **UI-panelen toegevoegd:** 8 op project-werkblad + secties op org/people-detail

## Buiten scope (vervolgtranches)

- **Tier-2 activation:** aparte sprints per type wanneer consumer komt (Communicator → client_sentiment, Planner → idea, Portal → milestone, Proposal AI → pricing_signal, Analyst → insight)
- **Specialized aggregator agents:** Risk Synthesizer, Decision Tracker, Project Orchestrator
- **Legacy cleanup:** verwijderen van `summarizer.ts` + `extractor.ts` na succesvolle rollout
- **Historische re-processing:** bestaande meetings door nieuwe pipeline halen om Tier-2 data op te bouwen
- **Automatisering-laag:** opvolgmail-drafts, proposal-drafts, PR-creation — vereist eerst `person_profile`, `policies`, `ai_actions` tabellen

## Open vragen voor de gebruiker

1. **Cost-verdubbeling tijdens tuning-fase.** Tijdens EX-001 t/m EX-008 draait productie nog op Summarizer+Extractor én worden in parallel via harness type-specialists gerund op echte meetings. Dat betekent tijdelijk 2× AI-calls voor elke test-run. Akkoord met deze tijdelijke extra-kost?
2. **Tuning-sessies met 3 reviewers.** Spot-check op 80% accuraatheid — wie doet de review? Kan dit door één admin (Stef) of wil je multi-person consensus? Dit beïnvloedt de doorlooptijd per sprint.
3. **"Bless as tuned" — per project of globaal?** Default: globaal (elk type heeft één wereldwijde tuning_status). Alternatief: per project (risk mag al tuned zijn voor project A maar niet voor B). Globaal is simpelst, kies alleen per-project als je duidelijke reden hebt.
4. **Feature-flag tijdens EX-009:** `USE_MEETING_STRUCTURER` env var. Kun jij (Stef) deze flag handmatig aan/uit toggelen in Vercel, of moet dit via een UI admin-knop?
5. **Fallback bij falende merged agent.** Als MeetingStructurer 3x faalt → fallback naar legacy pipeline of error? Voorstel: fallback naar legacy voor robuustheid, met alert naar jou.
6. **Tier-2 types in meeting-detail UI zichtbaar voor admin?** Standaard hidden, maar op meeting-detail pagina kan het nuttig zijn admin-only een "Experimental extractions" sectie te tonen met de untuned rijen.

## Wat volgt na EX-009

Zodra deze tranche klaar is heb je:

- Een productie-pipeline die 14 types structured extract per meeting
- 9 getunede types actief in project-werkblad
- 5 Tier-2 types die in de achtergrond opbouwen voor toekomstige agents
- Halvering van AI-kosten per meeting
- Een solide foundation voor de automatisering-laag (Phase na deze tranche): person_profile, policies, ai_actions

De natuurlijke vervolg-tranche is **Project Orchestrator + Risk Synthesizer** — agents die over de structured extractions heen patronen detecteren en het "Next actions"-paneel vullen met proactief advies. Beide worden mogelijk gemaakt doordat deze tranche de data-fundering heeft gelegd.
