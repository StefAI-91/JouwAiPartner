# Requirements Register — Portal MVP

Gegenereerd uit `docs/archive/portal-mvp.md` (gearchiveerd 2026-04-27, oorspronkelijk 2026-04-17).
Totaal: 72 requirements.

> **Last verified:** 2026-04-20 (Q4b, steekproef-strategie per Q4a-5).
> **Bekende drift:** laag — CP-001..005 done, MVP-scope klopt. Portal-app nog niet gedeployed, launch is "Next" in vision-roadmap.
> **Opvolger:** `docs/specs/prd-client-portal/` (Stefan First MVP) breidt deze register uit met `client_visible`-laag, vier-bucket dashboard en DevHub admin-toggle. Regelnummer-verwijzingen hieronder slaan op de oorspronkelijke layout van `portal-mvp.md` (regels +5 t.o.v. gearchiveerde versie door toegevoegde header).

---

## Functionele eisen

| ID       | Beschrijving                                                                      | Bron                         | Sprint |
| -------- | --------------------------------------------------------------------------------- | ---------------------------- | ------ |
| FUNC-P01 | Client role toevoegen aan profiles.role constraint (naast admin/member)           | portal-mvp.md:32 (AUTH-P01)  | CP-001 |
| FUNC-P02 | Magic link login via Supabase Auth (shouldCreateUser: false)                      | portal-mvp.md:33 (AUTH-P02)  | CP-002 |
| FUNC-P03 | Invite-flow: intern team maakt klantaccount aan met organisatie-koppeling         | portal-mvp.md:34 (AUTH-P03)  | CP-001 |
| FUNC-P04 | Overzichtspagina met alle projecten waar de klant toegang toe heeft               | portal-mvp.md:53 (PROJ-P01)  | CP-003 |
| FUNC-P05 | Per project tonen: naam, status, organisatie, laatste activiteit                  | portal-mvp.md:54 (PROJ-P02)  | CP-003 |
| FUNC-P06 | Project klikbaar naar project detail                                              | portal-mvp.md:55 (PROJ-P03)  | CP-003 |
| FUNC-P07 | Project dashboard: status weergave (huidige fase)                                 | portal-mvp.md:61 (DASH-P01)  | CP-004 |
| FUNC-P08 | Project dashboard: AI-gegenereerde samenvatting uit summaries tabel               | portal-mvp.md:62 (DASH-P02)  | CP-004 |
| FUNC-P09 | Project dashboard: recente activiteit (laatste issues, statuswijzigingen)         | portal-mvp.md:63 (DASH-P03)  | CP-004 |
| FUNC-P10 | Project dashboard: aantal open/in behandeling/afgeronde issues als metrics        | portal-mvp.md:64 (DASH-P04)  | CP-004 |
| FUNC-P11 | Issue lijst voor het project, gesorteerd op datum                                 | portal-mvp.md:70 (ISSUE-P01) | CP-004 |
| FUNC-P12 | Vertaalde statussen voor klantweergave                                            | portal-mvp.md:72 (ISSUE-P02) | CP-004 |
| FUNC-P13 | Issue detail: titel, beschrijving, status, type, aanmaakdatum                     | portal-mvp.md:74 (ISSUE-P05) | CP-004 |
| FUNC-P14 | Filteren op status (vertaalde waarden)                                            | portal-mvp.md:73 (ISSUE-P04) | CP-004 |
| FUNC-P15 | Feedback formulier: titel, beschrijving, type (bug/wens/vraag)                    | portal-mvp.md:81 (FEED-P01)  | CP-005 |
| FUNC-P16 | Feedback formulier: project selectie (als klant meerdere projecten heeft)         | portal-mvp.md:82 (FEED-P02)  | CP-005 |
| FUNC-P17 | Feedback submission maakt DevHub issue aan via insertIssue() met source: 'portal' | portal-mvp.md:83 (FEED-P03)  | CP-005 |
| FUNC-P18 | Bevestiging na indienen feedback + issue verschijnt in issue tracker              | portal-mvp.md:84 (FEED-P04)  | CP-005 |
| FUNC-P19 | Redirect naar project detail als klant maar 1 project heeft (op /)                | portal-mvp.md:171            | CP-003 |
| FUNC-P20 | Auth callback route (/auth/callback) voor magic link afhandeling                  | portal-mvp.md:105 (APP-P05)  | CP-002 |

