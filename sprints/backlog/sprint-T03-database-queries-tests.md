# Sprint T03 — Database Queries Tests

**Area:** Database queries (`packages/database/src/queries/`)
**Priority:** Hoog — 18 query-modules, 0 tests, voeden alle UI + pipelines
**Test type:** Integration tests met echte Supabase (test database)
**Pattern:** `describeWithDb()` + seed helpers + cleanup, test return shapes en filter-logica

## Doel

Valideer dat queries de juiste data retourneren met correcte filters, joins, ordering en edge cases. Focus op: filter-correctheid (status, type, datum-ranges), join-shapes, null-handling, en lege resultaten. Geen false positives: seed specifieke data, assert op verwachte resultaten.

## Taken

### T03-1: `queries/meetings.ts` tests

**Bestand:** `packages/database/__tests__/queries/meetings.test.ts`

Gedragstests:

- [ ] `getVerifiedMeetingById()` — retourneert MeetingDetail voor verified meeting
- [ ] `getVerifiedMeetingById()` — retourneert null voor draft/rejected meeting
- [ ] `getVerifiedMeetingById()` — retourneert null voor niet-bestaand id
- [ ] `listVerifiedMeetings()` — filtert alleen op verified status; ordering date DESC
- [ ] `listVerifiedMeetings()` — respecteert limit en offset; retourneert total count
- [ ] `getExistingFirefliesIds()` — retourneert Set van bestaande ids uit input
- [ ] `getExistingFirefliesIds()` — lege input retourneert lege Set
- [ ] `getExistingMeetingsByTitleDates()` — case-insensitive title matching met dag-niveau datum
- [ ] `getMeetingByTitleAndDate()` — matcht op ilike title + datum range (T00:00:00 tot T23:59:59)
- [ ] `getMeetingByTitleAndDate()` — retourneert null als geen match

### T03-2: `queries/tasks.ts` tests

**Bestand:** `packages/database/__tests__/queries/tasks.test.ts`

Gedragstests:

- [ ] `listActiveTasks()` — filtert op status="active"; ordering due_date ASC nulls last
- [ ] `listActiveTasks()` — taken zonder due_date komen na taken met due_date
- [ ] `hasTaskForExtraction()` — retourneert true als niet-dismissed task bestaat
- [ ] `hasTaskForExtraction()` — retourneert false als alleen dismissed task bestaat
- [ ] `hasTaskForExtraction()` — retourneert false als geen task bestaat
- [ ] `getPromotedExtractionIds()` — retourneert Set van extraction_ids met niet-dismissed tasks
- [ ] `listAllTasks()` — toont active + done (niet dismissed); active eerst

### T03-3: `queries/dashboard.ts` tests

**Bestand:** `packages/database/__tests__/queries/dashboard.test.ts`

Gedragstests:

- [ ] `getReviewQueueCount()` — telt meetings met status="draft"; retourneert 0 bij error
- [ ] `listRecentVerifiedMeetings()` — filtert verified + ai_briefing not null
- [ ] `listTodaysBriefingMeetings()` — 3-daags venster; labelt "Vandaag"/"Gisteren"/datum
- [ ] `getExtractionCountsByMeetingIds()` — telt alleen type="action_item"
- [ ] `getAiPulseData()` — parallelle queries; retourneert totalen (7-daags venster)

### T03-4: `queries/review.ts` tests

**Bestand:** `packages/database/__tests__/queries/review.test.ts`

Gedragstests:

- [ ] `listDraftMeetings()` — alleen draft meetings; ordering date DESC
- [ ] `listDraftMeetings()` — bevat participants en extractions in joins
- [ ] `getDraftMeetingById()` — retourneert null voor verified meeting
- [ ] `getReviewStats()` — telt verifiedToday (verified_at >= vandaag) + totalVerified

### T03-5: `queries/emails.ts` tests

**Bestand:** `packages/database/__tests__/queries/emails.test.ts`

Gedragstests:

- [ ] `listActiveGoogleAccountsSafe()` — filtert is_active=true; retourneert GEEN tokens
- [ ] `listEmails()` — optional filters (googleAccountId, verificationStatus, isProcessed)
- [ ] `listEmails()` — ordering date DESC; respecteert limit/offset
- [ ] `getEmailById()` — full detail met sender, projects, extractions
- [ ] `getExistingGmailIds()` — retourneert Set; lege input retourneert lege Set
- [ ] `listDraftEmails()` — filtert draft + is_processed=true
- [ ] `getUnprocessedEmails()` — filtert is_processed=false

### T03-6: `queries/issues.ts` tests

**Bestand:** `packages/database/__tests__/queries/issues.test.ts`

Gedragstests:

- [ ] `listIssues()` — filtert op projectId; optional status/priority/type/component filters
- [ ] `listIssues()` — search: sanitized ilike op title|description
- [ ] `listIssues()` — ordering: priority weight, dan created_at DESC
- [ ] `getIssueById()` — retourneert issue met assigned_person relatie
- [ ] `getIssueCounts()` — retourneert count per status (triage, backlog, todo, etc.)
- [ ] `listIssueComments()` — ordering created_at ASC (chronologisch)
- [ ] `listIssueActivity()` — ordering created_at DESC; bevat actor relatie
- [ ] `getIssueThumbnails()` — retourneert Map van issueId→storagePath; eerste screenshot per issue

### T03-7: `queries/people.ts` tests

**Bestand:** `packages/database/__tests__/queries/people.test.ts`

Gedragstests:

- [ ] `listPeople()` — ordering name ASC; respecteert limit
- [ ] `listPeopleWithOrg()` — bevat organization join
- [ ] `findPersonIdsByName()` — case-insensitive ilike search
- [ ] `findPeopleByNames()` — retourneert Map met lowercase keys
- [ ] `findPeopleByEmails()` — retourneert Map; in-filter op email
- [ ] `getPersonById()` — bevat organization + meeting_count
- [ ] `getAllKnownPeople()` — ongetfilterd; bevat org name+type

### T03-8: `queries/organizations.ts` + `queries/projects.ts` tests

**Bestand:** `packages/database/__tests__/queries/org-projects.test.ts`

Gedragstests:

- [ ] `listOrganizations()` — basis listing
- [ ] `getOrganizationById()` — retourneert detail of null
- [ ] `listProjects()` — basis listing
- [ ] `getProjectById()` — retourneert detail of null
- [ ] `getActiveProjectsForContext()` — retourneert projecten met aliases en org_name

## Seed data nodig

Uitbreiden van bestaande seed helpers:

- [ ] `seedEmail()` + `seedGoogleAccount()` (hergebruik van T02)
- [ ] `seedIssue()` + `seedIssueComment()` + `seedIssueActivity()`
- [ ] Seed helpers voor meetings met verified/draft/rejected statussen
- [ ] Seed helpers voor meerdere taken met verschillende due_dates

## Afronding

- [ ] Alle tests draaien groen via `npm run test -- --filter=database`
- [ ] Elke query-test seeded eigen data en ruimt op
- [ ] Tests valideren return shapes (niet alleen dat data terugkomt, maar de juiste structuur)
