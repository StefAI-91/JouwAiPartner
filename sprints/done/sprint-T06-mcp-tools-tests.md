# Sprint T06 — MCP Tools Tests

**Area:** MCP tools (`packages/mcp/src/tools/`)
**Priority:** Medium-Hoog — 12 tool-modules, alleen server.ts en utils.ts getest
**Test type:** Unit tests met gemockte Supabase admin client
**Pattern:** `vi.mock()` voor `@repo/database/*`, test tool registration + execution

## Doel

Test dat elke MCP tool correct data ophaalt, formatteert en retourneert. Focus op: input validatie, filter-logica, output formatting, en error responses. De MCP tools zijn de externe interface — fouten hier zijn direct zichtbaar voor gebruikers.

## Taken

### T06-1: `tools/search.ts` tests

**Bestand:** `packages/mcp/__tests__/tools/search.test.ts`
**Mock:** `@repo/database/supabase/admin`, `@repo/ai/embeddings`

Gedragstests:

- [x] Registreert search tool correct op MCP server
- [x] Roept `embedText()` aan met search query
- [x] Filtert default op verified_only
- [x] Formatteert resultaten met verificatie status
- [x] Resolved profile namen voor verified_by ids
- [x] Handelt lege zoekresultaten af

### T06-2: `tools/meetings.ts` tests

**Bestand:** `packages/mcp/__tests__/tools/meetings.test.ts`
**Mock:** `@repo/database/supabase/admin`, `@repo/database/queries/meeting-project-summaries`

Gedragstests:

- [x] Haalt meeting op met segments via `getSegmentsByMeetingIds()`
- [x] Formatteert verificatie status
- [x] Escaped like-characters in zoekinput
- [x] Resolved profile namen
- [x] Retourneert foutmelding bij niet-bestaand meeting

### T06-3: `tools/list-meetings.ts` tests

**Bestand:** `packages/mcp/__tests__/tools/list-meetings.test.ts`
**Mock:** `@repo/database/supabase/admin`, `@repo/database/queries/meeting-project-summaries`

Gedragstests:

- [x] Filtert op project (resolved via `resolveProjectIds()`)
- [x] Filtert op organisatie (resolved via `resolveOrganizationIds()`)
- [x] Filtert op deelnemer (resolved via `resolveMeetingIdsByParticipant()`)
- [x] Escaped like-characters
- [x] Haalt segment counts op per meeting

### T06-4: `tools/actions.ts` tests

**Bestand:** `packages/mcp/__tests__/tools/actions.test.ts`
**Mock:** `@repo/database/supabase/admin`, `@repo/database/queries/people`

Gedragstests:

- [x] Filtert op persoon via `findPersonIdsByName()`
- [x] Resolved project ids
- [x] Formatteert verificatie status
- [x] Default verified_only filter

### T06-5: `tools/correct-extraction.ts` tests

**Bestand:** `packages/mcp/__tests__/tools/correct-extraction.test.ts`
**Mock:** `@repo/database/supabase/admin`, `@repo/database/mutations/extractions`, `@repo/database/queries/people`

Gedragstests:

- [x] Haalt extractie op via `getExtractionForCorrection()`
- [x] Voert correctie uit via `correctExtraction()`
- [x] Resolved corrected_by naam naar profile id
- [x] Retourneert error bij niet-bestaande extractie

### T06-6: `tools/write-tasks.ts` tests

**Bestand:** `packages/mcp/__tests__/tools/write-tasks.test.ts`
**Mock:** `@repo/database/supabase/admin`, `@repo/database/mutations/tasks`, `@repo/database/queries/people`

Gedragstests:

- [x] `createTaskFromExtraction` — maakt taak aan
- [x] `updateTask` — partial update
- [x] `completeTask` — markeert als done
- [x] `dismissTask` — markeert als dismissed
- [x] Resolved assigned_to naam naar profile id

### T06-7: `tools/write-client-updates.ts` tests

**Bestand:** `packages/mcp/__tests__/tools/write-client-updates.test.ts`
**Mock:** `@repo/database/supabase/admin`, `@repo/database/mutations/meetings`, `@repo/database/mutations/extractions`, `@repo/database/queries/people`

Gedragstests:

- [x] Insert manual meeting met correcte defaults
- [x] Insert extracties gekoppeld aan meeting
- [x] Resolved organisatie id
- [x] Retourneert error bij ongeldige input

### T06-8: `tools/decisions.ts` + overige read tools tests

**Bestand:** `packages/mcp/__tests__/tools/read-tools.test.ts`
**Mock:** `@repo/database/supabase/admin`

Gedragstests:

- [x] `decisions` — formatteert met verificatie status + profile namen
- [x] `organizations` — escaped like-characters; sanitized contains
- [x] `projects` — haalt segment counts per project
- [x] `people` — escaped like-characters in zoekinput
- [x] `get-organization-overview` — combineert org data met meetings en extracties

### T06-9: `tools/usage-tracking.ts` tests

**Bestand:** `packages/mcp/__tests__/tools/usage-tracking.test.ts`

Gedragstests:

- [x] `trackMcpQuery()` — logt query naar database
- [x] Faalt silently bij DB error (geen throw)

## Afronding

- [x] Alle tests draaien groen via `npm run test -- --filter=mcp`
- [x] Elke tool-module heeft minimaal happy path + error case
- [x] Utils functies (escapeLike, sanitizeForContains, etc.) al getest in bestaande utils.test.ts
