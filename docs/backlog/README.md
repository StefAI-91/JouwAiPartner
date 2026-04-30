# Docs Backlog

Remaining sprint specs that haven't been moved to `sprints/backlog/` yet.
All sprint tracking lives in `sprints/` (see `sprints/backlog/README.md` for the master backlog).

## Remaining DevHub Fase 2 Specs

These files contain detailed requirements for future sprints:

| File                            | Sprint                             | Status           |
| ------------------------------- | ---------------------------------- | ---------------- |
| `DH-008-status-page.md`         | Status page (public, per-project)  | Backlog (fase 2) |
| `DH-009-duplicate-detection.md` | Duplicate detection via embeddings | Backlog (fase 2) |

## Access Control tranche (DH-013 t/m DH-020) — VOLLEDIG AFGEROND

Zie [`DH-013-020-access-control-index.md`](./DH-013-020-access-control-index.md) voor overzicht, dependency graph en traceability matrix. Alle acht sprints staan nu in `sprints/done/`.

| File                                              | Sprint                                             | Status (2026-04-30)                        |
| ------------------------------------------------- | -------------------------------------------------- | ------------------------------------------ |
| ~~`DH-013-access-control-db-foundation.md`~~      | DB fundering + min-1-admin trigger                 | _Gedaan — verplaatst naar `sprints/done/`_ |
| ~~`DH-014-auth-helpers-assertions.md`~~           | `isAdmin` / `requireAdmin` / `assertProjectAccess` | _Gedaan — verplaatst naar `sprints/done/`_ |
| ~~`DH-015-cockpit-admin-only.md`~~                | Cockpit middleware + action guards                 | _Gedaan — verplaatst naar `sprints/done/`_ |
| ~~`DH-016-devhub-project-access-enforcement.md`~~ | DevHub app-layer access checks (404 bij no-access) | _Gedaan — verplaatst naar `sprints/done/`_ |
| ~~`DH-017-rls-project-access.md`~~                | RLS project access                                 | _Gedaan 2026-04-13 — `sprints/done/`_      |
| ~~`DH-018-magic-link-login.md`~~                  | Magic-link login                                   | _Gedaan 2026-04-13 — `sprints/done/`_      |
| ~~`DH-019-invite-flow.md`~~                       | Invite flow                                        | _Gedaan 2026-04-13 — `sprints/done/`_      |
| ~~`DH-020-admin-team-ui.md`~~                     | Admin-team UI                                      | _Gedaan 2026-04-13 — `sprints/done/`_      |

## PW Quality-Check tranche (PW-QC-01 t/m PW-QC-04)

Zie [`PW-QC-index.md`](./PW-QC-index.md) voor overzicht en prioritering. Bron: code-quality review op commit-range `de1d90d..b9a792a` (PW-02 MeetingStructurer + RiskSpecialist).

| File                                  | Sprint                                                  | Prerequisites                          |
| ------------------------------------- | ------------------------------------------------------- | -------------------------------------- |
| `PW-QC-01-security-error-handling.md` | Auth-volgorde, loading/error routes, action-shape       | PW-02 niet gestart — geblokkeerd       |
| `PW-QC-02-database-discipline.md`     | Queries centraliseren, idempotency, migratie-veiligheid | PW-02 niet gestart — geblokkeerd       |
| `PW-QC-03-ai-pipeline-hygiene.md`     | Prompt-sync, confidence, post-processing, shared utils  | PW-QC-02 (losse)                       |
| `PW-QC-04-file-splits-and-tests.md`   | Files >150 regels splitsen + anti-laundering tests      | PW-QC-01/02/03 — overlap met SRP-serie |

> **Noot:** PW-QC-01..04 zijn afhankelijk van PW-02 (MeetingStructurer), die nog niet gestart is. PW-QC-04 overlapt sterk met de actieve SRP-serie (zie `sprints/backlog/SRP-matrix.md`).

## Project Workspace tranche (PW-01 t/m PW-03)

| File                            | Sprint               | Status                                                                   |
| ------------------------------- | -------------------- | ------------------------------------------------------------------------ |
| `PW-01-project-workspace-ui.md` | Project workspace UI | Backlog (partial — parser klaar, panels nog niet op project-detail page) |
| `PW-02-meeting-structurer.md`   | Meeting structurer   | Backlog (niet gestart — blocker voor PW-03 + PW-QC)                      |
| `PW-03-project-orchestrator.md` | Project orchestrator | Backlog (niet gestart — afhankelijk van PW-02)                           |

## Completed (moved to `sprints/done/`)

The following were completed and moved:

- 2026-04-10: FND-001 through FND-004 (foundation shared packages)
- 2026-04-10: DH-001 through DH-007 (DevHub fase 1)
- 2026-04-13: DH-017, DH-018, DH-019, DH-020 (DevHub access control)
- 2026-04-30: DH-013, DH-014, DH-015, DH-016 (access control fundering — backlog-audit)
