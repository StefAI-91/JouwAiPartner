# DevHub Access Control — Sprint tranche DH-013 t/m DH-020

Deze tranche scherm DevHub af per project met `admin` / `member` rollen en vervangt password-login door invite-only magic link login.

## Doel in één alinea

Externe remote teamleden (vanaf nu: Ege + toekomstige externen) krijgen toegang tot DevHub, maar zien alleen de projecten waar ze expliciet aan gekoppeld zijn. Interne owners (Stef + Wouter) blijven admin met volledige toegang tot Cockpit + DevHub. Rol-informatie leeft uitsluitend op `profiles.role`; `devhub_project_access` wordt een pure koppeltabel. Login wordt invite-only via magic link; geen self-signup.

## Sprint overzicht

| #      | Sprint                          | Laag                | Prerequisites   | Geschatte tijd |
| ------ | ------------------------------- | ------------------- | --------------- | -------------- |
| DH-013 | Access control DB fundering     | 1 — Database        | —               | 1-2 uur        |
| DH-014 | Auth helpers + assertions       | 2 — Auth package    | DH-013          | 2 uur          |
| DH-015 | Cockpit admin-only              | 3 — App (cockpit)   | DH-013, DH-014  | 2 uur          |
| DH-016 | DevHub per-project enforcement  | 3 — App (devhub)    | DH-013, DH-014  | 2-3 uur        |
| DH-017 | RLS policies (defense-in-depth) | 1 — Database + test | DH-013/14/16    | 2 uur          |
| DH-018 | Magic link login                | 3 — App (beide)     | DH-013/14/15    | 2-3 uur        |
| DH-019 | Invite flow                     | 3 — Actions/queries | DH-013/14/18    | 2-3 uur        |
| DH-020 | Admin UI /admin/team            | 4 — UI              | DH-013/14/15/19 | 2-3 uur        |

**Totaal**: ~15-20 uur werk, ~8 Claude Code sessies.

## Dependency graph

```
DH-013 (DB fundering)
  └── DH-014 (auth helpers)
        ├── DH-015 (cockpit admin-only)
        │     ├── DH-018 (magic link)
        │     │     └── DH-019 (invite flow)
        │     │           └── DH-020 (admin UI)
        │     └── DH-020
        └── DH-016 (devhub per-project)
              └── DH-017 (RLS — na DH-016 zodat app al schoon is)
```

DH-016 en DH-015 kunnen parallel draaien na DH-014. DH-017 draait na DH-016 zodat bestaande calls al schoon zijn voor RLS live gaat.

## Traceability: scope-beslissingen → sprints

Onderstaande tabel koppelt elke scope-beslissing uit de planning-prompt aan de sprint(s) die hem concreet implementeert. Een beslissing kan door meerdere sprints geraakt worden (bv. min-1-admin leeft in DB + helpers + UI).

| #   | Scope-beslissing                                                                         | Geïmplementeerd in                                |
| --- | ---------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | Exact twee rollen: `admin` en `member`                                                   | DH-013, DH-014, DH-015                            |
| 2   | `devhub_project_access.role` kolom verwijderen; rol leeft alleen op `profiles`           | DH-013                                            |
| 3   | Admin = impliciet access; code checkt eerst `role === 'admin'` → skip access-row check   | DH-014, DH-017                                    |
| 4   | Stef + Wouter krijgen `role='admin'` via seed op email                                   | DH-013                                            |
| 5   | Ege + externen = `member` (verliezen cockpit-toegang, geaccepteerd)                      | DH-013 + DH-015                                   |
| 6   | Cockpit-toegang alleen voor admin; middleware redirect members                           | DH-015                                            |
| 7   | Magic link voor iedereen; geen self-signup; password wordt uitgefaseerd                  | DH-018                                            |
| 8   | Profile-lifecycle: invite creëert profile + access rows + triggered magic link           | DH-019                                            |
| 9   | User exit: access-rows weg + auth-user banned; profile + content blijft                  | DH-019, DH-020                                    |
| 10  | 404 (niet 403) bij issue-URL zonder toegang — voorkomt info-leak                         | DH-016                                            |
| 11  | Bootstrap-fallback in `listAccessibleProjects` verwijderen                               | DH-014                                            |
| 12  | Admin-UI in cockpit onder `/admin/team`                                                  | DH-020                                            |
| 13  | Min-1-admin regel: laatste admin kan niet demoted/deactivated worden                     | DH-013 (DB), DH-019 (server), DH-020 (UI)         |
| 14  | Defense-in-depth: app-layer + RLS samen opgeleverd (niet gesplitst)                      | DH-016 (app) + DH-017 (RLS), gepland samen getest |
| 15  | Comments/activity voor members = alle items op toegewezen projecten (geen intern/extern) | DH-016, DH-017                                    |

