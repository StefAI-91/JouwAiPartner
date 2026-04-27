# Portal MVP — Product Requirements Document

> **Status:** Active
> **Date:** 2026-04-17
> **Owner:** Stef Banninga
> **Version:** 1.0

---

## 1. Doel

Een lean klantportaal bouwen waar klanten de voortgang van hun project(en) kunnen volgen en feedback kunnen geven. Het portaal is het derde kwadrant van het platform (naast cockpit en devhub) en sluit de feedbackloop: jullie leveren op → klant ziet voortgang → klant geeft feedback → feedback landt in DevHub → jullie pakken het op → klant ziet de update.

**Niet het doel:** een volledig uitgebouwd portaal. Dit is een raamwerk dat we op basis van klantfeedback uitbreiden.

---

## 2. Gebruikers

- **Klanten** — medewerkers van klantorganisaties (meerdere per organisatie mogelijk)
- **Toegang:** invite-only, aangemaakt door het interne team
- **Scope:** klant ziet alleen projecten van eigen organisatie, alleen geverifieerde content

---

## 3. Functionele Requirements

### AUTH — Authenticatie & Autorisatie

| ID       | Requirement                                                                           | Prioriteit |
| -------- | ------------------------------------------------------------------------------------- | ---------- |
| AUTH-P01 | Client role toevoegen aan profiles.role (naast admin/member)                          | Must       |
| AUTH-P02 | Magic link login (zelfde Supabase auth, shouldCreateUser: false)                      | Must       |
| AUTH-P03 | Invite-flow: intern team maakt klantaccount aan met organisatie-koppeling             | Must       |
| AUTH-P04 | Middleware: portal vereist client role, redirect naar login als niet ingelogd         | Must       |
| AUTH-P05 | Client users worden geblokkeerd op cockpit en devhub (bestaande middleware aanpassen) | Must       |

### RLS — Row Level Security

| ID      | Requirement                                                                         | Prioriteit |
| ------- | ----------------------------------------------------------------------------------- | ---------- |
| RLS-P01 | Client users zien alleen projecten van hun eigen organisatie                        | Must       |
| RLS-P02 | Client users zien alleen geverifieerde content (verified meetings/extractions)      | Must       |
| RLS-P03 | Client users zien geen transcripten, alleen samenvattingen                          | Must       |
| RLS-P04 | Client users zien alleen issues gekoppeld aan hun organisatie's projecten           | Must       |
| RLS-P05 | Bestaande cockpit/devhub RLS policies blijven ongewijzigd voor admin/member         | Must       |
| RLS-P06 | Koppeltabel portal_project_access (profile_id → project_id) voor fijnmazige toegang | Must       |

### PROJ — Project Overzicht

| ID       | Requirement                                                         | Prioriteit |
| -------- | ------------------------------------------------------------------- | ---------- |
| PROJ-P01 | Overzichtspagina met alle projecten waar de klant toegang toe heeft | Must       |
| PROJ-P02 | Per project: naam, status, organisatie, laatste activiteit          | Must       |
| PROJ-P03 | Klikbaar naar project detail                                        | Must       |

### DASH — Project Dashboard

| ID       | Requirement                                                                | Prioriteit |
| -------- | -------------------------------------------------------------------------- | ---------- |
| DASH-P01 | Project status weergave (huidige fase)                                     | Must       |
| DASH-P02 | AI-gegenereerde samenvatting (uit summaries tabel, type: context/briefing) | Must       |
| DASH-P03 | Recente activiteit: laatste issues, statuswijzigingen                      | Must       |
| DASH-P04 | Aantal open/in behandeling/afgeronde issues als metrics                    | Should     |

### ISSUE — Issue Tracker (read-only)

| ID        | Requirement                                                                                                                       | Prioriteit |
| --------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| ISSUE-P01 | Lijst van issues voor het project, gesorteerd op datum                                                                            | Must       |
| ISSUE-P02 | Vertaalde statussen voor klantweergave                                                                                            | Must       |
| ISSUE-P03 | Statusmapping: triage→Ontvangen, backlog→Ingepland, todo→Ingepland, in_progress→In behandeling, done→Afgerond, cancelled→Afgerond | Must       |
| ISSUE-P04 | Filteren op status (vertaalde waarden)                                                                                            | Should     |
| ISSUE-P05 | Issue detail: titel, beschrijving, status, type, aanmaakdatum                                                                     | Must       |
| ISSUE-P06 | Geen interne opmerkingen/comments zichtbaar voor klant                                                                            | Must       |

