# Micro Sprint CP-004: Issue Tracker (Read-only)

## Doel

Een read-only issue tracker bouwen waar klanten de status van alle issues voor hun project kunnen volgen. Issues worden getoond met vertaalde statussen en klanten kunnen filteren op status. Na deze sprint kan een klant alle meldingen en issues van zijn/haar project bekijken met duidelijke statusweergave.

## Requirements

| ID        | Beschrijving                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| ISSUE-P01 | Lijst van issues voor het project, gesorteerd op datum                                                       |
| ISSUE-P02 | Vertaalde statussen voor klantweergave                                                                       |
| ISSUE-P03 | Statusmapping: triage→Ontvangen, backlog/todo→Ingepland, in_progress→In behandeling, done/cancelled→Afgerond |
| ISSUE-P04 | Filteren op status (vertaalde waarden)                                                                       |
| ISSUE-P05 | Issue detail: titel, beschrijving, status, type, aanmaakdatum                                                |
| ISSUE-P06 | Geen interne opmerkingen/comments zichtbaar voor klant                                                       |

## Afhankelijkheden

- CP-001 (database): RLS op issues tabel voor client users
- CP-002 (app scaffolding): werkende portal app
- CP-003 (project): project layout met subnav

## Taken

### 1. Query functies voor issues

- `packages/database/src/queries/portal.ts` (uitbreiden):
  - `listPortalIssues(projectId, supabase, filters?)` — issues voor project, gesorteerd op created_at DESC
    - Selecteer alleen klant-relevante kolommen: id, issue_number, title, description, status, type, priority, created_at, closed_at
    - Geen comments, geen interne metadata
    - Optionele filter op status (mapped naar interne waarden)
  - `getPortalIssue(issueId, projectId, supabase)` — enkel issue detail (zonder comments)

### 2. Issue lijst pagina

- `src/app/(app)/projects/[id]/issues/page.tsx`:
  - Haal issues op via `listPortalIssues()`
  - Status filter via URL search params
- `src/components/issues/issue-list.tsx`:
  - Tabel of card-lijst met: issue nummer, titel, vertaalde status, type, datum
  - Status badge met kleur (uit STATUS_COLORS)
  - Klikbaar naar issue detail
- `src/components/issues/issue-status-filter.tsx`:
  - Filter knoppen: Alle | Ontvangen | Ingepland | In behandeling | Afgerond
  - Actieve filter highlighted
- `src/components/issues/issue-type-badge.tsx`:
  - Badge voor type (bug/feature/question) met icoon
- `src/app/(app)/projects/[id]/issues/loading.tsx`
- Lege state: "Nog geen meldingen voor dit project"

### 3. Issue detail pagina

- `src/app/(app)/projects/[id]/issues/[issueId]/page.tsx`:
  - Haal issue op via `getPortalIssue()`
  - Controleer dat issue bij het project hoort
- `src/components/issues/issue-detail.tsx`:
  - Titel, beschrijving (markdown rendering), vertaalde status, type
  - Aanmaakdatum, eventueel afgerond-datum
  - Terug-link naar issue lijst
- `src/app/(app)/projects/[id]/issues/[issueId]/loading.tsx`
- 404 handling als issue niet bestaat of niet bij project hoort

### 4. Issue type mapping

- `apps/portal/src/lib/issue-type.ts`:
  - `TYPE_MAP` — vertaling van interne types naar klant-vriendelijke labels
  - `TYPE_ICONS` — Lucide iconen per type (Bug, Lightbulb, HelpCircle)

## Bronverwijzingen

- PRD: `docs/archive/portal-mvp.md` sectie 3 (ISSUE) en sectie 6 (Status Mapping)
- Issues tabel: `supabase/migrations/20260409100005_devhub_quality_fixes.sql` (status constraint)
- DevHub issue lijst als referentie: `apps/devhub/src/components/` (voor layout inspiratie, maar portal is simpeler)

## Verificatie

- [ ] Issue lijst toont alle issues voor het project met vertaalde statussen
- [ ] Status filter werkt correct (Alle/Ontvangen/Ingepland/In behandeling/Afgerond)
- [ ] Issue detail toont titel, beschrijving, status, type, datum
- [ ] Geen interne comments of metadata zichtbaar
- [ ] Issues van andere projecten zijn niet zichtbaar
- [ ] Lege state toont zinvolle melding
- [ ] Loading states werken
