# Sprint T05 — DevHub Actions Tests

**Area:** DevHub server actions (`apps/devhub/src/actions/`)
**Priority:** Hoog — 6 action-modules, 0 tests, kern van DevHub CRUD + AI
**Test type:** Integration tests met echte Supabase + gemockte AI/next/cache
**Pattern:** Zelfde patroon als cockpit: `describeWithDb()`, `mockAuthenticated()`, dynamic imports

## Doel

Test de DevHub server actions op gedrag: issue CRUD, AI classificatie, commentaar, execution, en Userback import. Focus op: activity logging bij elke mutatie, fire-and-forget patronen, status transitions met timestamp tracking, en foutafhandeling.

## Voorbereiding

- [ ] Maak `apps/devhub/__tests__/helpers/` met mock-auth, mock-next, describe-with-db (kopieer cockpit patroon)
- [ ] Maak seed helpers: `seedIssue()`, `seedIssueComment()` met DevHub-specifieke velden (project_id, userback_id, ai_classification)

## Taken

### T05-1: `actions/issues.ts` tests

**Bestand:** `apps/devhub/__tests__/actions/issues.test.ts`

Gedragstests `createIssueAction()`:

- [ ] Insert issue met correct schema; retourneert `{ success, id }`
- [ ] Logt "created" activity na insert
- [ ] Triggert `classifyIssueBackground()` fire-and-forget (niet await)
- [ ] Retourneert error bij ongeldige input (Zod validatie)
- [ ] Retourneert error zonder auth

Gedragstests `updateIssueAction()`:

- [ ] Partial update van title, priority, type, component, severity
- [ ] Status change: zet `closed_at` bij sluiten; zet null bij heropenen
- [ ] Logt activity per gewijzigd veld (field + old_value + new_value)
- [ ] Label wijziging: logt added + removed labels apart
- [ ] Retourneert error zonder auth

Gedragstests `deleteIssueAction()`:

- [ ] Verwijdert issue + cascade (comments, activity)
- [ ] Retourneert error zonder auth
- [ ] Retourneert error bij niet-bestaand id

Gedragstests `createCommentAction()`:

- [ ] Insert comment met author_id; logt "commented" activity
- [ ] Retourneert error bij lege body

### T05-2: `actions/classify.ts` tests

**Bestand:** `apps/devhub/__tests__/actions/classify.test.ts`
**Mock extra:** `@repo/ai/agents/issue-classifier`

Gedragstests:

- [ ] `classifyIssueAction()` — roept AI classifier aan; schrijft ai_classification + component + severity + ai_classified_at
- [ ] `classifyIssueAction()` — voor manual issues: zet ook type
- [ ] `classifyIssueAction()` — logt activity met confidence in metadata
- [ ] `classifyIssueAction()` — retourneert error zonder auth
- [ ] `classifyIssueBackground()` — swallowt errors (logt silently, geen throw)
- [ ] `classifyIssueBackground()` — schrijft zelfde velden als interactive versie

### T05-3: `actions/comments.ts` tests

**Bestand:** `apps/devhub/__tests__/actions/comments.test.ts`

Gedragstests:

- [ ] `updateCommentAction()` — update alleen body; retourneert success
- [ ] `updateCommentAction()` — Zod validatie op schema
- [ ] `deleteCommentAction()` — verwijdert comment; logt "comment_deleted" activity
- [ ] Alle acties retourneren error zonder auth

### T05-4: `actions/execute.ts` tests

**Bestand:** `apps/devhub/__tests__/actions/execute.test.ts`
**Mock extra:** `@repo/ai/agents/issue-executor`

Gedragstests:

- [ ] `startAiExecution()` — zet execution_type="ai", ai_executable=true
- [ ] `startAiExecution()` — schrijft ai_context (analysis, approach, complexity, affected_files, estimated_total_minutes)
- [ ] `startAiExecution()` — schrijft ai_result met steps; eerste step status="in_progress"
- [ ] `startAiExecution()` — zet issue status naar "executing"
- [ ] `startAiExecution()` — retourneert error zonder auth
- [ ] `startAiExecution()` — retourneert error bij niet-bestaand issue

### T05-5: `actions/import.ts` tests

**Bestand:** `apps/devhub/__tests__/actions/import.test.ts`
**Mock extra:** `@repo/database/integrations/userback`

Gedragstests `syncUserback()`:

- [ ] Retourneert `{ success, data: { imported, updated, skipped, total, classified, errors } }`
- [ ] Nieuwe imports worden sequentieel AI-geclassificeerd
- [ ] Bestaande items (op userback_id) worden geupdate, niet opnieuw geinsert
- [ ] `isInitial` flag correct bij eerste sync vs. volgende syncs
- [ ] Retourneert error zonder auth

Gedragstests `getSyncStatus()`:

- [ ] Retourneert `{ itemCount, lastSyncCursor }`
- [ ] Cursor is max userback_modified_at uit metadata

Gedragstests `backfillMedia()`:

- [ ] Vindt issues zonder attachments
- [ ] Extraheert media URLs uit source_metadata
- [ ] Slaat media op in Supabase storage
- [ ] Retourneert `{ processed, mediaStored, skipped, errors }`
- [ ] Limiteert errors tot eerste 5

## Afronding

- [ ] Alle tests draaien groen via `npm run test -- --filter=devhub`
- [ ] Activity logging getest bij elke mutatie (niet alleen de main action)
- [ ] Fire-and-forget patterns correct gemockt (verify call, niet await)