**Alle 15 beslissingen hebben dekking.** Geen gaps.

## Nieuwe requirement IDs

Deze tranche introduceert nieuwe requirement IDs die in `docs/specs/requirements-devhub.md` opgenomen moeten worden (sprint voert deze update zelf uit als taak). Onderstaande lijst is de master — agent mag geen ID's overslaan of hernummeren:

### AUTH-\* (rol/auth)

- `AUTH-150` — exact twee rollen (DH-013)
- `AUTH-151` — rol leeft alleen op profiles (DH-013)
- `AUTH-152` — admin impliciet access (DH-013)
- `AUTH-153` — Stef + Wouter seed (DH-013)
- `AUTH-154` — andere profiles → member fallback (DH-013)
- `AUTH-155` — `isAdmin(userId)` helper (DH-014)
- `AUTH-156` — `requireAdmin()` helper (DH-014)
- `AUTH-157` — `assertProjectAccess(userId, projectId)` helper (DH-014)
- `AUTH-158` — `listAccessibleProjectIds(userId)` (DH-014)
- `AUTH-160` — cockpit middleware admin-only (DH-015)
- `AUTH-161` — members worden duidelijk geredirect (DH-015)
- `AUTH-162` — cockpit actions hard-guarded met admin check (DH-015)
- `AUTH-170` — magic link login (DH-018)
- `AUTH-171` — callback routing op basis van rol (DH-018)
- `AUTH-172` — error-state voor verlopen links (DH-018)
- `AUTH-173` — tijdelijke password-fallback op devhub (DH-018)
- `AUTH-174` — geen self-signup (DH-018)
- `AUTH-175` — sessieduur 30 dagen (DH-018)

### DATA-\* (schema)

- `DATA-200` — drop `devhub_project_access.role` (DH-013)
- `DATA-201` — CHECK constraint op `profiles.role` (DH-013)
- `DATA-202` — min-1-admin trigger/constraint (DH-013)

### SEC-\* (security)

- `SEC-150` — rol-logica alleen in auth package (DH-014)
- `SEC-151` — helpers zijn server-only (DH-014)
- `SEC-152` — default-deny bij ontbrekende user (DH-014)
- `SEC-153` — cockpit middleware redirect vóór data-ophalen (DH-015)
- `SEC-154` — devhub issue list gebruikt accessible project IDs (DH-016)
- `SEC-155` — issue detail 404 bij no-access (DH-016)
- `SEC-156` — createIssueAction check project-access (DH-016)
- `SEC-157` — update/delete check via bestaand issue project (DH-016)
- `SEC-158` — comments CRUD check (DH-016)
- `SEC-159` — activity-inserts alleen na access-check (DH-016)
- `SEC-160` — triage/counts respecteren access (DH-016)
- `SEC-170` — RLS issues SELECT (DH-017)
- `SEC-171` — RLS issues INSERT (DH-017)
- `SEC-172` — RLS issues UPDATE incl. project-id migratie-check (DH-017)
- `SEC-173` — RLS issue_comments SELECT (DH-017)
- `SEC-174` — RLS issue_comments INSERT/UPDATE (DH-017)
- `SEC-175` — RLS issue_activity (DH-017)
- `SEC-176` — RLS devhub_project_access SELECT per user (DH-017)
- `SEC-177` — RLS devhub_project_access writes alleen admin (DH-017)
- `SEC-180` — magic link redirect whitelist (DH-018)
- `SEC-185` — invite flow gebruikt service role (DH-019)
- `SEC-186` — min-1-admin server-side guard (DH-019)
- `SEC-190` — admin UI route-niveau `requireAdmin()` (DH-020)

