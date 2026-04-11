# Sprint T04 — Cockpit Actions Tests (ontbrekend)

**Area:** Cockpit server actions (`apps/cockpit/src/actions/`)
**Priority:** Hoog — 6 action-modules zonder tests, waarvan 3 Critical Integration Points
**Test type:** Integration tests met echte Supabase + gemockte AI/next/cache
**Pattern:** Bestaand patroon volgen: `describeWithDb()`, `mockAuthenticated()`, `createIntegrationServerMock()`, dynamic imports

## Doel

Test de server actions die nog geen tests hebben. Focus op: auth-guard (unauthorized), Zod-validatie (invalid input), happy path (correcte DB-state), en side effects (revalidatePath, AI triggers). Bestaande tests (entities, tasks, review, meetings) dienen als referentie.

## Taken

### T04-1: `actions/email-review.ts` tests

**Bestand:** `apps/cockpit/__tests__/actions/email-review.test.ts`
**Critical Integration Point:** database + ai + auth

Gedragstests:

- [ ] `approveEmailAction()` — zet email verification_status naar "verified"
- [ ] `approveEmailAction()` — triggert `triggerSummariesForEmail()` (non-blocking)
- [ ] `approveEmailAction()` — retourneert `{ error: "Unauthorized" }` zonder login
- [ ] `approveEmailAction()` — retourneert `{ error: "Invalid input" }` bij ongeldige input
- [ ] `approveEmailWithEditsAction()` — past extractie-edits toe via RPC
- [ ] `approveEmailWithEditsAction()` — rejecteert meegegeven extractie-ids
- [ ] `approveEmailWithEditsAction()` — past type changes toe
- [ ] `rejectEmailAction()` — zet email status naar "rejected" met reason
- [ ] `rejectEmailAction()` — retourneert error bij lege reason

### T04-2: `actions/email-links.ts` tests

**Bestand:** `apps/cockpit/__tests__/actions/email-links.test.ts`

Gedragstests:

- [ ] `linkEmailProjectAction()` — linkt project aan email
- [ ] `unlinkEmailProjectAction()` — verwijdert project-link van email
- [ ] `updateEmailOrganizationAction()` — update organization_id op email
- [ ] `updateEmailSenderPersonAction()` — update sender person
- [ ] `updateEmailTypeAction()` — update email_type
- [ ] `updateEmailPartyTypeAction()` — update party_type
- [ ] Alle acties retourneren `{ error: "Unauthorized" }` zonder login

### T04-3: `actions/scan-needs.ts` tests

**Bestand:** `apps/cockpit/__tests__/actions/scan-needs.test.ts`
**Mock extra:** `@repo/ai/pipeline/scan-needs`

Gedragstests:

- [ ] `scanTeamNeedsAction()` — retourneert `{ success, scanned, needs }` bij succes
- [ ] `scanTeamNeedsAction()` — retourneert `{ error: "Unauthorized" }` zonder login
- [ ] `scanTeamNeedsAction()` — logt errors maar retourneert succes als er partial failures zijn
- [ ] `updateNeedStatusAction()` — update need status naar "erkend"/"afgewezen"/"opgelost"
- [ ] `updateNeedStatusAction()` — retourneert error bij ongeldige status enum
- [ ] `updateNeedStatusAction()` — retourneert `{ error: "Unauthorized" }` zonder login

### T04-4: `actions/segments.ts` tests

**Bestand:** `apps/cockpit/__tests__/actions/segments.test.ts`

Gedragstests:

- [ ] `linkSegmentToProjectAction()` — linkt segment aan project; update aliases
- [ ] `removeSegmentTagAction()` — verwijdert tag; voegt naam toe aan ignored entities
- [ ] Beide retourneren error zonder auth

### T04-5: `actions/summaries.ts` tests

**Bestand:** `apps/cockpit/__tests__/actions/summaries.test.ts`
**Mock extra:** `@repo/ai/pipeline/summary-pipeline`

Gedragstests:

- [ ] `regenerateSummaryAction()` — roept `generateProjectSummaries()` of `generateOrgSummaries()` aan
- [ ] `regenerateSummaryAction()` — retourneert error zonder auth
- [ ] `regenerateSummaryAction()` — forwardt AI errors correct

### T04-6: `actions/weekly-summary.ts` tests

**Bestand:** `apps/cockpit/__tests__/actions/weekly-summary.test.ts`
**Mock extra:** `@repo/ai/pipeline/weekly-summary-pipeline`

Gedragstests:

- [ ] `generateWeeklySummaryAction()` — roept pipeline aan en retourneert succes
- [ ] `generateWeeklySummaryAction()` — retourneert error zonder auth

## Seed data nodig

- [ ] `seedEmail()` met draft verification_status + gekoppelde email_extractions
- [ ] `seedGoogleAccount()` voor email tests
- [ ] `seedMeetingProjectSummary()` voor segment tests

## Afronding

- [ ] Alle tests draaien groen via `npm run test -- --filter=cockpit`
- [ ] Pattern consistent met bestaande tests (entities, tasks, review, meetings)
- [ ] AI pipeline calls gemockt (niet uitvoeren in tests)