### FEED — Feedback Formulier

| ID       | Requirement                                                                    | Prioriteit |
| -------- | ------------------------------------------------------------------------------ | ---------- |
| FEED-P01 | Formulier: titel, beschrijving, type (bug/wens/vraag)                          | Must       |
| FEED-P02 | Selecteer project (als klant meerdere heeft) of automatisch bij project-detail | Must       |
| FEED-P03 | Submission maakt DevHub issue aan via insertIssue() met source: 'portal'       | Must       |
| FEED-P04 | Bevestiging na indienen + issue verschijnt in issue tracker                    | Must       |
| FEED-P05 | Zod validatie op alle input                                                    | Must       |

### UI — Layout & Design

| ID     | Requirement                                                        | Prioriteit |
| ------ | ------------------------------------------------------------------ | ---------- |
| UI-P01 | Zelfde shadcn/ui component library als cockpit/devhub              | Must       |
| UI-P02 | Eigen sidebar layout, aangepast voor klantnavigatie                | Must       |
| UI-P03 | Workspace switcher toont portal als actief (bestaand component)    | Must       |
| UI-P04 | Responsive design (klanten kunnen op mobiel kijken)                | Should     |
| UI-P05 | Loading states (loading.tsx) en error states (error.tsx) per route | Must       |

### APP — App Scaffolding

| ID      | Requirement                                           | Prioriteit |
| ------- | ----------------------------------------------------- | ---------- |
| APP-P01 | Next.js app in apps/portal/ (port 3002)               | Must       |
| APP-P02 | Turborepo integratie (dev, build, lint, type-check)   | Must       |
| APP-P03 | Shared packages: @repo/database, @repo/auth, @repo/ui | Must       |
| APP-P04 | Tailwind CSS v4 setup (zelfde als cockpit/devhub)     | Must       |
| APP-P05 | Auth callback route (/auth/callback)                  | Must       |
| APP-P06 | Middleware met requireRole: 'client'                  | Must       |

---

## 4. Niet-functionele Requirements

| ID      | Requirement                                                                     |
| ------- | ------------------------------------------------------------------------------- |
| NFR-P01 | Geen real-time updates nodig — server-side rendering, page refresh is voldoende |
| NFR-P02 | Geen notificaties in v1                                                         |
| NFR-P03 | Geen chat/Q&A functionaliteit in v1                                             |
| NFR-P04 | Geen milestones/timeline datamodel in v1                                        |
| NFR-P05 | Performance: pagina's laden binnen 2 seconden                                   |

---

## 5. Datamodel

### Bestaande tabellen (lezen)

- `profiles` — user accounts met role (uit te breiden met 'client')
- `organizations` — klantorganisaties
- `projects` — projecten gekoppeld aan organisaties
- `issues` — DevHub issues met status tracking
- `summaries` — AI-gegenereerde samenvattingen per project/organisatie
- `meetings` — vergaderingen (alleen verified, alleen samenvattingen tonen)
- `extractions` — extracties (alleen verified, beperkte weergave)

### Nieuwe tabellen

- `portal_project_access` — koppelt client users aan projecten die ze mogen zien
  - `id` UUID PK
  - `profile_id` UUID FK → profiles(id)
  - `project_id` UUID FK → projects(id)
  - `created_at` TIMESTAMPTZ
  - UNIQUE(profile_id, project_id)

### Wijzigingen aan bestaande tabellen

- `profiles.role` constraint uitbreiden: `CHECK (role IN ('admin', 'member', 'client'))`
- `profiles.organization_id` kolom toevoegen (FK → organizations) — koppelt client user aan hun organisatie

---

## 6. Issue Status Mapping

```typescript
const STATUS_MAP: Record<string, string> = {
  triage: "Ontvangen",
  backlog: "Ingepland",
  todo: "Ingepland",
  in_progress: "In behandeling",
  done: "Afgerond",
  cancelled: "Afgerond",
};
```

---

## 7. Routes

| Route                             | Pagina                                     | Auth                    |
| --------------------------------- | ------------------------------------------ | ----------------------- |
| `/login`                          | Magic link login                           | Public                  |
| `/auth/callback`                  | Auth callback handler                      | Public                  |
| `/`                               | Project overzicht (redirect als 1 project) | Client                  |
| `/projects/[id]`                  | Project dashboard                          | Client + project access |
| `/projects/[id]/issues`           | Issue lijst                                | Client + project access |
| `/projects/[id]/issues/[issueId]` | Issue detail                               | Client + project access |
| `/projects/[id]/feedback`         | Feedback formulier                         | Client + project access |

