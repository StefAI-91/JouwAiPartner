# PW-01 t/m PW-03 — Project Workspace Tranche (index)

> **Doel:** Van "project-scherm is weggestopt" naar **"AI begeleidt mijn projecten van A tot Z"** — in 3 sprints, ~3-4 weken. Vervangt de gearchiveerde 10-sprint tranche (`docs/archive/extraction-tranche-v1/`).

## Overview

| Sprint | Scope                                                      | Duur      | Winst                                                                |
| ------ | ---------------------------------------------------------- | --------- | -------------------------------------------------------------------- |
| PW-01  | Project workspace UI met bestaande data + markdown-parsing | 1 week    | Visible value: werkblad live, geen nieuwe AI, 80% van /shift-mockup  |
| PW-02  | MeetingStructurer (14 types) + test-harness + feature-flag | 1,5-2 wkn | Structured extractie draait, panelen upgraded, cost gehalveerd       |
| PW-03  | Project Orchestrator — de AI-coach                         | 1 week    | Vision-critical: AI vertelt per project wat er vandaag moet gebeuren |

**Totaal:** 3-4 weken tot volledige visie operationeel.

## Waarom deze tranche (vs gearchiveerde v1)

De oorspronkelijke v1 had 10 sprints en 11 weken plumbing voor user value. Bij review bleek:

1. **UI-pijn vs data-pijn.** De oorspronkelijke klacht was UI — "ik weet niet wat te doen". Dat is eerst op te lossen met bestaande data via markdown-parsing. PW-01 doet dat in 1 week.
2. **Per-type sprints waren ceremonie.** Eén gemergde agent met harness-tuning levert hetzelfde. PW-02 doet dat in 1,5-2 weken.
3. **Vision-critical agent (Orchestrator) ontbrak.** De oude tranche stopte bij extractie. Zonder Orchestrator is er geen AI die coacht.

Zie `docs/archive/extraction-tranche-v1/README.md` voor volledige rationale.

## Cumulatieve waarde

| Na sprint | Wat werkt live                                                             |
| --------- | -------------------------------------------------------------------------- |
| PW-01     | Project-werkblad met 4 van de 5 panelen gevuld (markdown-parse)            |
| PW-02     | Alle 5 panelen met structured data, 14 types geëxtraheerd, cost gehalveerd |
| PW-03     | "Next actions"-paneel gevuld door AI-coach, vision live                    |

## Dependencies

```
PW-01 ──→ PW-02 ──→ PW-03
 (UI)     (data)    (AI-coach)
```

Strikt sequentieel. PW-02 heeft PW-01's panelen nodig om naar te upgraden. PW-03 heeft PW-02's structured data nodig om op te redeneren.

## Beslissingen van Stef (bron van waarheid)

| Onderwerp                | Keuze                                                       |
| ------------------------ | ----------------------------------------------------------- |
| Per-type tuning          | Via harness-dropdown in PW-02, niet aparte sprints          |
| Merged MeetingStructurer | Ja — één agent, 14 types, één call                          |
| Tier-1 vs Tier-2         | Hardcoded in `extraction-types.ts` constants (geen DB-flag) |
| Feature flag             | `USE_MEETING_STRUCTURER` env var in Vercel                  |
| Fallback                 | Automatisch terug naar legacy Summarizer+Extractor bij fout |
| Tier-2 zichtbaarheid     | Admin-only sectie op meeting-detail                         |
| Reviewer                 | Stef solo voor alle spot-checks                             |
| Orchestrator-output      | Gated door review-flow (zoals alle AI-output)               |

## Extractie-types (volgt uit PW-02)

**Tier-1 (9 — op project-werkblad):**
`action_item`, `decision`, `risk`, `need`, `commitment`, `question`, `signal`, `context`, `vision`

**Tier-2 (5 — admin-only op meeting-detail):**
`idea`, `insight`, `client_sentiment`, `pricing_signal`, `milestone`

Metadata-velden per type zijn ongewijzigd gebleven uit v1 — zie `docs/archive/extraction-tranche-v1/EX-001` t/m `EX-008` voor detail per type.

## Uit scope van deze tranche

- **Automatisering-laag** (AI stuurt daadwerkelijk mails, opent PRs, maakt voorstellen) — vereist `person_profile`, `policies`, `ai_actions` tabellen. Komt in vervolgtranche.
- **Specialized agents** buiten Orchestrator: Risk Synthesizer, Decision Tracker, Communicator, Analyst, Planner. Volgen na behoefte.
- **Portal** voor klanten. Aparte tranche in Phase B.
- **Historische re-processing.** Meetings van vóór PW-02 blijven op oude summary staan; nieuwe meetings krijgen direct structured data.
- **Tier-2 activatie** in klant-zichtbare UI. Zodra consumer (Communicator/Planner/Portal) gebouwd wordt, komt die type actief.
- **Cleanup legacy** (verwijderen Summarizer/Extractor bestanden). In opvolg-sprint na stabiele PW-02 rollout.

## Wat volgt na deze tranche

1. **Cleanup-sprint:** legacy agents verwijderen na 2-4 weken stabiele MeetingStructurer.
2. **Automatisering-tranche:** `person_profile` aggregate + `policies` tabel + `ai_actions` audit-trail. Eerste concrete: opvolgmail-drafts.
3. **Portal MVP:** Phase B — klant-facing project-status + Q&A.
4. **Analyst agent:** cross-project patronen en kennis-hergebruik (Phase E).

## Success-metric voor deze tranche

**Stef opent 's ochtends zijn laptop, bekijkt 3 project-werkbladen in 5 minuten, weet voor elk project zijn top-actie van vandaag, en onderneemt 1-2 concrete vervolgstappen — zonder zelf transcripten of extraction-lijsten door te spitten.**

Dat is de visie, operationeel.

## Starten

Volgende stap: laat sprint-planner-agent PW-01 analyseren tegen de codebase en een concreet uitvoeringsplan genereren (welke files, welke queries, welke tests — in welke volgorde). Dan kan Stef beginnen met bouwen.
