# Sprint Backlog

Master backlog for all upcoming work. Sprint numbering continues from 029 (sprints 001-028 are done).

## Backlog Overview

| #      | Sprint                                                       | Area          | Status  |
| ------ | ------------------------------------------------------------ | ------------- | ------- |
| 029    | Project page rebuild (AI summaries, action items, decisions) | Cockpit UI    | Backlog |
| 030    | Organization page + AI summary                               | Cockpit UI    | Backlog |
| DH-008 | Status page (public, per-project, read-only)                 | DevHub fase 2 | Backlog |
| DH-009 | Duplicate detection via embeddings                           | DevHub fase 2 | Backlog |
| R01    | Database + Rinkel API client                                 | VoIP pipeline | Backlog |
| R02    | Call processing pipeline                                     | VoIP pipeline | Backlog |
| R03    | UI updates for call data                                     | VoIP pipeline | Backlog |
| R04    | Audio storage + playback                                     | VoIP pipeline | Backlog |

## Completed Sprints Summary

All completed sprints are in `sprints/done/`. Total: 39 sprints.

### v1 — Core Platform (sprints 001-007)

Meetings pipeline, database, MCP server, AI agents (Gatekeeper + Extractor), embeddings.

### v2 — Review & Dashboard (sprints 008-014)

Monorepo, review gate, meeting detail, projects, dashboard, MCP verification filter.

### v2.5 — Testing (sprints 015-019)

Test framework, Zod schema tests, test utilities, server action integration tests, MCP tests.
Note: sprints 015 and 016 each have two files (different workstreams ran in parallel).

### v3 — Segmented Summaries (sprints 020-028)

Database migrations, Gatekeeper project-ID, tagger + segments, Extractor constraints, review UI, MCP search, feedback loop, meeting detail, batch migration.

### Foundation — Shared Packages (FND-001 to FND-004)

Shared UI components, auth helpers, shared constants/validations, DevHub architecture fix.

### DevHub Fase 1 — Bug Intake & Triage (DH-001 to DH-007)

Database, queries/mutations, app shell, issue list, CRUD + detail, AI classification, Userback sync.