## Datamodel eisen

| ID       | Beschrijving                                                                                                               | Bron              | Sprint |
| -------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------ |
| DATA-P01 | Tabel portal_project_access: kolom id (UUID, PK)                                                                           | portal-mvp.md:137 | CP-001 |
| DATA-P02 | Tabel portal_project_access: kolom profile_id (UUID, FK naar profiles.id)                                                  | portal-mvp.md:138 | CP-001 |
| DATA-P03 | Tabel portal_project_access: kolom project_id (UUID, FK naar projects.id)                                                  | portal-mvp.md:139 | CP-001 |
| DATA-P04 | Tabel portal_project_access: kolom created_at (TIMESTAMPTZ, default now())                                                 | portal-mvp.md:140 | CP-001 |
| DATA-P05 | Tabel portal_project_access: UNIQUE constraint op (profile_id, project_id)                                                 | portal-mvp.md:141 | CP-001 |
| DATA-P06 | profiles.role constraint uitbreiden: CHECK (role IN ('admin', 'member', 'client'))                                         | portal-mvp.md:145 | CP-001 |
| DATA-P07 | profiles tabel: kolom organization_id toevoegen (UUID, FK naar organizations.id) — koppelt client user aan hun organisatie | portal-mvp.md:146 | CP-001 |

## Rollen en permissies

| ID       | Beschrijving                                                                                       | Bron                        | Sprint |
| -------- | -------------------------------------------------------------------------------------------------- | --------------------------- | ------ |
| AUTH-P01 | Middleware: portal vereist client role, redirect naar login als niet ingelogd                      | portal-mvp.md:35 (AUTH-P04) | CP-002 |
| AUTH-P02 | Client users worden geblokkeerd op cockpit (bestaande middleware aanpassen)                        | portal-mvp.md:36 (AUTH-P05) | CP-002 |
| AUTH-P03 | Client users worden geblokkeerd op devhub (bestaande middleware aanpassen)                         | portal-mvp.md:36 (AUTH-P05) | CP-002 |
| AUTH-P04 | createAuthMiddleware requireRole uitbreiden met 'client'                                           | portal-mvp.md:35-36         | CP-002 |
| AUTH-P05 | Portal auth callback route-afhandeling met role-check (client -> portal, admin/member -> afwijzen) | portal-mvp.md:169           | CP-002 |

## UI/UX eisen

| ID     | Beschrijving                                                                                                                                            | Bron                            | Sprint |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------ |
| UI-P01 | Zelfde shadcn/ui component library als cockpit/devhub                                                                                                   | portal-mvp.md:91 (UI-P01)       | CP-003 |
| UI-P02 | Eigen sidebar layout, aangepast voor klantnavigatie                                                                                                     | portal-mvp.md:92 (UI-P02)       | CP-003 |
| UI-P03 | Workspace switcher toont portal als actief (bestaand component)                                                                                         | portal-mvp.md:93 (UI-P03)       | CP-003 |
| UI-P04 | Responsive design (klanten kunnen op mobiel kijken)                                                                                                     | portal-mvp.md:94 (UI-P04)       | CP-003 |
| UI-P05 | Loading states (loading.tsx) per route                                                                                                                  | portal-mvp.md:95 (UI-P05)       | CP-003 |
| UI-P06 | Error states (error.tsx) per route                                                                                                                      | portal-mvp.md:95 (UI-P05)       | CP-003 |
| UI-P07 | Login pagina met split-screen design (consistent met cockpit/devhub)                                                                                    | portal-mvp.md:169               | CP-002 |
| UI-P08 | Issue status mapping weergave: triage->Ontvangen, backlog->Ingepland, todo->Ingepland, in_progress->In behandeling, done->Afgerond, cancelled->Afgerond | portal-mvp.md:72-73 (ISSUE-P03) | CP-004 |
| UI-P09 | Projecten overzicht toont cards/tabel met naam, status, organisatie, laatste activiteit                                                                 | portal-mvp.md:53-55             | CP-003 |
| UI-P10 | Feedback formulier type selector: bug, wens, vraag                                                                                                      | portal-mvp.md:81                | CP-005 |
| UI-P11 | Bevestigingsweergave na feedback indienen                                                                                                               | portal-mvp.md:84                | CP-005 |
| UI-P12 | Mobile header met hamburger menu voor portal layout                                                                                                     | portal-mvp.md:94                | CP-003 |

