# Sprint Backlog

Master backlog voor alle aankomende sprints. Sprint-telling + breakdown staat in `docs/specs/docs-inventory.md §1`.

> **Last synced:** 2026-04-30 (backlog-audit: 37 al-gedane sprints verplaatst naar `sprints/done/`).
> **Completed sprints:** zie `sprints/done/` (109 bestanden). Samenvatting in de toplevel van deze README onder "Completed Sprints Summary".

## Open backlog

Alle rijen in deze tabel corresponderen met een bestaand sprint-spec bestand. Kolom "Locatie" geeft aan waar het bestand staat.

| #        | Sprint                                                                            | Area          | Locatie            | Status        |
| -------- | --------------------------------------------------------------------------------- | ------------- | ------------------ | ------------- |
| 029      | Project page rebuild (AI summaries, action items, decisions)                      | Cockpit UI    | `sprints/backlog/` | Backlog       |
| 030      | Organization page + AI summary                                                    | Cockpit UI    | `sprints/backlog/` | Backlog       |
| 038      | Summarizer project-prefix (hernummerd van 035 ivm collisie)                       | Cockpit AI    | `sprints/backlog/` | Backlog       |
| 037      | Management insights                                                               | Cockpit AI    | `sprints/backlog/` | Backlog       |
| DH-008   | Status page (public, per-project, read-only)                                      | DevHub fase 2 | `docs/backlog/`    | Backlog       |
| DH-009   | Duplicate detection via embeddings                                                | DevHub fase 2 | `docs/backlog/`    | Backlog       |
| DH-013   | Access control DB foundation                                                      | DevHub access | `docs/backlog/`    | Backlog       |
| DH-014   | Auth helpers + assertions                                                         | DevHub access | `docs/backlog/`    | Backlog       |
| DH-015   | Cockpit admin-only guards                                                         | DevHub access | `docs/backlog/`    | Backlog       |
| DH-016   | DevHub project-access enforcement                                                 | DevHub access | `docs/backlog/`    | Backlog       |
| PW-01    | Project workspace UI                                                              | Project view  | `docs/backlog/`    | Backlog       |
| PW-02    | Meeting structurer                                                                | Project AI    | `docs/backlog/`    | Backlog       |
| PW-03    | Project orchestrator                                                              | Project AI    | `docs/backlog/`    | Backlog       |
| PW-QC-01 | Security + error handling op /dev/extractor actions                               | Quality       | `docs/backlog/`    | Backlog       |
| PW-QC-02 | Database discipline (queries, idempotency, migratie-safety)                       | Quality       | `docs/backlog/`    | Backlog       |
| PW-QC-03 | AI-pipeline hygiëne (prompt-sync, confidence, shared utils)                       | Quality       | `docs/backlog/`    | Backlog       |
| PW-QC-04 | File splits + anti-laundering tests                                               | Quality       | `docs/backlog/`    | Backlog       |
| T01      | AI Pipeline kritieke tests (9 modules)                                            | Testing       | `sprints/backlog/` | Backlog       |
| R01      | Database + Rinkel API client                                                      | VoIP pipeline | `sprints/backlog/` | Backlog       |
| R02      | Call processing pipeline                                                          | VoIP pipeline | `sprints/backlog/` | Backlog       |
| R03      | UI updates for call data                                                          | VoIP pipeline | `sprints/backlog/` | Backlog       |
| R04      | Audio storage + playback                                                          | VoIP pipeline | `sprints/backlog/` | Backlog       |
| Q4b      | Spec sync execution (na Q4a)                                                      | Quality       | `sprints/backlog/` | In uitvoering |
| TH-7     | Cleanup blockers (CI lint, N+1, double-fetch, userId guard)                       | Themes QA     | `sprints/backlog/` | Backlog       |
| TH-8     | Cleanup majors (DRY, SRP, query-efficiency, file-splits)                          | Themes QA     | `sprints/backlog/` | Backlog       |
| TH-9     | Cleanup minors (conventies, tokens, hygiëne)                                      | Themes QA     | `sprints/backlog/` | Backlog       |
| CC-002   | Resend notificaties (klantgericht)                                                | Customer Comm | `sprints/done/`    | Done          |
| CC-003   | DevHub source-badge (klant vs intern)                                             | Customer Comm | `sprints/done/`    | Done          |
| CC-004   | Outbound met AI-draft + review-gate                                               | Customer Comm | `sprints/backlog/` | Backlog       |
| CC-005   | Per-project inbox-tab + onboarding-card                                           | Customer Comm | `sprints/done/`    | Done          |
| CC-006   | Vrije messaging (cockpit ↔ portal)                                                | Customer Comm | `sprints/done/`    | Done          |
| CC-007   | Security & correctness fixes (review CC-001 t/m CC-006)                           | Customer Comm | `sprints/done/`    | Done          |
| CC-008   | Architectuur-drift, tests & polish (review CC-001 t/m CC-006)                     | Customer Comm | `sprints/done/`    | Done          |
| PR-026   | Portal-inbox two-pane desktop layout (Linear-stijl)                               | Portal UX     | `sprints/done/`    | Done          |
| WG-001   | Widget ingest foundation (DB whitelist + DevHub endpoint)                         | Widget V0     | `sprints/backlog/` | Backlog       |
| WG-002   | Widget app scaffold + loader.js (apps/widget/, Vercel)                            | Widget V0     | `sprints/backlog/` | Backlog       |
| WG-003   | Widget UI + cockpit rollout (modal + script-tag)                                  | Widget V0     | `sprints/backlog/` | Backlog       |
| SRP-002  | queries/meetings/core.ts splitsen (892 r, 33+ exports)                            | Refactor SRP  | `sprints/backlog/` | Backlog       |
| SRP-003  | action-item-specialist.ts splitsen per pipeline (851 r)                           | Refactor SRP  | `sprints/backlog/` | Backlog       |
| SRP-004  | dev/action-items/run/client.tsx subcomponenten extraheren                         | Refactor SRP  | `sprints/backlog/` | Backlog       |
| SRP-005  | pipeline/summary/core.ts splitsen per scope (516 r)                               | Refactor SRP  | `sprints/backlog/` | Backlog       |
| SRP-006  | pipeline/tagger.ts splitsen per concern (504 r)                                   | Refactor SRP  | `sprints/backlog/` | Backlog       |
| SRP-007  | dev/speaker-mapping/client.tsx subcomponenten extraheren                          | Refactor SRP  | `sprints/backlog/` | Backlog       |
| SRP-008  | issue-filters.tsx subcomponenten extraheren (494 r)                               | Refactor SRP  | `sprints/backlog/` | Backlog       |
| SRP-009  | pipeline/steps/link-themes.ts opbreken in fases (484 r)                           | Refactor SRP  | `sprints/backlog/` | Backlog       |
| SRP-010  | queries/projects/core.ts splitsen (460 r, 12 exports)                             | Refactor SRP  | `sprints/backlog/` | Backlog       |
| SRP-011  | gatekeeper-pipeline.ts opbreken in fases (426 r)                                  | Refactor SRP  | `sprints/backlog/` | Backlog       |
| SRP-012  | queries/issues/core.ts splitsen (418 r, 9 exports)                                | Refactor SRP  | `sprints/backlog/` | Backlog       |
| SRP-013  | Database god-files splitsen (inbox 537r, emails-mut 295r, meetings/core-mut 343r) | Refactor SRP  | `sprints/done/`    | Done          |
| DH-021   | DevHub feature-promotion: `review` + `questions` naar features/                   | Architectuur  | `sprints/done/`    | Done          |
| AD-001   | Cockpit cross-feature ontkoppeling + agents-duplicate cleanup                     | Architectuur  | `sprints/done/`    | Done          |

