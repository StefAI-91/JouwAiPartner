# Sprint 013: Dashboard + Clients + People (v2-006)

## Doel

De landing page wordt een actie-georiënteerd dashboard en de resterende entiteitpagina's (clients, people) worden gebouwd. Na deze sprint werken alle 6 nav items in de bottom bar. Het dashboard is het eerste wat het team ziet: hoeveel meetings wachten op review, welke projecten lopen, wat is de recente activiteit. Clients en People zijn eenvoudige lijst-pagina's.

## Requirements

| ID       | Beschrijving                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------ |
| FUNC-024 | Dashboard home (/) — review attention zone, project cards, recent meetings, open action items          |
| FUNC-025 | Clients pagina (/clients) — organization list met type badge, status, project count, last contact      |
| FUNC-026 | Client detail pagina (/clients/[id]) — overview met linked projects en meetings                        |
| FUNC-027 | People pagina (/people) — team members en contacts                                                     |
| UI-024   | Dashboard top: attention zone met review count, kleur indiceert urgency (green=0, amber=few, red=many) |
| UI-025   | Dashboard middle: project cards met name, client, status, open actions, last meeting                   |
| UI-026   | Dashboard bottom: twee kolommen — recent verified meetings (links), open action items (rechts)         |

## Bronverwijzingen

- PRD: `docs/specs/v2-review-dashboard.md` -> sectie "9. Sprints — v2-006" (regels 560-580)
- PRD: `docs/specs/v2-review-dashboard.md` -> sectie "7. Dashboard Pages" (regels 399-407)
- PRD: `docs/specs/v2-review-dashboard.md` -> sectie "5.6 Design Per Sprint — v2-006" (regels 307-310)

## Context

### Relevante business rules

Er zijn geen nieuwe business rules. De dashboard composeert bestaande data en componenten. De urgency kleur voor de review count is:

- **Green**: 0 meetings in queue (alles is reviewed)
- **Amber**: een paar meetings wachten
- **Red**: veel meetings wachten

De exacte drempels zijn niet gespecificeerd — kies redelijke defaults (bijv. 0=green, 1-5=amber, 6+=red).

### Datamodel

**Dashboard queries (samenstelling van bestaande tabellen):**

- Review count: `SELECT count(*) FROM meetings WHERE verification_status = 'draft'`
- Project cards: hergebruik listProjects query uit sprint 012
- Recent verified meetings: `SELECT ... FROM meetings WHERE verification_status = 'verified' ORDER BY verified_at DESC LIMIT 5`
- Open action items: `SELECT ... FROM extractions WHERE type = 'action_item' AND (metadata->>'status' IS NULL OR metadata->>'status' != 'done') ORDER BY created_at DESC`

**Clients/organizations tabel (bestaand):**

```sql
organizations
  id UUID PK
  name TEXT NOT NULL UNIQUE
  aliases TEXT[]
  type TEXT NOT NULL          -- 'client' | 'partner' | 'supplier' | 'other'
  contact_person TEXT
  email TEXT
  status TEXT DEFAULT 'prospect'  -- 'prospect' | 'active' | 'inactive'
  created_at, updated_at
```

Relaties voor client detail:

- `organizations` -> `projects` (via organization_id)
- `organizations` -> `meetings` (via organization_id)

**People tabel (bestaand):**

```sql
people
  id UUID PK
  name TEXT NOT NULL
  email TEXT UNIQUE
  team TEXT
  role TEXT
  created_at, updated_at
```

### UI/UX beschrijving

**Dashboard home (/):**

- **Top — Attention zone**: Grote review count badge. Klik linkt naar /review. Kleur geeft urgency aan:
  - 0 wachtend: green background, "All caught up"
  - 1-5 wachtend: amber background, "[X] meetings awaiting review"
  - 6+ wachtend: red background, "[X] meetings awaiting review"
- **Middle — Project cards**: Hergebruik project cards uit sprint 012 (naam, client, status, open actions, last meeting)
- **Bottom — Twee kolommen**:
  - Links: recent verified meetings (laatste 5, met titel, org, datum)
  - Rechts: open action items across all projects (met assignee, due date, project)

**Clients pagina (/clients):**

- Lijst van organizations
- Per rij: naam, type badge (client/partner/supplier/other met kleuren), status (prospect/active/inactive), project count, last contact datum
- Volgt dezelfde card/table patterns als de rest van het cockpit

**Client detail (/clients/[id]):**

- Organization header: naam, type, status, contact person, email
- Secties: gelinkte projecten (hergebruik project cards), gelinkte meetings (lijst)

**People pagina (/people):**

- Lijst van team members en contacts
- Per rij: naam, role, team, email
- Eenvoudige tabel of card lijst

### Edge cases en foutafhandeling

- Dashboard with 0 projects: show "No projects yet" (clean empty state)
- Dashboard with 0 meetings: show "No verified meetings yet" in left column
- Clients list empty: "No organizations yet"
- People list empty: "No people yet"
- All UI text in English (content stays in original language)
- loading.tsx en error.tsx voor alle nieuwe pagina's

## Prerequisites

- [ ] Sprint 012: Projects Overview + Detail moet afgerond zijn (project en meeting componenten bestaan)

## Taken

- [ ] Dashboard queries schrijven: review count, recent verified meetings, open action items across projects
- [ ] Dashboard home pagina bouwen (/page.tsx): attention zone, project cards, two-column bottom section
- [ ] Clients pagina + detail bouwen: organization list met type badges, detail met linked projects/meetings
- [ ] People pagina bouwen: team en contacts lijst
- [ ] loading.tsx + error.tsx + empty states voor alle nieuwe pagina's

## Acceptatiecriteria

- [ ] [FUNC-024] Dashboard toont accurate review count met correcte urgency kleur
- [ ] [UI-025] Project cards tonen status, last meeting, open actions
- [ ] [UI-026] Bottom section toont recent meetings (links) en open actions (rechts)
- [ ] [FUNC-025] Clients lijst toont alle organizations met type badge, status, project count
- [ ] [FUNC-026] Client detail toont organization info met gelinkte projecten en meetings
- [ ] [FUNC-027] People pagina toont team members en contacts met naam, role, team, email
- [ ] Alle 6 nav items in bottom bar werken en highlighten correct

## Geraakt door deze sprint

- `apps/cockpit/src/app/(dashboard)/page.tsx` (gewijzigd — dashboard home)
- `apps/cockpit/src/components/dashboard/attention-zone.tsx` (nieuw)
- `apps/cockpit/src/components/dashboard/recent-meetings.tsx` (nieuw)
- `apps/cockpit/src/components/dashboard/open-actions.tsx` (nieuw)
- `packages/database/src/queries/dashboard.ts` (nieuw)
- `apps/cockpit/src/app/(dashboard)/clients/page.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/clients/[id]/page.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/clients/loading.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/clients/error.tsx` (nieuw)
- `packages/database/src/queries/organizations.ts` (nieuw of gewijzigd)
- `apps/cockpit/src/app/(dashboard)/people/page.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/people/loading.tsx` (nieuw)
- `packages/database/src/queries/people.ts` (nieuw of gewijzigd)