## Business rules

| ID       | Beschrijving                                                                                                                            | Bron                         | Sprint |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------ |
| RULE-P01 | Klant ziet alleen geverifieerde content (verified meetings/extractions)                                                                 | portal-mvp.md:44 (RLS-P02)   | CP-001 |
| RULE-P02 | Klant ziet geen transcripten, alleen samenvattingen                                                                                     | portal-mvp.md:44 (RLS-P03)   | CP-004 |
| RULE-P03 | Interne opmerkingen/comments niet zichtbaar voor klant                                                                                  | portal-mvp.md:76 (ISSUE-P06) | CP-004 |
| RULE-P04 | Toegang is invite-only, intern team maakt account aan                                                                                   | portal-mvp.md:22             | CP-001 |
| RULE-P05 | Statusmapping: triage->Ontvangen, backlog->Ingepland, todo->Ingepland, in_progress->In behandeling, done->Afgerond, cancelled->Afgerond | portal-mvp.md:72 (ISSUE-P03) | CP-004 |
| RULE-P06 | Feedback wordt DevHub issue met source: 'portal'                                                                                        | portal-mvp.md:83 (FEED-P03)  | CP-005 |
| RULE-P07 | Feedback formulier: project wordt automatisch geselecteerd bij project-detail pagina                                                    | portal-mvp.md:82 (FEED-P02)  | CP-005 |
| RULE-P08 | Meerdere klantgebruikers per organisatie mogelijk                                                                                       | portal-mvp.md:20             | CP-001 |

## Security eisen

| ID      | Beschrijving                                                                          | Bron                        | Sprint |
| ------- | ------------------------------------------------------------------------------------- | --------------------------- | ------ |
| SEC-P01 | RLS policy: client users zien alleen projecten van hun eigen organisatie              | portal-mvp.md:42 (RLS-P01)  | CP-001 |
| SEC-P02 | RLS policy: client users zien alleen issues gekoppeld aan hun organisatie's projecten | portal-mvp.md:45 (RLS-P04)  | CP-001 |
| SEC-P03 | Bestaande cockpit/devhub RLS policies blijven ongewijzigd voor admin/member           | portal-mvp.md:46 (RLS-P05)  | CP-001 |
| SEC-P04 | portal_project_access koppeltabel voor fijnmazige project-level toegang               | portal-mvp.md:47 (RLS-P06)  | CP-001 |
| SEC-P05 | Zod validatie op alle feedback input                                                  | portal-mvp.md:85 (FEED-P05) | CP-005 |
| SEC-P06 | shouldCreateUser: false bij magic link login (geen self-registration)                 | portal-mvp.md:33            | CP-002 |
| SEC-P07 | Portal middleware blokkeert admin/member users (alleen client role toegestaan)        | portal-mvp.md:35            | CP-002 |
| SEC-P08 | Cockpit middleware blokkeert client users                                             | portal-mvp.md:36            | CP-002 |
| SEC-P09 | DevHub middleware blokkeert client users                                              | portal-mvp.md:36            | CP-002 |

## Performance eisen

| ID       | Beschrijving                     | Bron                        | Sprint |
| -------- | -------------------------------- | --------------------------- | ------ |
| PERF-P01 | Pagina's laden binnen 2 seconden | portal-mvp.md:118 (NFR-P05) | CP-003 |

## Edge cases

| ID       | Beschrijving                                                           | Bron                         | Sprint |
| -------- | ---------------------------------------------------------------------- | ---------------------------- | ------ |
| EDGE-P01 | Klant met 1 project: redirect van / naar /projects/[id]                | portal-mvp.md:171            | CP-003 |
| EDGE-P02 | Klant zonder projecten: lege state tonen                               | portal-mvp.md:53 (impliciet) | CP-003 |
| EDGE-P03 | Client user probeert cockpit te bereiken: redirect naar portal         | portal-mvp.md:36             | CP-002 |
| EDGE-P04 | Client user probeert devhub te bereiken: redirect naar portal          | portal-mvp.md:36             | CP-002 |
| EDGE-P05 | Admin/member probeert portal te bereiken: redirect naar cockpit/devhub | portal-mvp.md:35             | CP-002 |
| EDGE-P06 | Geen summaries beschikbaar voor project: toon placeholder tekst        | portal-mvp.md:62 (impliciet) | CP-004 |
| EDGE-P07 | Geen issues voor project: lege state tonen                             | portal-mvp.md:70 (impliciet) | CP-004 |

