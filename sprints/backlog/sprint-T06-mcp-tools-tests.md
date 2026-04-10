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

- [ ] Registreert search tool correct op MCP server
- [ ] Roept `embedText()` aan met search query
- [ ] Filtert default op verified_only
- [ ] Formatteert resultaten met verificatie status
- [ ] Resolved profile namen voor verified_by ids
- [ ] Handelt lege zoekresultaten af

### T06-2: `tools/meetings.ts` tests

**Bestand:** `packages/mcp/__tests__/tools/meetings.test.ts`
**Mock:** `@repo/database/supabase/admin`, `@repo/database/queries/meeting-project-summaries`

Gedragstests:

- [ ] Haalt meeting op met segments via `getSegmentsByMeetingIds()`
- [ ] Formatteert verificatie status
- [ ] Escaped like-characters in zoekinput
- [ ] Resolved profile namen
- [ ] Retourneert foutmelding bij niet-bestaand meeting

### T06-3: `tools/list-meetings.ts` tests

**Bestand:** `packages/mcp/__tests__/tools/list-meetings.test.ts`
**Mock:** `@repo/database/supabase/admin`, `@repo/database/queries/meeting-project-summaries`

Gedragstests:

- [ ] Filtert op project (resolved via `resolveProjectIds()`)
- [ ] Filtert op organisatie (resolved via `resolveOrganizationIds()`)
- [ ] Filtert op deelnemer (resolved via `resolveMeetingIdsByParticipant()`)
- [ ] Escaped like-characters
- [ ] Haalt segment counts op per meeting

### T06-4: `tools/actions.ts` tests

**Bestand:** `packages/mcp/__tests__/tools/actions.test.ts`
**Mock:** `@repo/database/supabase/admin`, `@repo/database/queries/people`

Gedragstests:

- [ ] Filtert op persoon via `findPersonIdsByName()`
- [ ] Resolved project ids
- [ ] Formatteert verificatie status
- [ ] Default verified_only filter

### T06-5: `tools/correct-extraction.ts` tests

**Bestand:** `packages/mcp/__tests__/tools/correct-extraction.test.ts`
**Mock:** `@repo/database/supabase/admin`, `@repo/database/mutations/extractions`, `@repo/database/queries/people`

Gedragstests:

- [ ] Haalt extractie op via `getExtractionForCorrection()`
- [ ] Voert correctie uit via `correctExtraction()`
- [ ] Resolved corrected_by naam naar profile id
- [ ] Retourneert error bij niet-bestaande extractie

### T06-6: `tools/write-tasks.ts` tests

**Bestand:** `packages/mcp/__tests__/tools/write-tasks.test.ts`
**Mock:** `@repo/database/supabase/admin`, `@repo/database/mutations/tasks`, `@repo/database/queries/people`

Gedragstests:

- [ ] `createTaskFromExtraction` — maakt taak aan
- [ ] `updateTask` — partial update
- [ ] `completeTask` — markeert als done
- [ ] `dismissTask` — markeert als dismissed
- [ ] Resolved assigned_to naam naar profile id

### T06-7: `tools/write-client-updates.ts` tests

**Bestand:** `packages/mcp/__tests__/tools/write-client-updates.test.ts`
**Mock:** `@repo/database/supabase/admin`, `@repo/database/mutations/meetings`, `@repo/database/mutations/extractions`, `@repo/database/queries/people`

Gedragstests:

- [ ] Insert manual meeting met correcte defaults
- [ ] Insert extracties gekoppeld aan meeting
- [ ] Resolved organisatie id
- [ ] Retourneert error bij ongeldige input

### T06-8: `tools/decisions.ts` + overige read tools tests

**Bestand:** `packages/mcp/__tests__/tools/read-tools.test.ts`
**Mock:** `@repo/database/supabase/admin`

Gedragstests:

- [ ] `decisions` — formatteert met verificatie status + profile namen
- [ ] `organizations` — escaped like-characters; sanitized contains
- [ ] `projects` — haalt segment counts per project
- [ ] `people` — escaped like-characters in zoekinput
- [ ] `get-organization-overview` — combineert org data met meetings en extracties

### T06-9: `tools/usage-tracking.ts` tests

**Bestand:** `packages/mcp/__tests__/tools/usage-tracking.test.ts`

Gedragstests:

- [ ] `trackMcpQuery()` — logt query naar database
- [ ] Faalt silently bij DB error (geen throw)

## Afronding

- [ ] Alle tests draaien groen via `npm run test -- --filter=mcp`
- [ ] Elke tool-module heeft minimaal happy path + error case
- [ ] Utils functies (escapeLike, sanitizeForContains, etc.) al getest in bestaande utils.test.ts
