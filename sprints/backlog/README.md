# Sprint Backlog

Master backlog for all upcoming work. Sprint numbering continues from 029 (sprints 001-028 are done).

## Backlog Overview

| #        | Sprint                                                       | Area          | Status  |
| -------- | ------------------------------------------------------------ | ------------- | ------- |
| 029      | Project page rebuild (AI summaries, action items, decisions) | Cockpit UI    | Backlog |
| 030      | Organization page + AI summary                               | Cockpit UI    | Backlog |
| DH-008   | Status page (public, per-project, read-only)                 | DevHub fase 2 | Backlog |
| DH-009   | Duplicate detection via embeddings                           | DevHub fase 2 | Backlog |
| 031      | Shared packages cleanup (constants, validations, formatting) | Monorepo      | Backlog |
| T01      | AI Pipeline kritieke tests (9 modules)                       | Testing       | Backlog |
| T02      | Database mutations tests (10 modules)                        | Testing       | Backlog |
| T03      | Database queries tests (18 modules)                          | Testing       | Backlog |
| T04      | Cockpit actions tests — ontbrekende modules (6 actions)      | Testing       | Backlog |
| T05      | DevHub actions tests (6 modules)                             | Testing       | Backlog |
| T06      | MCP tools tests (12 modules)                                 | Testing       | Backlog |
| T07      | API routes tests (13 routes)                                 | Testing       | Backlog |
| R01      | Database + Rinkel API client                                 | VoIP pipeline | Backlog |
| R02      | Call processing pipeline                                     | VoIP pipeline | Backlog |
| R03      | UI updates for call data                                     | VoIP pipeline | Backlog |
| R04      | Audio storage + playback                                     | VoIP pipeline | Backlog |
| PW-QC-01 | Security + error handling op /dev/extractor actions          | Quality       | Backlog |
| PW-QC-02 | Database discipline (queries, idempotency, migratie-safety)  | Quality       | Backlog |
| PW-QC-03 | AI-pipeline hygiëne (prompt-sync, confidence, shared utils)  | Quality       | Backlog |
| PW-QC-04 | File splits + anti-laundering tests                          | Quality       | Backlog |
| Q2a      | Query inventory spike (volledige .from()-lijst + beleid)     | Quality       | Backlog |
| Q2b      | Query centralisatie execution (na Q2a)                       | Quality       | Backlog |
| Q3a      | Test infra audit spike (mocks, env, portal/ui setup)         | Quality       | Backlog |
| Q3b      | Test vangnet execution (na Q3a)                              | Quality       | Backlog |
| Q4a      | Docs audit spike (sprint-telling, agents, READMEs)           | Quality       | Backlog |
| Q4b      | Spec sync execution (na Q4a)                                 | Quality       | Backlog |

## Refactor-ideas (niet in planning)

Sprints die speculatief zijn en wachten op een concrete trigger staan in `docs/refactor-ideas/`. Niet inplannen tenzij de trigger in het bestand geraakt wordt.

- **COMM-001/002/003** — Communications supertype refactor. Trigger: 3e kanaal toegevoegd (Slack/Rinkel/support-chat) of portal GA met aantoonbare drift-pijn.

## Completed Sprints Summary

All completed sprints are in `sprints/done/`. Total: 39 sprints.

### v1 — Core Platform (sprints 001-007)

Meetings pipeline, database, MCP server, AI agents (Gatekeeper + Extractor), embeddings.

### v2 — Review & Dashboard (sprints 008-014)

Monorepo, review gate, meeting detail, projects, dashboard, MCP verification filter.

### v2.5 — Testing (sprints 015-019)

Test framework, Zod schema tests, test utilities, server action integration tests, MCP tests.
Note: sprints 015 and 016 each have two files (different workstreams ran in parallel).

### v4 — Behavioral Test Coverage (sprints T01-T07)

Gedragstests voor alle kritieke lagen, geprioriteerd op blast radius via dependency graph.
Volgorde: T01 (pipelines) → T02 (mutations) → T03 (queries) → T04 (cockpit actions) → T05 (devhub actions) → T06 (MCP tools) → T07 (API routes).
Principe: geen false positives, test observeerbaar gedrag, niet implementatiedetails.

### v3 — Segmented Summaries (sprints 020-028)

Database migrations, Gatekeeper project-ID, tagger + segments, Extractor constraints, review UI, MCP search, feedback loop, meeting detail, batch migration.

### Foundation — Shared Packages (FND-001 to FND-004)

Shared UI components, auth helpers, shared constants/validations, DevHub architecture fix.

### DevHub Fase 1 — Bug Intake & Triage (DH-001 to DH-007)

Database, queries/mutations, app shell, issue list, CRUD + detail, AI classification, Userback sync.