---

## 8. Feedbackloop

```
1. Team levert op → DevHub issue status update
2. Klant opent portal → ziet voortgang in project dashboard
3. Klant bekijkt issues → ziet status van eerdere meldingen
4. Klant dient feedback in → formulier met titel/beschrijving/type
5. Feedback wordt DevHub issue (source: 'portal')
6. Team pakt issue op in DevHub → status wijzigt
7. Klant ziet statuswijziging bij volgend bezoek
→ Loop herhaalt
```

---

## 9. Bewust uitgesteld (fase 2+)

- AI-powered Q&A (Communicator agent)
- Chat functionaliteit
- Notificaties (email/push)
- Milestones en timeline
- Publieke statuspagina per project
- Real-time updates (websockets)
- Klant-specifieke branding/theming
- Self-service registratie

---

## 10. Technische beslissingen

| Beslissing       | Keuze                                  | Rationale                                          |
| ---------------- | -------------------------------------- | -------------------------------------------------- |
| Database         | Zelfde Supabase instance               | Data bestaat al, geen sync nodig, RLS voor scoping |
| Auth             | Supabase Auth + magic link             | Consistent met cockpit/devhub, geen wachtwoorden   |
| Invite model     | Invite-only, intern team maakt account | Controle over wie toegang heeft                    |
| Issue statussen  | Vertaalde presentatielaag              | Geen DB-wijziging nodig, betere klantervaring      |
| Feedback → Issue | Directe insert via insertIssue()       | Hergebruik bestaande mutation, source: 'portal'    |
| Real-time        | Niet in v1                             | SSR + refresh is voldoende, minder complexity      |

---

## 11. Traceability Matrix

Elke requirement is toegewezen aan een sprint. Geen requirement is ongedekt.

| Requirement | Sprint  | Status  |
| ----------- | ------- | ------- |
| AUTH-P01    | CP-001  | Done    |
| AUTH-P02    | CP-002  | Done    |
| AUTH-P03    | CP-001  | Done    |
| AUTH-P04    | CP-002  | Done    |
| AUTH-P05    | CP-002  | Done    |
| RLS-P01     | CP-001  | Done    |
| RLS-P02     | CP-001  | Done    |
| RLS-P03     | CP-001  | Done    |
| RLS-P04     | CP-001  | Done    |
| RLS-P05     | CP-001  | Done    |
| RLS-P06     | CP-001  | Done    |
| PROJ-P01    | CP-003  | Backlog |
| PROJ-P02    | CP-003  | Backlog |
| PROJ-P03    | CP-003  | Backlog |
| DASH-P01    | CP-003  | Backlog |
| DASH-P02    | CP-003  | Backlog |
| DASH-P03    | CP-003  | Backlog |
| DASH-P04    | CP-003  | Backlog |
| ISSUE-P01   | CP-004  | Backlog |
| ISSUE-P02   | CP-004  | Backlog |
| ISSUE-P03   | CP-004  | Backlog |
| ISSUE-P04   | CP-004  | Backlog |
| ISSUE-P05   | CP-004  | Backlog |
| ISSUE-P06   | CP-004  | Backlog |
| FEED-P01    | CP-005  | Backlog |
| FEED-P02    | CP-005  | Backlog |
| FEED-P03    | CP-005  | Backlog |
| FEED-P04    | CP-005  | Backlog |
| FEED-P05    | CP-005  | Backlog |
| APP-P01     | CP-002  | Done    |
| APP-P02     | CP-002  | Done    |
| APP-P03     | CP-002  | Done    |
| APP-P04     | CP-002  | Done    |
| APP-P05     | CP-002  | Done    |
| APP-P06     | CP-002  | Done    |
| UI-P01      | CP-002  | Done    |
| UI-P02      | CP-002  | Done    |
| UI-P03      | CP-002  | Done    |
| UI-P04      | CP-003+ | Backlog |
| UI-P05      | CP-002+ | Done    |

---

## 12. Sprints

| Sprint | Naam                          | Afhankelijkheden       |
| ------ | ----------------------------- | ---------------------- |
| CP-001 | Database Foundation           | Geen                   |
| CP-002 | App Scaffolding & Auth        | CP-001                 |
| CP-003 | Project Overzicht & Dashboard | CP-001, CP-002         |
| CP-004 | Issue Tracker (Read-only)     | CP-001, CP-002, CP-003 |
| CP-005 | Feedback Formulier            | CP-001 t/m CP-004      |
