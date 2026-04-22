# Sprint Q2b-B — Query Centralisatie: Meeting-domein

**Type:** Uitvoeringssprint — deel 2 van 3
**Blokkade:** Q2b-A afgerond (helpers-pattern vastgelegd, lint-tool actief, README aanwezig)
**Area:** `apps/cockpit/src/actions/meeting-pipeline.ts`, `meetings.ts`, `segments.ts`, `packages/database/`
**Priority:** Hoog
**Geschatte duur:** 2-3 uur

## Doel

Migreer de 13 call-sites in het meeting-domein naar helpers. Respecteer de flow-semantiek van `reprocessMeetingAction` (park/restore) en `regenerateMeetingAction` (delete-insert-replace segments).

## Scope (telproces)

Exact 13 calls, bron: `docs/specs/query-inventory.md` sectie 1.1:

- `meeting-pipeline.ts` = 8 (regels 44, 151, 157, 252, 342, 369, 380, 424)
- `meetings.ts` = 2 (regels 229, 230)
- `segments.ts` = 3 (regels 41, 53, 89)

Verificatie:

```bash
grep -n "\.from(\"" \
  apps/cockpit/src/actions/meeting-pipeline.ts \
  apps/cockpit/src/actions/meetings.ts \
  apps/cockpit/src/actions/segments.ts | wc -l
```

moet exact **13** geven bij start.

## Taken

### Q2b-B-1: Nieuwe helpers bouwen

**Uitbreiden `packages/database/src/queries/meetings.ts`:**

- [ ] `getMeetingForRegenerate(id, client?)` — join met `meeting_participants(person:people(name))`
- [ ] `getMeetingForRegenerateRisks(id, client?)` — incl. `raw_fireflies`
- [ ] `getMeetingForReprocess(id, client?)` — slank: `id, fireflies_id, title`
- [ ] `getMeetingOrganizationId(id, client?)` — 1 kolom
- [ ] `listMeetingProjectIds(meetingId, client?)`
- [ ] `listMeetingParticipantIds(meetingId, client?)`

**Uitbreiden `packages/database/src/mutations/meetings.ts`:**

- [ ] `parkMeetingForReprocess(id, parkedTitle, client?)` — update met `fireflies_id=null`
- [ ] `restoreParkedMeeting(id, firefliesId, title, client?)` — restore na crash

**Uitbreiden `packages/database/src/queries/meeting-project-summaries.ts`:**

- [ ] `getSegmentNameRaw(segmentId, client?)`

**Uitbreiden `packages/database/src/mutations/meeting-project-summaries.ts`:**

- [ ] `deleteSegmentsByMeetingId(meetingId, client?)` — check of deze al bestaat; zo ja: hergebruik.

**Uitbreiden `packages/database/src/queries/projects.ts`:**

- [ ] `getProjectAliases(projectId, client?)` — 1 kolom

### Q2b-B-2: Call-sites migreren — `meeting-pipeline.ts`

Belangrijk: de flow-structuur blijft zoals-is. Alleen `.from()`-calls vervangen door helper-calls.

- [ ] `regenerateMeetingAction` (regel 42-223):
  - [ ] Regel 44 → `getMeetingForRegenerate(meetingId)`
  - [ ] Regel 151 → `getMeetingOrganizationId(meetingId)`
  - [ ] Regel 157 → `deleteSegmentsByMeetingId(meetingId)`
- [ ] `regenerateRisksAction` (regel 238-323):
  - [ ] Regel 252 → `getMeetingForRegenerateRisks(meetingId)`
- [ ] `reprocessMeetingAction` (regel 327-438):
  - [ ] Regel 342 → `getMeetingForReprocess(meetingId)`
  - [ ] Regel 369 → `parkMeetingForReprocess(meetingId, parkedTitle)`
  - [ ] Regel 380 → `restoreParkedMeeting(meetingId, firefliesId, title)` (in `restoreOldMeeting` helper-functie)
  - [ ] Regel 424 → hergebruik bestaande `deleteMeeting(meetingId)` uit `mutations/meetings.ts`
- [ ] Park/restore-compensating-action blijft werkend: schrijf unit-test die partial failure tussen park en pipeline simuleert.

### Q2b-B-3: Call-sites migreren — `meetings.ts`

- [ ] Regel 229 → `listMeetingProjectIds(meetingId)`
- [ ] Regel 230 → `listMeetingParticipantIds(meetingId)`
- [ ] De twee calls staan in een `Promise.all` — helpers moeten dus apart aanroepbaar zijn.

### Q2b-B-4: Call-sites migreren — `segments.ts`

- [ ] Regel 41 (`getSegmentNameRaw` helper in actie) → vervang door `getSegmentNameRaw` uit `queries/meeting-project-summaries.ts`.
- [ ] Regel 53 (`getMeetingOrgId` helper in actie) → vervang door `getMeetingOrganizationId` uit `queries/meetings.ts`.
- [ ] Regel 89 (alias-fetch) → vervang door `getProjectAliases(projectId)`.
- [ ] Verwijder de twee lokale helper-functies `getSegmentNameRaw` en `getMeetingOrgId` uit het actions-bestand.

### Q2b-B-5: Tests

- [ ] `__tests__/actions/segments.test.ts` — payload-capture op nieuwe mutation-mocks i.p.v. `.from()`-mocks.
- [ ] Voeg test toe voor `reprocessMeetingAction` park/restore flow (partial failure recovery).
- [ ] `npm test` groen.

## Afronding

- [ ] `grep -n "\.from(\"" apps/cockpit/src/actions/meeting-pipeline.ts apps/cockpit/src/actions/meetings.ts apps/cockpit/src/actions/segments.ts | wc -l` = **0**
- [ ] `npm run check:queries` geeft 0 hits voor deze 3 bestanden.
- [ ] `npm run lint` + `type-check` groen.
- [ ] `npm test` groen.
- [ ] Dep-graph geregenereerd.
- [ ] Sprint verplaatst naar `sprints/done/`.
