# Micro Sprint CP-003: Project Overzicht & Dashboard

## Doel

De eerste echte klantpagina's bouwen: een overzicht van alle projecten waar de klant toegang toe heeft, en een project dashboard met status, AI-samenvatting en recente activiteit. Na deze sprint kan een klant inloggen, zijn/haar projecten zien, en doorklikken naar een project voor details.

## Requirements

| ID       | Beschrijving                                                               |
| -------- | -------------------------------------------------------------------------- |
| PROJ-P01 | Overzichtspagina met alle projecten waar de klant toegang toe heeft        |
| PROJ-P02 | Per project: naam, status, organisatie, laatste activiteit                 |
| PROJ-P03 | Klikbaar naar project detail                                               |
| DASH-P01 | Project status weergave (huidige fase)                                     |
| DASH-P02 | AI-gegenereerde samenvatting (uit summaries tabel, type: context/briefing) |
| DASH-P03 | Recente activiteit: laatste issues, statuswijzigingen                      |
| DASH-P04 | Aantal open/in behandeling/afgeronde issues als metrics                    |

## Afhankelijkheden

- CP-001 (database foundation): portal_project_access en RLS policies
- CP-002 (app scaffolding): werkende portal app met auth

## Taken

### 1. Query functies voor portal

- `packages/database/src/queries/portal.ts`:
  - `listPortalProjectsWithDetails(profileId, supabase)` — projecten met org naam, status, laatste issue datum
  - `getPortalProjectDashboard(projectId, supabase)` — project details + samenvatting + issue counts
  - `listRecentProjectIssues(projectId, limit, supabase)` — laatste N issues voor recente activiteit
  - `getProjectIssueCounts(projectId, supabase)` — counts per vertaalde status groep

### 2. Issue status mapping

- `apps/portal/src/lib/issue-status.ts`:
  - `STATUS_MAP` object (triage→Ontvangen, backlog/todo→Ingepland, in_progress→In behandeling, done/cancelled→Afgerond)
  - `translateStatus(internalStatus)` helper functie
  - `STATUS_COLORS` voor visuele weergave (kleur per vertaalde status)

### 3. Project overzicht pagina

- `src/app/(app)/page.tsx` — vervang placeholder:
  - Haal projecten op via `listPortalProjectsWithDetails()`
  - Als 1 project: redirect naar `/projects/[id]`
  - Als meerdere: toon project cards in grid
- `src/components/projects/project-card.tsx`:
  - Project naam, organisatie, status badge
  - Laatste activiteit datum
  - Link naar project detail
- `src/app/(app)/loading.tsx` — skeleton loader

### 4. Project dashboard pagina

- `src/app/(app)/projects/[id]/page.tsx`:
  - Haal project dashboard data op
  - Controleer portal access (redirect naar / als geen toegang)
- `src/components/projects/project-header.tsx`:
  - Project naam, organisatie, status
- `src/components/projects/project-summary.tsx`:
  - AI-gegenereerde samenvatting uit summaries tabel
  - Fallback als geen samenvatting beschikbaar
- `src/components/projects/issue-metrics.tsx`:
  - Cards met aantallen: Ontvangen, Ingepland, In behandeling, Afgerond
- `src/components/projects/recent-activity.tsx`:
  - Lijst van laatste 5-10 issues met vertaalde status
  - Link naar issue tracker

### 5. Project layout

- `src/app/(app)/projects/[id]/layout.tsx`:
  - Subnav: Dashboard | Issues | Feedback
  - Project access check (server-side)
- `src/app/(app)/projects/[id]/loading.tsx`
- `src/app/(app)/projects/[id]/error.tsx`

### 6. Sidebar update

- Update sidebar om actief project te highlighten
- Projecten lijst in sidebar voor snelle navigatie

## Bronverwijzingen

- PRD: `docs/specs/portal-mvp.md` sectie 3 (PROJ, DASH) en sectie 6 (Status Mapping)
- Summaries query referentie: `packages/database/src/queries/` (zoek naar summaries)
- Dashboard referentie: `apps/cockpit/src/app/(app)/(dashboard)/` voor layout inspiratie
- Issue status mapping: PRD sectie 6

## Verificatie

- [ ] Klant met 1 project wordt direct naar project dashboard gestuurd
- [ ] Klant met meerdere projecten ziet overzicht met project cards
- [ ] Project dashboard toont status, AI-samenvatting, metrics en recente activiteit
- [ ] Vertaalde statussen worden correct weergegeven
- [ ] Project waar klant geen access toe heeft geeft redirect
- [ ] Loading en error states werken
- [ ] Lege states (geen samenvatting, geen issues) tonen zinvolle fallback
