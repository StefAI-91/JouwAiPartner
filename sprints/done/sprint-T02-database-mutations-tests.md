# Sprint T02 — Database Mutations Tests

**Area:** Database mutations (`packages/database/src/mutations/`)
**Priority:** Kritiek — 15 mutation-modules, 0 tests, aangeroepen vanuit 30+ locaties
**Test type:** Integration tests met echte Supabase (test database)
**Pattern:** `describeWithDb()` + seed helpers + cleanup, test DB-effecten

## Doel

Valideer dat elke mutation correct schrijft, update of verwijdert in de database. Test op daadwerkelijke DB-state na aanroep, niet op mock-responses. Focus op: correcte data opslag, duplicate handling (code 23505), cascade deletes, en timestamp-management.

## Taken

### T02-1: `mutations/meetings.ts` tests

**Bestand:** `packages/database/__tests__/mutations/meetings.test.ts`

Gedragstests:

- [ ] `insertMeeting()` — upsert op fireflies_id; retourneert `{ success, id }`
- [ ] `insertMeeting()` — duplicate fireflies_id update bestaand record
- [ ] `insertMeeting()` — duplicate title+date combinatie geeft error code 23505
- [ ] `insertManualMeeting()` — insert (geen upsert); zet defaults (relevance_score=1.0, embedding_stale=true, verification_status="draft")
- [ ] `updateMeetingTitle()` — update title; error bij duplicate title+date
- [ ] `updateMeetingClassification()` — schrijft meeting_type, party_type, relevance_score
- [ ] `linkMeetingProject()` — upsert op (meeting_id, project_id); tweede aanroep geen error
- [ ] `linkAllMeetingProjects()` — filtert null project_ids; linkt batch correct
- [ ] `unlinkMeetingProject()` — verwijdert specifieke link
- [ ] `deleteMeeting()` — cascading delete naar extractions, meeting_projects, meeting_participants
- [ ] `markMeetingEmbeddingStale()` — zet embedding_stale=true

### T02-2: `mutations/extractions.ts` tests

**Bestand:** `packages/database/__tests__/mutations/extractions.test.ts`

Gedragstests:

- [ ] `insertExtractions()` — batch insert met defaults (embedding_stale=true, verification_status="verified")
- [ ] `insertExtractions()` — lege array retourneert count=0
- [ ] `createExtraction()` — single insert met correcte defaults
- [ ] `correctExtraction()` — zet altijd corrected_at en embedding_stale=true
- [ ] `correctExtraction()` — update alleen meegegeven velden (partial update)
- [ ] `updateExtraction()` — merge updates; markeert embedding_stale=true
- [ ] `updateNeedStatus()` — fetch-then-merge op metadata; werkt alleen voor type="need"
- [ ] `deleteExtractionsByMeetingId()` — verwijdert alle extracties van een meeting
- [ ] `deleteExtraction()` — verwijdert enkele extractie

### T02-3: `mutations/emails.ts` tests

**Bestand:** `packages/database/__tests__/mutations/emails.test.ts`

Gedragstests:

- [ ] `upsertGoogleAccount()` — insert nieuw account; retourneert id
- [ ] `upsertGoogleAccount()` — update bestaand account op email conflict
- [ ] `insertEmails()` — batch upsert; retourneert count + id array
- [ ] `insertEmails()` — lege batch retourneert count=0
- [ ] `insertEmails()` — duplicate gmail_id+account_id worden genegeerd
- [ ] `updateEmailClassification()` — schrijft organization_id, relevance_score, is_processed, email_type, party_type
- [ ] `verifyEmail()` — RPC zet verification_status naar "verified"
- [ ] `rejectEmail()` — RPC zet verification_status naar "rejected" met reason
- [ ] `linkEmailProject()` — upsert met default source="ai"
- [ ] `unlinkEmailProject()` — verwijdert specifieke link
- [ ] `insertEmailExtractions()` — batch insert naar email_extractions

