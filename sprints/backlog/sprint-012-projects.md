# Sprint 012: Projects Overview + Detail (v2-005)

## Doel

Het team kan alle projecten zien in een overzicht en doordrilen naar details. De overview toont project cards met een visuele status pipeline indicator. De detail pagina toont gelinkte meetings, action items, decisions en needs/insights in secties of tabs. Volgt dezelfde design taal als de review queue (zelfde fonts, kleuren, card stijl).

## Requirements

| ID       | Beschrijving                                                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| FUNC-021 | Projects overview pagina (/projects) — project cards met status pipeline                                                                 |
| FUNC-022 | Project detail pagina (/projects/[id]) — header met status pipeline, secties: meetings, action items, decisions, needs/insights          |
| FUNC-023 | Project query functies in packages/database                                                                                              |
| UI-022   | Projects overview: cards met project name, client, status als visual pipeline indicator, last meeting, open action count                 |
| UI-023   | Project detail: header met status pipeline, tabbed sections                                                                              |
| RULE-011 | Project status waarden: lead, discovery, proposal, negotiation, won, kickoff, in_progress, review, completed, on_hold, lost, maintenance |
| EDGE-002 | Empty states met appropriate messaging voor projects (geen mascot, clean empty state)                                                    |

## Bronverwijzingen

- PRD: `docs/specs/v2-review-dashboard.md` -> sectie "9. Sprints — v2-005" (regels 539-557)
- PRD: `docs/specs/v2-review-dashboard.md` -> sectie "7. Dashboard Pages — Projects" (regels 394-397)
- PRD: `docs/specs/v2-review-dashboard.md` -> sectie "5.6 Design Per Sprint — v2-005" (regels 304-306)
- Platform spec: `docs/specs/platform-spec.md` -> sectie "4.1 — projects tabel" (regels 175-191) — status waarden en schema

## Context

### Relevante business rules

- **RULE-011**: "Project status waarden dekken de hele lifecycle. Sales: 'lead' | 'discovery' | 'proposal' | 'negotiation' | 'won'. Delivery: 'kickoff' | 'in_progress' | 'review' | 'completed'. Other: 'on_hold' | 'lost' | 'maintenance'."

### Datamodel

**Projects tabel (bestaand):**

```sql
projects
  id UUID PK DEFAULT gen_random_uuid()
  name TEXT NOT NULL UNIQUE
  aliases TEXT[] DEFAULT '{}'
  organization_id UUID FK -> organizations
  status TEXT DEFAULT 'lead'
    -- Sales: 'lead' | 'discovery' | 'proposal' | 'negotiation' | 'won'
    -- Delivery: 'kickoff' | 'in_progress' | 'review' | 'completed'
    -- Other: 'on_hold' | 'lost' | 'maintenance'
  embedding VECTOR(1024)
  embedding_stale BOOLEAN DEFAULT TRUE
  created_at TIMESTAMPTZ DEFAULT now()
  updated_at TIMESTAMPTZ DEFAULT now()
```

**Relaties:**

- `projects.organization_id` -> `organizations` (voor client naam)
- `meeting_projects` (many-to-many) -> `meetings` (gelinkte meetings)
- `extractions.project_id` -> `projects` (extracties per project)

**Benodigde queries:**

1. List all projects met: name, organization name (JOIN), status, last meeting date (via meeting_projects JOIN meetings), open action item count (via extractions WHERE type='action_item' AND metadata->>'status' != 'done')
2. Get project detail met: project info + organization + meetings + extractions gegroepeerd per type

### UI/UX beschrijving

**Projects overview (/projects):**

- Project cards met:
  - Project naam (Fredoka, xl)
  - Client naam (organization, secondary text)
  - Status als visuele pipeline indicator: stappen lead -> discovery -> ... -> maintenance, huidige stap is highlighted
  - Last meeting datum
  - Open action item count
- Cards volgen dezelfde stijl als review cards (white bg, 2rem radius, subtle shadow)

**Project detail (/projects/[id]):**

- Header: project naam, client, status pipeline (visueel, zelfde indicator als overview maar groter)
- Secties (tabs of gestapeld):
  - **Meetings**: lijst van gelinkte meetings (hergebruik meeting cards/list items van eerdere sprints)
  - **Action Items**: open en done, met assignee en due date
  - **Decisions**: lijst van decisions extracties
  - **Needs & Insights**: gecombineerde lijst

**Status pipeline indicator:**
De status wordt getoond als visuele stappen. De huidige stap is gehighlighted in brand green. Eerdere stappen zijn completed (muted). Latere stappen zijn upcoming (grayed out). Dit maakt de project fase in één oogopslag duidelijk.

### Edge cases en foutafhandeling

- **EDGE-002**: Lege project lijst -> clean empty state: "No projects yet" zonder mascot (mascot is alleen voor review queue)
- Project zonder meetings: toon "No meetings linked to this project" in meetings sectie
- Project zonder extracties: toon "No extractions yet" per lege sectie
- loading.tsx en error.tsx voor /projects en /projects/[id]

## Prerequisites

- [ ] Sprint 011: Meeting Detail moet afgerond zijn (meeting componenten worden hergebruikt)

## Taken

- [ ] Project query functies schrijven: listProjects (met JOINs voor org, last meeting, action count) en getProjectById (met meetings, extractions)
- [ ] Projects overview pagina (/projects/page.tsx): cards met pipeline indicator, client naam, metrics
- [ ] Status pipeline indicator component: visuele stappen met highlight op huidige status
- [ ] Project detail pagina (/projects/[id]/page.tsx): header + secties (meetings, action items, decisions, needs/insights)
- [ ] loading.tsx + error.tsx + empty states voor beide pagina's

## Acceptatiecriteria

- [ ] [FUNC-021] /projects toont alle projecten met visuele status pipeline
- [ ] [FUNC-022] Klik op project toont gelinkte meetings en extracties per type
- [ ] [FUNC-023] Query functies bestaan in packages/database, selecteren alleen benodigde kolommen
- [ ] [UI-022] Project cards tonen naam, client, pipeline indicator, last meeting, open action count
- [ ] [UI-023] Project detail heeft header met pipeline en secties per extraction type
- [ ] [RULE-011] Pipeline indicator toont alle status waarden in juiste volgorde
- [ ] [EDGE-002] Lege projectenlijst toont clean empty state (geen mascot)
- [ ] Open action items tonen assignee en due date

## Geraakt door deze sprint

- `packages/database/src/queries/projects.ts` (nieuw of gewijzigd)
- `apps/cockpit/src/app/(dashboard)/projects/page.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/projects/loading.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/projects/error.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/projects/[id]/loading.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/projects/[id]/error.tsx` (nieuw)
- `apps/cockpit/src/components/projects/project-card.tsx` (nieuw)
- `apps/cockpit/src/components/projects/status-pipeline.tsx` (nieuw)
- `apps/cockpit/src/components/projects/project-sections.tsx` (nieuw)