## App scaffolding eisen

| ID      | Beschrijving                                          | Bron                        | Sprint |
| ------- | ----------------------------------------------------- | --------------------------- | ------ |
| APP-P01 | Next.js app in apps/portal/ (port 3002)               | portal-mvp.md:101 (APP-P01) | CP-002 |
| APP-P02 | Turborepo integratie (dev, build, lint, type-check)   | portal-mvp.md:102 (APP-P02) | CP-002 |
| APP-P03 | Shared packages: @repo/database, @repo/auth, @repo/ui | portal-mvp.md:103 (APP-P03) | CP-002 |
| APP-P04 | Tailwind CSS v4 setup (zelfde als cockpit/devhub)     | portal-mvp.md:104 (APP-P04) | CP-002 |
| APP-P05 | Middleware met requireRole: 'client'                  | portal-mvp.md:106 (APP-P06) | CP-002 |

## Niet-functionele eisen (bewust uitgesteld)

| ID      | Beschrijving                                               | Bron              | Sprint |
| ------- | ---------------------------------------------------------- | ----------------- | ------ |
| NFR-P01 | Geen real-time updates nodig — SSR, page refresh voldoende | portal-mvp.md:114 | -      |
| NFR-P02 | Geen notificaties in v1                                    | portal-mvp.md:115 | -      |
| NFR-P03 | Geen chat/Q&A functionaliteit in v1                        | portal-mvp.md:116 | -      |
| NFR-P04 | Geen milestones/timeline datamodel in v1                   | portal-mvp.md:117 | -      |

---

## Statistieken

- Totaal requirements: 72
- Gedekt door sprints: 68 (94.4%)
- Niet gedekt: 4 (NFR-P01 t/m NFR-P04 — bewust uitgestelde niet-functionele eisen, geen actie nodig)

---

## Traceability Matrix

### Per sprint: welke requirements?

| Sprint | Requirements                                                                                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CP-001 | FUNC-P01, FUNC-P03, DATA-P01, DATA-P02, DATA-P03, DATA-P04, DATA-P05, DATA-P06, DATA-P07, RULE-P01, RULE-P04, RULE-P08, SEC-P01, SEC-P02, SEC-P03, SEC-P04                                  |
| CP-002 | FUNC-P02, FUNC-P20, AUTH-P01, AUTH-P02, AUTH-P03, AUTH-P04, AUTH-P05, SEC-P06, SEC-P07, SEC-P08, SEC-P09, UI-P07, APP-P01, APP-P02, APP-P03, APP-P04, APP-P05, EDGE-P03, EDGE-P04, EDGE-P05 |
| CP-003 | FUNC-P04, FUNC-P05, FUNC-P06, FUNC-P19, UI-P01, UI-P02, UI-P03, UI-P04, UI-P05, UI-P06, UI-P09, UI-P12, PERF-P01, EDGE-P01, EDGE-P02                                                        |
| CP-004 | FUNC-P07, FUNC-P08, FUNC-P09, FUNC-P10, FUNC-P11, FUNC-P12, FUNC-P13, FUNC-P14, RULE-P02, RULE-P03, RULE-P05, UI-P08, EDGE-P06, EDGE-P07                                                    |
| CP-005 | FUNC-P15, FUNC-P16, FUNC-P17, FUNC-P18, RULE-P06, RULE-P07, SEC-P05, UI-P10, UI-P11                                                                                                         |

### Niet-gedekte requirements

| ID      | Beschrijving                   | Reden                                                       |
| ------- | ------------------------------ | ----------------------------------------------------------- |
| NFR-P01 | Geen real-time updates nodig   | Bewust uitgesteld — architectuurbeslissing, geen code-actie |
| NFR-P02 | Geen notificaties in v1        | Bewust uitgesteld — fase 2+                                 |
| NFR-P03 | Geen chat/Q&A in v1            | Bewust uitgesteld — fase 2+                                 |
| NFR-P04 | Geen milestones/timeline in v1 | Bewust uitgesteld — fase 2+                                 |
