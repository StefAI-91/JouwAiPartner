# Micro Sprint CP-005: Feedback Formulier

## Doel

Een feedbackformulier bouwen waarmee klanten bugs, wensen of vragen kunnen indienen. De feedback wordt direct aangemaakt als DevHub issue met source 'portal'. Na deze sprint is de feedbackloop compleet: klant dient feedback in via portal → verschijnt als issue in DevHub → team pakt het op → klant ziet statuswijziging in portal.

## Requirements

| ID       | Beschrijving                                                                   |
| -------- | ------------------------------------------------------------------------------ |
| FEED-P01 | Formulier: titel, beschrijving, type (bug/wens/vraag)                          |
| FEED-P02 | Selecteer project (als klant meerdere heeft) of automatisch bij project-detail |
| FEED-P03 | Submission maakt DevHub issue aan via insertIssue() met source: 'portal'       |
| FEED-P04 | Bevestiging na indienen + issue verschijnt in issue tracker                    |
| FEED-P05 | Zod validatie op alle input                                                    |

## Afhankelijkheden

- CP-001 (database): portal_project_access
- CP-002 (app scaffolding): werkende portal app met auth
- CP-003 (project): project layout
- CP-004 (issues): issue tracker om ingediende feedback te zien

## Taken

### 1. Zod validatie schema

- `packages/database/src/validations/portal-feedback.ts`:
  - `portalFeedbackSchema` — titel (min 5 chars), beschrijving (min 10 chars), type (bug/feature/question), project_id (UUID)
  - Validatie van type tegen toegestane waarden

### 2. Server Action

- `apps/portal/src/actions/feedback.ts`:
  - `submitFeedback(formData)` Server Action:
    1. Valideer input met `portalFeedbackSchema`
    2. Controleer dat user client role heeft
    3. Controleer dat user portal access heeft tot het project
    4. Roep `insertIssue()` aan met:
       - `project_id` uit formulier
       - `title`, `description`, `type` uit formulier
       - `source: 'portal'`
       - `source_metadata: { submitted_by: user.email, submitted_at: timestamp }`
       - `status: 'triage'` (default)
    5. `revalidatePath` voor issues lijst
    6. Return `{ success: true, issueNumber }` of `{ error }`

### 3. Feedback formulier component

- `src/components/feedback/feedback-form.tsx` ('use client'):
  - Titel input (text)
  - Beschrijving textarea
  - Type selector (Bug, Wens, Vraag) — radio buttons of select
  - Project selector (alleen als klant meerdere projecten heeft, anders hidden)
  - Submit knop met loading state
  - Zod field errors inline weergeven
  - Success state: bevestigingsmelding met issue nummer + link naar issue tracker
  - Toast voor server errors

### 4. Feedback pagina (project-scoped)

- `src/app/(app)/projects/[id]/feedback/page.tsx`:
  - Render `FeedbackForm` met project_id vooraf ingevuld
  - Project naam tonen als context
- `src/app/(app)/projects/[id]/feedback/loading.tsx`

### 5. Mutation uitbreiden

- Controleer of `insertIssue()` in `packages/database/src/mutations/issues.ts` de `source` en `source_metadata` parameters ondersteunt
- Pas aan indien nodig (source 'portal' toevoegen aan toegestane waarden als er een constraint is)

### 6. Feedback type mapping

- Map portal feedback types naar DevHub issue types:
  - bug → bug
  - feature → feature_request (of wat DevHub gebruikt)
  - question → question (nieuw type, of map naar feature_request)
- Check of de issues tabel type constraint deze waarden accepteert, pas aan indien nodig

## Bronverwijzingen

- PRD: `docs/specs/portal-mvp.md` sectie 3 (FEED) en sectie 8 (Feedbackloop)
- insertIssue() mutation: `packages/database/src/mutations/issues.ts`
- Zod validatie patronen: `packages/ai/src/validations/` als referentie
- DevHub issue types/statussen: check migraties voor constraints

## Verificatie

- [ ] Formulier toont titel, beschrijving, type velden
- [ ] Zod validatie werkt: lege velden, te korte titel/beschrijving tonen errors
- [ ] Succesvolle submit maakt issue aan in DevHub met source 'portal'
- [ ] Issue verschijnt in de portal issue tracker na indienen
- [ ] Issue verschijnt in DevHub voor het team
- [ ] Bevestigingsmelding toont issue nummer
- [ ] Project access wordt server-side gecontroleerd
- [ ] Server errors worden als toast getoond
- [ ] Loading state op submit knop werkt
