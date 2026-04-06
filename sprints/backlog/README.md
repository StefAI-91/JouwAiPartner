# Backlog

## v2 Sprints (afgerond)

Sprints 008-014 zijn afgerond. Zie `sprints/done/`.

## v2.5: Testing Sprints

| #   | Sprint                               | Laag           | Prerequisites | Requirements                 | Status  |
| --- | ------------------------------------ | -------------- | ------------- | ---------------------------- | ------- |
| 015 | Testframework Setup (Vitest)         | 0 - Infra      | Geen          | TEST-001..005                | Backlog |
| 016 | Zod Schema Validatietests            | 1 - Unit       | 015           | TEST-011..055, TEST-065..067 | Backlog |
| 017 | Test Utilities en Database Setup     | 0 - Infra      | 015           | TEST-006..010                | Backlog |
| 018 | Server Actions Integratietests       | 2 - Integratie | 015, 017      | TEST-056..064                | Backlog |
| 019 | MCP Server en Tool Registratie Tests | 1 - Unit       | 015           | TEST-068                     | Backlog |

## v3: Project-Segmented Summaries

### Fase 1: Segmentering

| #   | Sprint                                    | Laag            | Prerequisites | Requirements                                        | Status  |
| --- | ----------------------------------------- | --------------- | ------------- | --------------------------------------------------- | ------- |
| 020 | Database migratie - Segmented Summaries   | 1 - Database    | 014           | DATA-070..088, SEC-006..007                         | Backlog |
| 021 | Gatekeeper uitbreiding - Project-ID       | 2 - AI Pipeline | 020           | AI-020..027, RULE-012..014, EDGE-004..005           | Backlog |
| 022 | Tagger + Segment-bouw                     | 2 - AI Pipeline | 020, 021      | AI-030..036, FUNC-050..055, RULE-015..016, EDGE-006 | Backlog |
| 023 | Extractor aanpassing - Project-constraint | 2 - AI Pipeline | 020, 021      | AI-040..044, FUNC-060..063                          | Backlog |
| 024 | Review UI - Segment-weergave              | 3 - UI          | 020, 022      | UI-050..053, FUNC-070..072, DATA-090                | Backlog |
| 025 | MCP/Zoeken - Segment-level search         | 3 - MCP         | 020, 022      | MCP-010..016, FUNC-080..082                         | Backlog |

### Fase 2: Feedback en verfijning

| #   | Sprint                              | Laag         | Prerequisites | Requirements                 | Status  |
| --- | ----------------------------------- | ------------ | ------------- | ---------------------------- | ------- |
| 026 | Feedback-loop                       | 2 - Pipeline | 020, 022, 024 | FUNC-090..094, RULE-017..018 | Backlog |
| 027 | Meeting detail UI - Segmenten       | 3 - UI       | 024           | UI-060..062, FUNC-100        | Backlog |
| 028 | Batch migratie - Bestaande meetings | 4 - Data     | 021, 022      | FUNC-110..114, RULE-019..020 | Backlog |

## Dependency graph

```
Testing sprints:
015 Testframework Setup
├── 016 Zod Schema Validatietests
├── 017 Test Utilities + DB Setup
│   └── 018 Server Actions Integratietests
└── 019 MCP Server Tests

Project-Segmented Summaries:
020 Database migratie
├── 021 Gatekeeper uitbreiding
│   ├── 022 Tagger + Segment-bouw
│   │   ├── 024 Review UI - Segmenten
│   │   ├── 025 MCP/Zoeken - Segment search
│   │   ├── 026 Feedback-loop (ook: 024)
│   │   └── 028 Batch migratie (ook: 021)
│   └── 023 Extractor aanpassing
└── 027 Meeting detail UI (via 024)
```

022 en 023 zijn onafhankelijk van elkaar en kunnen parallel na 021.
024, 025 en 023 kunnen parallel na 022.
026 vereist 024 (review UI acties).
027 vereist 024 (hergebruik componenten).
028 vereist 021 + 022 (pipeline functies).

## Dekking

### Testing sprints

- Totaal requirements (testing): 68
- Gedekt: 68 (100%)
- Niet gedekt: 0

### Project-Segmented Summaries

- Totaal requirements: 63
- Gedekt: 63 (100%)
- Niet gedekt: 0

Volledig requirements register testing: `docs/specs/requirements-testing.md`

## Totaal

- Testing sprints: 5
- Segmented Summaries sprints: 9
- Totaal sprints: 14
- Geschatte inspanning: 14 Claude Code sessies
