# Sprint Q2b-C — Query Centralisatie: API Routes + Email + DevHub Issues

**Type:** Uitvoeringssprint — deel 3 van 3 (afrondend)
**Blokkade:** Q2b-A en Q2b-B afgerond
**Area:** `apps/cockpit/src/app/api/`, `apps/devhub/src/app/api/`, `apps/cockpit/src/actions/email-filter.ts`, `apps/devhub/src/actions/{classify,issues}.ts`
**Priority:** Hoog
**Geschatte duur:** 1-2 uur

## Doel

Migreer de laatste 8 call-sites: 5 API-routes + 1 email-action + 2 devhub-actions. Sluit Q2b af met volledige nul-telling voor actions + API routes en markeer `query-inventory.md` als executed.

## Scope (telproces)

Exact 8 calls, bron: `docs/specs/query-inventory.md`:

- Cockpit API routes = 4 (sectie 1.2):
  - `app/api/email/reclassify/route.ts:62`
  - `app/api/ingest/backfill-sentences/route.ts:35, 61`
  - `app/api/ingest/reprocess/route.ts:49`
- Cockpit action = 1: `actions/email-filter.ts:45`
- DevHub actions = 2 (sectie 1.3): `actions/classify.ts:78`, `actions/issues.ts:199`
- DevHub API route = 1 (sectie 1.4): `app/api/ingest/userback/route.ts:36`

Verificatie:

```bash
grep -rn "\.from(\"" \
  apps/cockpit/src/app/api \
  apps/devhub/src/app/api \
  apps/cockpit/src/actions/email-filter.ts \
  apps/devhub/src/actions/classify.ts \
  apps/devhub/src/actions/issues.ts | grep -v __tests__ | wc -l
```

moet exact **8** geven bij start.

## Taken

### Q2b-C-1: Nieuwe helpers bouwen

**Uitbreiden `packages/database/src/queries/emails.ts`:**

- [ ] `getEmailForPipelineInput(id, client?)` — velden: `id, subject, from_address, from_name, to_addresses, date, body_text, snippet`
- [ ] `listEmailsForReclassify({ limit, skipFiltered, client? })` — met `.or("filter_status.eq.kept,is_processed.eq.false")` wanneer `skipFiltered=true`

**Uitbreiden `packages/database/src/queries/meetings.ts`:**

- [ ] `getMeetingForBackfill(id, client?)` — velden: `id, fireflies_id, raw_fireflies`
- [ ] Uitbreiden `getMeetingByFirefliesId` óf nieuwe `getMeetingByFirefliesIdForReprocess(ffId, client?)` — velden: `id, title, date, meeting_type, party_type, participants, organization_id, raw_fireflies`. Kies op basis van bestaande signature.

**Uitbreiden `packages/database/src/queries/projects.ts`:**

- [ ] `getProjectName(projectId, client?)` — 1 kolom, voor Slack-notifs in devhub.
- [ ] **LET OP:** `getProjectByUserbackProjectId(ubId, client?)` — admin-variant, alleen gebruikt door `api/ingest/userback` GET-handler. De page-variant in `(app)/settings/import/page.tsx` is **Q2c**-scope; bouw hem wel helper-scope-safe (met `client?`).

**Hergebruik:**

- [ ] `updateMeetingRawFireflies` bestaat al in `mutations/meetings.ts` — gewoon importeren voor `backfill-sentences/route.ts:61`.

### Q2b-C-2: Call-sites migreren — Email

- [ ] `apps/cockpit/src/actions/email-filter.ts:45` → `getEmailForPipelineInput(emailId)`
- [ ] `apps/cockpit/src/app/api/email/reclassify/route.ts:62` → `listEmailsForReclassify({ limit, skipFiltered })`

### Q2b-C-3: Call-sites migreren — Meeting ingest routes

- [ ] `app/api/ingest/backfill-sentences/route.ts:35` → `getMeetingForBackfill(id)`
- [ ] `app/api/ingest/backfill-sentences/route.ts:61` → `updateMeetingRawFireflies(id, merged)`
- [ ] `app/api/ingest/reprocess/route.ts:49` → `getMeetingByFirefliesIdForReprocess(ff_id)` (of uitgebreide `getMeetingByFirefliesId`)

### Q2b-C-4: Call-sites migreren — DevHub

- [ ] `apps/devhub/src/actions/classify.ts:78` → `getProjectName(projectId)`
- [ ] `apps/devhub/src/actions/issues.ts:199` → `getProjectName(projectId)` (hergebruik)
- [ ] `apps/devhub/src/app/api/ingest/userback/route.ts:36` → `getProjectByUserbackProjectId("127499", admin)`

### Q2b-C-5: Tests

- [ ] `__tests__/api/ingest-reprocess.test.ts` + `cron-reclassify.test.ts` — payload-capture op helpers.
- [ ] `npm test` groen.

### Q2b-C-6: Finale validatie + CLAUDE.md update

- [ ] `grep -rn "\.from(\"" apps/*/src/actions apps/*/src/app/api | grep -v __tests__` = **0 lines** (behalve eventueel goedgekeurde uitzonderingen — documenteer die dan in `docs/specs/query-inventory.md`).
- [ ] `npm run check:queries` geeft 0 hits voor alle actions + API routes.
- [ ] Update `CLAUDE.md` sectie "Database & Queries":
  - [ ] Voeg regel toe: "Geen directe `.from()` in `apps/*/actions` of `apps/*/app/api`. Check via `npm run check:queries`."
  - [ ] Verwijs naar `packages/database/README.md` voor client-scope beleid.
- [ ] Markeer `docs/specs/query-inventory.md` als "executed" — voeg banner bovenaan toe: `**Status:** Q2b completed YYYY-MM-DD. Resterende 7 calls (Server Components + auth-callbacks) staan in scope van Q2c.`

## Afronding

- [ ] Alle 33 Q2b-calls weg uit `apps/*/actions` + `apps/*/app/api`.
- [ ] `npm run check:queries` groen.
- [ ] `npm run lint` + `type-check` + `test` groen.
- [ ] Dep-graph geregenereerd.
- [ ] `docs/specs/query-inventory.md` bijgewerkt met executed-banner.
- [ ] Alle drie Q2b-sub-sprints (A, B, C) verplaatst naar `sprints/done/`.
- [ ] Originele `sprint-Q2b-query-centralisatie-execution.md` verwijderd uit `backlog/` (vervangen door A/B/C).
