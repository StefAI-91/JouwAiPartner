# Docs Backlog

Remaining sprint specs that haven't been moved to `sprints/backlog/` yet.
All sprint tracking lives in `sprints/` (see `sprints/backlog/README.md` for the master backlog).

## Remaining DevHub Fase 2 Specs

These files contain detailed requirements for future sprints:

| File                            | Sprint                             | Status           |
| ------------------------------- | ---------------------------------- | ---------------- |
| `DH-008-status-page.md`         | Status page (public, per-project)  | Backlog (fase 2) |
| `DH-009-duplicate-detection.md` | Duplicate detection via embeddings | Backlog (fase 2) |

## Access Control tranche (DH-013 t/m DH-020)

Zie [`DH-013-020-access-control-index.md`](./DH-013-020-access-control-index.md) voor overzicht, dependency graph en traceability matrix.

| File                                          | Sprint                                                | Prerequisites          |
| --------------------------------------------- | ----------------------------------------------------- | ---------------------- |
| `DH-013-access-control-db-foundation.md`      | DB fundering + min-1-admin trigger                    | —                      |
| `DH-014-auth-helpers-assertions.md`           | `isAdmin` / `requireAdmin` / `assertProjectAccess`    | DH-013                 |
| `DH-015-cockpit-admin-only.md`                | Cockpit middleware + action guards                    | DH-013, DH-014         |
| `DH-016-devhub-project-access-enforcement.md` | DevHub app-layer access checks (404 bij no-access)    | DH-013, DH-014         |
| ~~`DH-017-rls-project-access.md`~~            | _Gedaan 2026-04-13 — verplaatst naar `sprints/done/`_ | DH-013, DH-014, DH-016 |
| ~~`DH-018-magic-link-login.md`~~              | _Gedaan 2026-04-13 — verplaatst naar `sprints/done/`_ | DH-013, DH-014, DH-015 |
| ~~`DH-019-invite-flow.md`~~                   | _Gedaan 2026-04-13 — verplaatst naar `sprints/done/`_ | DH-013, DH-014, DH-018 |
| ~~`DH-020-admin-team-ui.md`~~                 | _Gedaan 2026-04-13 — verplaatst naar `sprints/done/`_ | DH-013/14/15/19        |

## Completed (moved to `sprints/done/`)

The following were completed and moved on 2026-04-10:

- FND-001 through FND-004 (foundation shared packages)
- DH-001 through DH-007 (DevHub fase 1)
