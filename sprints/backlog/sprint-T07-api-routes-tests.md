# Sprint T07 — API Routes Tests

**Area:** Cockpit + DevHub API routes (`apps/*/src/app/api/`)
**Priority:** Medium — entry points voor externe triggers (webhooks, crons, ingest)
**Test type:** Unit tests met gemockte dependencies; integration tests voor kritieke routes
**Pattern:** `vi.mock()` voor alle packages, test request→response contract

## Doel

Test de API routes die data het systeem in brengen (webhooks, cron jobs, ingest endpoints). Focus op: request validatie, correcte pipeline-aanroepen, error responses, en duplicate detectie. Dit zijn de "voordeur" van het systeem — fouten hier betekenen geen data binnenkomt.

## Taken

### T07-1: `api/webhooks/fireflies/route.ts` tests

**Bestand:** `apps/cockpit/__tests__/api/webhooks-fireflies.test.ts`
**Mock:** `@repo/ai/fireflies`, `@repo/ai/transcript-processor`, `@repo/database/queries/meetings`, `@repo/ai/validations/fireflies`, `@repo/ai/pipeline/gatekeeper-pipeline`

Gedragstests:

- [ ] POST met geldig webhook payload — haalt transcript op en triggert `processMeeting()`
- [ ] Skipt meetings die al bestaan (`getMeetingByFirefliesId()` retourneert match)
- [ ] Skipt meetings met duplicate title+date (`getMeetingByTitleAndDate()` retourneert match)
- [ ] Skipt meetings met ongeldige duur (`isValidDuration()` retourneert false)
- [ ] Retourneert 200 OK ook bij skip (webhook moet niet retrien)
- [ ] Retourneert 500 bij onverwachte error

### T07-2: `api/ingest/fireflies/route.ts` tests

**Bestand:** `apps/cockpit/__tests__/api/ingest-fireflies.test.ts`
**Mock:** `@repo/ai/fireflies`, `@repo/ai/transcript-processor`, `@repo/database/queries/meetings`, `@repo/ai/validations/fireflies`, `@repo/ai/pipeline/gatekeeper-pipeline`, `@repo/ai/pipeline/re-embed-worker`

Gedragstests:

- [ ] GET — retourneert lijst van Fireflies transcripts
- [ ] POST — batch verwerking: filtert bestaande fireflies_ids en title+date duplicates
- [ ] POST — verwerkt nieuwe meetings via `processMeeting()` per stuk
- [ ] POST — draait `runReEmbedWorker()` na verwerking
- [ ] POST — retourneert teller: processed, skipped, errors

### T07-3: `api/ingest/reprocess/route.ts` tests

**Bestand:** `apps/cockpit/__tests__/api/ingest-reprocess.test.ts`
**Mock:** Alle AI pipeline modules + database mutations

Gedragstests:

- [ ] POST — verwijdert bestaande extracties (`deleteExtractionsByMeetingId`)
- [ ] POST — voert volledige pipeline opnieuw uit (transcribe → summarize → extract → embed)
- [ ] POST — bouwt segments en linkt aan projecten
- [ ] POST — retourneert error bij niet-bestaand meeting

### T07-4: `api/email/sync/route.ts` tests

**Bestand:** `apps/cockpit/__tests__/api/email-sync.test.ts`
**Mock:** `@repo/database/supabase/server`, `@repo/database/queries/emails`, `@repo/database/mutations/emails`, `@repo/ai/gmail`, `@repo/ai/pipeline/email-pipeline`

Gedragstests:

- [ ] POST — haalt actieve Google accounts op
- [ ] POST — fetcht emails per account; filtert bestaande gmail_ids
- [ ] POST — insert nieuwe emails
- [ ] POST — verwerkt onverwerkte emails via `processEmailBatch()`
- [ ] POST — update account tokens en last_sync timestamp
- [ ] POST — retourneert error bij geen actieve accounts

### T07-5: `api/cron/re-embed/route.ts` tests

**Bestand:** `apps/cockpit/__tests__/api/cron-re-embed.test.ts`
**Mock:** `@repo/ai/pipeline/re-embed-worker`

Gedragstests:

- [ ] POST — roept `runReEmbedWorker()` aan
- [ ] POST — retourneert totalen per tabel
- [ ] POST — retourneert error response bij failure

### T07-6: `api/cron/reclassify/route.ts` tests

**Bestand:** `apps/cockpit/__tests__/api/cron-reclassify.test.ts`
**Mock:** `@repo/ai/agents/gatekeeper`, `@repo/database/queries/people`, `@repo/database/queries/meetings`, `@repo/database/mutations/meetings`, `@repo/ai/pipeline/entity-resolution`, `@repo/ai/pipeline/participant-classifier`

Gedragstests:

- [ ] POST — haalt meetings op die herclassificatie nodig hebben
- [ ] POST — draait Gatekeeper per meeting
- [ ] POST — update classificatie (meeting_type, party_type, relevance_score)
- [ ] POST — resolved organisatie via entity-resolution
- [ ] POST — retourneert count van herclassificeerde meetings

### T07-7: `api/mcp/route.ts` tests

**Bestand:** `apps/cockpit/__tests__/api/mcp.test.ts`
**Mock:** `@repo/mcp/server`, `@repo/database/supabase/server`

Gedragstests:

- [ ] POST — forwardt request naar MCP server
- [ ] GET — retourneert MCP server info
- [ ] DELETE — cleanup MCP session

### T07-8: DevHub `api/ingest/userback/route.ts` tests

**Bestand:** `apps/devhub/__tests__/api/ingest-userback.test.ts`
**Mock:** `@repo/database/supabase/server`, `@repo/database/supabase/admin`, `@repo/database/queries/issues`, `@repo/database/mutations/issues`, `@repo/database/integrations/userback`, `@repo/database/mutations/issue-attachments`

Gedragstests:

- [ ] GET — retourneert sync status
- [ ] POST — fetcht Userback feedback; filtert test submissions
- [ ] POST — filtert bestaande userback_ids
- [ ] POST — insert/update issues via `upsertUserbackIssues()`
- [ ] POST — slaat media op via `storeIssueMedia()`
- [ ] POST — retourneert count: imported, updated, skipped

## Afronding

- [ ] Alle tests draaien groen via `npm run test`
- [ ] Webhook routes retourneren altijd 200 (voorkom retries)
- [ ] Cron routes valideren auth/secret headers
- [ ] Tests mocken alle externe services (geen echte API calls)