> **SRP-serie:** elf refactor-sprints op files die de SRP-drempels uit `CLAUDE.md` overschrijden. SRP-001 (shift/page.tsx) is vervallen — die page bleek een ongelinkte mockup en is verwijderd ipv gesplitst. Volledige analyse, volgorde-aanbeveling, sprint-sizes en risico's: zie `sprints/backlog/SRP-matrix.md`. Overlap met `PW-QC-04` (File splits + anti-laundering tests in `docs/backlog/`): de SRP-serie is concreter per file; PW-QC-04 kan blijven als overkoepelend acceptance-bucket of vervangen worden door de SRP-matrix.

## Completed Sprints Summary

Voor de volledige lijst: `ls sprints/done/` (72 sprint-specs). Totaal-breakdown per prefix staat in `docs/specs/docs-inventory.md §1.2`.

### v1 — Core Platform (sprints 001-007)

Meetings pipeline, database, MCP server, AI agents (Gatekeeper + extracties), embeddings.

### v2 — Review & Dashboard (sprints 008-014)

Monorepo, review gate, meeting detail, projects, dashboard, MCP verification filter.

### v2.5 — Test Framework Kickoff (sprints 015-019)

Test framework, Zod schema tests, test utilities, server action integration tests, MCP tests. Sprints 015 en 016 hebben elk twee files (parallelle workstreams).

### v3 — Segmented Summaries (sprints 020-028)

Database migrations, Gatekeeper project-ID, tagger + segments, Extractor constraints, review UI, MCP search, feedback loop, meeting detail, batch migration.

### v3.5 — Administratie + Board (sprints 031-036)

Shared packages cleanup (031), administratie-datamodel (032), administratie-UI (033), email-koppeling adviseurs (034), board meetings management (035), org summary + emails timeline (036).

### v4 — Behavioral Test Coverage (T02-T07)

Gedragstests voor kritieke lagen: database mutations (T02), queries (T03), cockpit actions (T04), devhub actions (T05), MCP tools (T06), API routes (T07). T01 (AI pipeline) nog backlog.

### Foundation — Shared Packages (FND-001 ... FND-004)

Shared UI-components, auth helpers, shared constants/validations, DevHub-architectuur-fix.

### DevHub Fase 1 — Bug Intake & Triage (DH-001 ... DH-007)

Database, queries/mutations, app shell, issue list, CRUD + detail, AI-classification, Userback sync.

### DevHub Fase 1.5 — Architecture + Auth (DH-010, DH-011, DH-012, DH-017, DH-018, DH-019, DH-020)

Architecture fixes, component refactor, error handling, RLS project access, magic-link login, invite-flow, admin-team UI.

### Portal MVP — CP-001..005

Database foundation, app scaffolding + auth, project overview dashboard, issue tracker, feedback form. Portal app nog niet gedeployed.

### Quality — Q2a, Q2b-A/B/C, Q3a, Q3b, Q4a

Query inventory spike (Q2a), query centralisatie in drie tranches (Q2b-A/B/C), test infra spike (Q3a) + vangnet execution (Q3b), docs audit spike (Q4a).
