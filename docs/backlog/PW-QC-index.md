# PW Quality-Check tranche (PW-QC-01 t/m PW-QC-04)

> **Bron:** code-quality review op commit-range `de1d90d..b9a792a` (PW-02 MeetingStructurer + RiskSpecialist experiment).
> 30 commits, 32 files, +5235/-35 LOC. Tests, lint en type-check waren groen — dit zijn design-/structuur-issues die we later willen opruimen.

## Doel

De tijdens PW-02 gebouwde agents, pipeline en /dev/extractor voldoen aan Flowwijs-regels uit `CLAUDE.md`. Geen gedragsveranderingen voor eindgebruikers; well-architected code die onderhoudbaar blijft zodra `USE_MEETING_STRUCTURER=true` standaard is en legacy kan worden opgeruimd.

## Tranche overzicht

| Sprint                                | Scope                                                   | Blast radius                     | Prerequisites    |
| ------------------------------------- | ------------------------------------------------------- | -------------------------------- | ---------------- |
| `PW-QC-01-security-error-handling.md` | Auth-volgorde, loading/error routes, action-shape       | `/dev/extractor` + dev-actions   | —                |
| `PW-QC-02-database-discipline.md`     | Queries centraliseren, idempotency, migratie-veiligheid | `packages/database/*`, migraties | —                |
| `PW-QC-03-ai-pipeline-hygiene.md`     | Prompt-sync, confidence, post-processing, shared utils  | `packages/ai/src/agents/*`       | PW-QC-02 (losse) |
| `PW-QC-04-file-splits-and-tests.md`   | Files >150 regels splitsen + anti-laundering tests      | Alle `> 150` LOC bestanden       | PW-QC-01/02/03   |

## Prioritering

1. **Blockers eerst** (PW-QC-01: B1 auth-volgorde, PW-QC-04: T1 chainable DB-mock, PW-QC-04: A2 files te groot).
2. **Data-hygiëne** (PW-QC-02) vóór feature-flag `USE_MEETING_STRUCTURER` standaard op `true` gaat.
3. **AI-hygiëne** (PW-QC-03) parallel aan PW-QC-02 oppakbaar; gedeelde utilities komen daar.
4. **File splits + tests** (PW-QC-04) als laatste — bouwt op schone queries (PW-QC-02) en shared utils (PW-QC-03).

## Uitgesloten uit deze tranche

- **AI4 (metadata-agent-splitsing)** — alleen relevant als Sonnet timeouts of context-truncation laat zien in productie. Pas inplannen bij concreet signaal.
- **D6 (`follow_up_context = NULL` handling)** — eerst verifiëren of er überhaupt een consumer is die breekt. Geen sprint nodig, wel een check tijdens PW-QC-02.
- **X1 legacy cleanup** — wacht tot `USE_MEETING_STRUCTURER=true` permanent is. Eigen toekomstige sprint.

## Bronverwijzingen

- Code-quality review output: conversatie-sessie rond commit `b9a792a` (2026-04-19).
- Flowwijs-regels: `CLAUDE.md` → secties "Regels", "Tests (anti-laundering)", "Werkwijze".
- Vision: `docs/specs/vision-ai-native-architecture.md`.
- Parent sprint: `docs/backlog/PW-02-meeting-structurer.md`.
