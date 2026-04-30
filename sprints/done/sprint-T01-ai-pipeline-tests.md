# Sprint T01 — AI Pipeline Kritieke Tests

**Area:** AI Pipeline (`packages/ai/src/pipeline/`)
**Priority:** Kritiek — hoogste blast radius in de codebase
**Test type:** Unit tests met gemockte database/AI calls
**Pattern:** `vi.mock()` voor `@repo/database/*` en AI agents, test gedrag + branching

## Doel

Test de kernpipelines die alle data door het systeem sturen. Fouten hier raken meetings, extractions, embeddings, organisaties en projecten tegelijk. Geen false positives: test op observeerbaar gedrag (return values, welke functies aangeroepen worden met welke argumenten, foutafhandeling).

## Taken

### T01-1: `save-extractions.ts` tests

**Bestand:** `packages/ai/__tests__/pipeline/save-extractions.test.ts`
**Mock:** `@repo/database/mutations/meetings`, `@repo/database/mutations/extractions`

Gedragstests:

- [ ] Linkt alle identified_projects via `linkAllMeetingProjects()` met correcte meeting_id
- [ ] Mapt extraction items naar juiste project_id op basis van naam-match
- [ ] Fallback: items zonder expliciet project krijgen primary project (hoogste confidence)
- [ ] Personal scope (`scope: "personal"`) krijgt altijd `project_id: null`
- [ ] Retourneert `{ extractions_saved: N, projects_linked: N }` bij succes
- [ ] Retourneert `{ extractions_saved: 0 }` bij lege extractie-input
- [ ] Logt fout maar crasht niet als `linkAllMeetingProjects` faalt

### T01-2: `entity-resolution.ts` tests

**Bestand:** `packages/ai/__tests__/pipeline/entity-resolution.test.ts`
**Mock:** `@repo/database/queries/projects`, `@repo/database/queries/organizations`, `@repo/database/mutations/projects`, `../embeddings`

Gedragstests `resolveProject()`:

- [ ] Exact name match retourneert `{ matched: true, match_type: "exact" }`
- [ ] Substring match (>=4 chars) retourneert `match_type: "substring"`
- [ ] Alias match retourneert `match_type: "alias"`
- [ ] Embedding similarity match retourneert `match_type: "embedding"` met similarity score
- [ ] Geen match retourneert `{ matched: false }`
- [ ] Korte namen (<4 chars) slaan substring matching over

Gedragstests `resolveOrganization()`:

- [ ] Exact match op organisatie naam
- [ ] Alias match op organisatie
- [ ] Geen match retourneert `{ matched: false }`

Gedragstests `resolveClientEntities()`:

- [ ] Skipt namen in `ignoredNames` set
- [ ] Retourneert Map van naam→org_id voor gematchte clients
- [ ] Ongematchte namen worden niet in de Map opgenomen

### T01-3: `embed-pipeline.ts` tests

**Bestand:** `packages/ai/__tests__/pipeline/embed-pipeline.test.ts`
**Mock:** `@repo/database/mutations/embeddings`, `@repo/database/queries/meetings`, `../embeddings`, `./embed-text`

Gedragstests:

- [ ] Haalt meeting + extractions op via queries
- [ ] Roept `buildMeetingEmbedText()` aan met meeting data
- [ ] Schrijft meeting embedding via `updateRowEmbedding()`
- [ ] Schrijft extraction embeddings via `batchUpdateEmbeddings()`
- [ ] Gooit error als meeting niet gevonden wordt
- [ ] Gooit error als meeting embedding faalt
- [ ] Logt maar gooit niet bij batch extraction embedding failure

### T01-4: `email-pipeline.ts` tests

**Bestand:** `packages/ai/__tests__/pipeline/email-pipeline.test.ts`
**Mock:** `@repo/database/mutations/emails`, `@repo/database/queries/people`, `../agents/email-classifier`, `../agents/email-extractor`, `./context-injection`, `./entity-resolution`, `../embeddings`

Gedragstests:

- [ ] Classificeert email en slaat classificatie op in DB
- [ ] Slaat extractie over als `relevance_score < 0.4`
- [ ] Slaat extractie over als `email_type` newsletter of notification is
- [ ] Voert extractie uit als relevance >= 0.4 en type is relevant
- [ ] Resolved organisatie en linkt aan email
- [ ] Matcht sender person op basis van email adres
- [ ] Linkt projecten op basis van classifier output
- [ ] Accumuleert errors in array ipv crashen
- [ ] Markeert email als processed ook bij classificatie-falen (voorkom retry loops)
- [ ] Retourneert `EmailPipelineResult` met alle stap-resultaten

