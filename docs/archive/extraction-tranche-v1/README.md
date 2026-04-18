# Archive — Extraction Tranche v1 (superseded)

> **Status:** Superseded op 2026-04-18 — vervangen door compactere 3-sprint tranche in `docs/backlog/PW-*.md`.

## Waarom gearchiveerd

De originele tranche bestond uit 10 sprints (EX-000 t/m EX-009) met ~35-55 werkdagen. De aanpak was: eerst test-harness bouwen, dan per extractie-type een aparte sprint (risk, decision, commitment, need, question, signal, context, vision), dan een merge-sprint.

Bij review bleek dit plan overkill voor de werkelijke behoefte:

1. **11 weken plumbing voordat user visible value zag.** De oorspronkelijke pijn was "project-scherm is weggestopt, ik weet niet wat te doen". Dat is een UI-probleem. De extraction-tranche loste een laag eronder op zonder eerst de UI aan te pakken.
2. **Per-type sprints waren ceremonie, geen noodzaak.** 8 throwaway type-specialist agents bouwen om ze later te mergen levert dezelfde output als 1 gemergde agent met per-type tuning via een harness.
3. **Vision-critical agent (Project Orchestrator) was out of scope.** Alle extractie-werk zonder de AI die er gebruik van maakt.
4. **80% van de /shift-mockup was al buildbaar met bestaande data.** Via markdown-parsing van de huidige Summarizer-output, actiepunten die al structured zijn, en bestaande briefings.

## Vervangen door

- `docs/backlog/PW-01-project-workspace-ui.md` — project-werkblad UI met bestaande data (1 week)
- `docs/backlog/PW-02-meeting-structurer.md` — merged agent met 14 types + harness per-type testing (1,5-2 weken)
- `docs/backlog/PW-03-project-orchestrator.md` — AI die proactief "wat moet vandaag gebeuren" per project zegt (1 week)

Totaal: 3-4 weken tot de volledige visie live draait, versus 11+ weken in het oude plan.

## Wat uit deze tranche is behouden (en doorgestroomd naar v2)

- **14 extractie-types** (9 Tier-1 + 5 Tier-2) — intact doorgenomen naar PW-02
- **TIER_1_TYPES / TIER_2_TYPES constants in code** (vervangt tuning_status)
- **Feature flag `USE_MEETING_STRUCTURER`** voor productie-rollout
- **Fallback naar legacy Summarizer+Extractor** bij falen
- **Sensitive-flag voor context** (ethische guardrail)
- **Test-harness `/dev/extractor`** — maar nu gecombineerd met merged agent
- **Admin-only "Experimental extractions" sectie op meeting-detail** voor Tier-2 types
- **Metadata per type** (severity, category, party, direction, etc.) — intact

## Wat geschrapt is

- Per-type sprint-structuur (EX-001 t/m EX-008 als aparte sprints)
- "Bless as tuned"-flow
- `tuning_status` enum + kolom
- Elke sprint's individuele DB-migratie per type (nu één migratie voor alle 14 types)

## Beslissingen van Stef uit het originele traject (blijven geldig)

| Vraag                                   | Antwoord                                       |
| --------------------------------------- | ---------------------------------------------- |
| Tijdelijke extra AI-kost tijdens tuning | Akkoord                                        |
| Review/spot-check                       | Stef solo                                      |
| `tuning_status` kolom                   | Geschrapt, vervangen door hardcoded tier-lijst |
| Feature flag merge-sprint               | Env var `USE_MEETING_STRUCTURER` in Vercel     |
| Fallback bij falen merged agent         | Terug naar legacy pipeline                     |
| Tier-2 types zichtbaar voor admin       | Aparte sectie op meeting-detail                |