### T02-4: `mutations/tasks.ts` tests

**Bestand:** `packages/database/__tests__/mutations/tasks.test.ts`

Gedragstests:

- [ ] `createTaskFromExtraction()` — insert met status="active"
- [ ] `createTaskFromExtraction()` — met already_done=true zet status="done" en completed_at
- [ ] `updateTask()` — partial update (assigned_to, due_date, title); zet updated_at
- [ ] `completeTask()` — zet status="done", completed_at=now
- [ ] `dismissTask()` — zet status="dismissed"

### T02-5: `mutations/issues.ts` tests

**Bestand:** `packages/database/__tests__/mutations/issues.test.ts`

Gedragstests:

- [ ] `insertIssue()` — roept `next_issue_number()` RPC aan; retourneert issue met nummer
- [ ] `updateIssue()` — partial update + updated_at timestamp
- [ ] `upsertUserbackIssues()` — update bestaand record op userback_id; insert nieuw record
- [ ] `upsertUserbackIssues()` — retourneert `{ imported[], updated, skipped, errors[] }`
- [ ] `deleteIssue()` — cascade delete naar comments + activity
- [ ] `insertComment()` — insert met author_id; selecteert author.full_name
- [ ] `updateComment()` — update body
- [ ] `deleteComment()` — hard delete
- [ ] `insertActivity()` — logt action, field, old_value, new_value

### T02-6: `mutations/organizations.ts` + `projects.ts` + `people.ts` tests

**Bestand:** `packages/database/__tests__/mutations/entities.test.ts`

Gedragstests organizations:

- [ ] `createOrganization()` — insert met defaults (type="client", status="active")
- [ ] `createOrganization()` — duplicate naam geeft error 23505
- [ ] `updateOrganization()` — partial update; duplicate naam error
- [ ] `deleteOrganization()` — hard delete

Gedragstests projects:

- [ ] `createProject()` — insert met defaults (status="active")
- [ ] `createProject()` — duplicate naam geeft error 23505
- [ ] `updateProjectAliases()` — update aliases array
- [ ] `deleteProject()` — hard delete

Gedragstests people:

- [ ] `createPerson()` — insert; zet embedding_stale=true
- [ ] `createPerson()` — duplicate email geeft error 23505
- [ ] `updatePerson()` — partial update; markeert embedding_stale=true
- [ ] `deletePerson()` — hard delete

### T02-7: `mutations/review.ts` tests

**Bestand:** `packages/database/__tests__/mutations/review.test.ts`

Gedragstests:

- [ ] `verifyMeeting()` — RPC: meeting status → "verified"; alle extracties → "verified"
- [ ] `verifyMeetingWithEdits()` — RPC: past edits toe, rejecteert extractie-ids, past type changes toe
- [ ] `rejectMeeting()` — RPC: meeting status → "rejected" met user_id

### T02-8: `mutations/embeddings.ts` tests

**Bestand:** `packages/database/__tests__/mutations/embeddings.test.ts`

Gedragstests:

- [ ] `updateRowEmbedding()` — schrijft vector voor meetings/extractions/projects/people
- [ ] `updateRowEmbedding()` — zet embedding_stale=false na schrijven
- [ ] `batchUpdateEmbeddings()` — RPC met table + ids + embeddings arrays
- [ ] `batchUpdateEmbeddings()` — validatie: ids en embeddings arrays moeten gelijke lengte hebben

## Seed data nodig

Bestaande seed helpers uitbreiden met:

- [ ] `seedEmail()` — voor email mutation tests
- [ ] `seedIssue()` — voor issue mutation tests (met project_id)
- [ ] `seedGoogleAccount()` — voor email account tests

## Afronding

- [ ] Alle tests draaien groen via `npm run test -- --filter=database`
- [ ] Cleanup na elke test via `cleanupTestData()`
- [ ] Geen flaky tests door deterministische TEST_IDS