### T01-5: `scan-needs.ts` tests

**Bestand:** `packages/ai/__tests__/pipeline/scan-needs.test.ts`
**Mock:** `@repo/database/supabase/admin`, `@repo/database/mutations/extractions`, `../agents/needs-scanner`

Gedragstests `scanMeetingNeeds()`:

- [ ] Skipt met `skipped_reason: "already_scanned"` als meeting al need-extracties heeft
- [ ] Skipt met `skipped_reason: "not_internal_team_sync"` als meeting niet intern team_sync is
- [ ] Skipt met `skipped_reason: "no_summary"` als meeting geen summary heeft
- [ ] Skipt met `skipped_reason: "meeting_not_found"` als meeting niet bestaat
- [ ] Voert scan uit en insert needs als extractions bij geldige meeting
- [ ] Retourneert `{ scanned: true, needs_found: N }` bij succes

Gedragstests `scanAllUnscannedMeetings()`:

- [ ] Verwerkt meerdere meetings in batch
- [ ] Accumuleert errors per meeting zonder te stoppen
- [ ] Retourneert totalen: `{ total_scanned, total_needs, errors[] }`

### T01-6: `participant-classifier.ts` tests

**Bestand:** `packages/ai/__tests__/pipeline/participant-classifier.test.ts`
**Mock:** `@repo/database/queries/people`

Gedragstests `classifyParticipants()`:

- [ ] @jouwaipartner.nl email → classificatie "internal"
- [ ] @jaip.nl email → classificatie "internal"
- [ ] Bekende persoon met team=true → "internal"
- [ ] Bekende persoon met organisatie → "external"
- [ ] Onbekende deelnemer → "unknown"
- [ ] Splitst comma-separated namen in individuele deelnemers
- [ ] Dedupliceert en normaliseert (lowercase)

Gedragstests `determinePartyType()`:

- [ ] Alle internal → retourneert "internal"
- [ ] Mix met bekende external (org_type=client) → "client"
- [ ] Mix met bekende external (org_type=partner) → "partner"
- [ ] Onbekende mix → "other"

### T01-7: `speaker-map.ts` tests

**Bestand:** `packages/ai/__tests__/pipeline/speaker-map.test.ts`
**Mock:** geen (pure functies)

Gedragstests:

- [ ] `extractSpeakerNames()` haalt unieke namen uit sentences
- [ ] `buildSpeakerMap()` matcht exact op naam
- [ ] `buildSpeakerMap()` matcht "FirstName | Org" display format
- [ ] Ongematchte speakers krijgen `personId: null, label: "unknown"`
- [ ] `formatSpeakerContext()` genereert leesbare string voor AI

### T01-8: `embed-text.ts` tests

**Bestand:** `packages/ai/__tests__/pipeline/embed-text.test.ts`
**Mock:** geen (pure functie)

Gedragstests:

- [ ] Bevat meeting title, participants, summary in output
- [ ] Groepeert extractions per type met Nederlandse labels
- [ ] Retourneert lege string-secties als er geen extractions zijn
- [ ] Handelt lege/null velden correct af

### T01-9: `summary-pipeline.ts` tests

**Bestand:** `packages/ai/__tests__/pipeline/summary-pipeline.test.ts`
**Mock:** `@repo/database/supabase/admin`, `@repo/database/queries/summaries`, `@repo/database/mutations/summaries`, `../agents/project-summarizer`

Gedragstests:

- [ ] `generateProjectSummaries()` haalt segments + vorige summary op
- [ ] Schrijft nieuwe summary versie via `createSummaryVersion()`
- [ ] `triggerSummariesForMeeting()` dispatcht parallel per project+org
- [ ] `triggerSummariesForEmail()` dispatcht parallel per project+org
- [ ] Vangt rejected promises op via `Promise.allSettled`
- [ ] Retourneert `{ error }` bij falende AI call

## Afronding

- [ ] Alle tests draaien groen via `npm run test -- --filter=ai`
- [ ] Geen gemockte return values die niet overeenkomen met echte types
- [ ] Tests documenteren het verwachte gedrag, niet de implementatie