### FUNC-\* (functioneel)

- `FUNC-160` — project-selector filtert accessible (DH-016)
- `FUNC-170` — `inviteUserAction` (DH-019)
- `FUNC-171` — `inviteUserAction` admin-only (DH-019)
- `FUNC-172` — eerste login koppelt profile op email (DH-019)
- `FUNC-173` — `deactivateUserAction` (DH-019)
- `FUNC-174` — `updateUserAccessAction` (DH-019)
- `FUNC-180` — `/admin/team` page (DH-020)
- `FUNC-181` — team lijst weergave (DH-020)
- `FUNC-182` — invite dialog (DH-020)
- `FUNC-183` — edit dialog (DH-020)
- `FUNC-184` — resend invite (DH-020)

### UI-\* (interface)

- `UI-150` — `NEXT_PUBLIC_DEVHUB_URL` configuratie (DH-015)
- `UI-160` — login form UX (DH-018)
- `UI-170` — side-menu Team item (DH-020)
- `UI-171` — min-1-admin guardrails visueel (DH-020)
- `UI-172` — invite success toast (DH-020)
- `UI-173` — error toasts (DH-020)

### RULE-\* (business)

- `RULE-150` — laatste admin kan niet demoted worden (DH-013 DB; DH-019 action; DH-020 UI)
- `RULE-160` — email als natuurlijke sleutel profiles↔auth (DH-019)
- `RULE-161` — admin-invites negeren projectIds (DH-019)

### PERF-\*

- `PERF-150` — RLS policies performant via helper function (DH-017)

### EDGE-\*

- `EDGE-150` — 404 (niet 403) voor unauth issue (DH-016)
- `EDGE-151` — empty state voor member zonder access-rows (DH-016)
- `EDGE-160` — DEV bypass user ziet alles via RLS (DH-017)
- `EDGE-170` — onbekende email leakt geen info op magic link (DH-018)
- `EDGE-180` — invite is idempotent op bestaande email (DH-019)
- `EDGE-181` — Supabase invite fail → retry mogelijk (DH-019)
- `EDGE-190` — profile zonder email renders zonder crash (DH-020)
- `EDGE-191` — verwijderd project geen dode refs in team-UI (DH-020)

### Intrekking van oude requirements

- `AUTH-101 / AUTH-102 / AUTH-103 / AUTH-104` uit `docs/specs/requirements-devhub.md` (3-rollen model incl. `guest`) → markeer als "vervangen door AUTH-150..158" in DH-013.

## Live-uitrol waarschuwingen

Elke sprint noemt zijn eigen risico's, maar enkele tranche-brede punten:

1. **DH-015 breaks Ege's cockpit-toegang** — communicatie vóór deploy.
2. **DH-017 kan bestaande legacy queries laten falen** op RLS — zorg dat DH-016 al live staat zodat app-laag alles netjes stuurt.
3. **DH-018 magic link uitrol breekt password login op cockpit** — plan gezamenlijk moment waarop iedereen opnieuw inlogt.
4. **DH-019 vereist SMTP werk in Supabase** — verifieer dat e-mails arriveren in Gmail en Outlook vóór echte invites naar Ege.
5. **Rollback-volgorde is omgekeerd van build-volgorde** — revert DH-020 → DH-019 → DH-018 → DH-017 → DH-016 → DH-015 → DH-014 → DH-013 als er grote problemen zijn.

## Volgende stap

Start met `DH-013`. Zie `docs/backlog/DH-013-access-control-db-foundation.md` voor details.
