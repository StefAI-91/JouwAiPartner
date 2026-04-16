# Sprint 035: Board-meetings classificeren + Management-hub

> **Scope-afbakening.** Eerste sprint in een tranche rond bestuurlijke (Stef + Wouter) overleggen. Doel is **alleen** classificatie + een eigen plek in de UI. Geen aparte extractor, geen thema-tagging, geen cross-meeting analyses, geen cron-jobs. Die komen pas wanneer er voldoende echte board-data ligt om patronen op te bouwen. Bouwt voort op de bestaande gatekeeper-pipeline en de Coming-Soon-placeholder op `/intelligence/leadership`.

## Doel

Na deze sprint:

1. Wordt elk overleg waarvan **alle deelnemers admin zijn** automatisch geclassificeerd als `meeting_type = board` door de gatekeeper.
2. Heeft Stef een hub-tegel **Management** (vervangt "Leadership" Coming Soon) op `/intelligence` die naar `/intelligence/management` linkt.
3. Toont `/intelligence/management` een chronologische lijst van alle `board`-meetings met de standaard extractor-output (besluiten, action items, insights) zichtbaar per meeting.
4. Kan Stef op `/meetings` board-meetings filteren (apart van klantoverleg) zodat de hoofd-meeting-lijst schoon blijft voor klantcontext.
5. Kan een handmatige re-classificatie van bestaande Stef+Wouter-meetings draaien zodat al opgebouwde historie meteen in Management verschijnt.

**Expliciet niet in scope:**

- Aparte board-extractor-prompt of -agent
- Thema-tagging (product/finance/people/...)
- Beslissingsstroom, open-loops kanban, threads, revisit-detector
- Cron-jobs voor cross-meeting AI-analyses
- Aanpassen van de huidige extractor-prompt

## Requirements

| ID       | Beschrijving                                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DATA-060 | `meeting_type` CHECK constraint uitgebreid met waarde `'board'`.                                                                                              |
| DATA-061 | `MEETING_TYPES` constant in `packages/database/src/constants/meetings.ts` krijgt entry `{ value: "board", label: "Management" }`.                             |
| DATA-062 | `MEETING_TYPES` enum in `packages/ai/src/validations/gatekeeper.ts` krijgt waarde `"board"`.                                                                  |
| FUNC-038 | Query `getAdminEmails()` retourneert lower-case e-mailadressen van alle `profiles WHERE role = 'admin'` (gecached per pipeline-run).                          |
| FUNC-039 | Query `listBoardMeetings(options?)` retourneert meetings met `meeting_type = 'board'`, gesorteerd op `date` desc, gepagineerd.                                |
| FUNC-040 | `KnownPerson` shape uitgebreid met `is_admin: boolean`, gevuld via join op `profiles.email` (case-insensitive).                                               |
| AI-012   | Gatekeeper-prompt classificeert als `board` zodra **alle** classified participants `is_admin = true` zijn (overschrijft `one_on_one`/`strategy`/`team_sync`). |
| AI-013   | Backfill-script `reclassify-board-meetings.ts` zet `meeting_type = 'board'` op bestaande meetings waarvan elke matched participant admin is.                  |
| UI-226   | Hub-tegel op `/intelligence` toont **Management** (Crown-icon, géén Coming-Soon-badge) en linkt naar `/intelligence/management`.                              |
| UI-227   | Route `/intelligence/management/page.tsx` toont een lijst van board-meetings (datum, titel, deelnemers, korte samenvatting).                                  |
| UI-228   | Klikken op een board-meeting opent de bestaande `/meetings/[id]` detailpagina (geen aparte detail-view in deze sprint).                                       |
| UI-229   | `/intelligence/management` heeft eigen `loading.tsx` en `error.tsx`.                                                                                          |
| UI-230   | `meetings-list.tsx` filter-strip toont `Management` als aparte type-optie; standaardweergave **verbergt** board-meetings (toggle aan om ze te tonen).         |
| UI-231   | `meeting-type-selector.tsx` (handmatige edit) krijgt `Management` als optie.                                                                                  |
| UI-232   | Oude route `/intelligence/leadership` redirect (`next.config` of `redirect()`-call in page) naar `/intelligence/management`.                                  |

## Bronverwijzingen

- Gatekeeper agent: `packages/ai/src/agents/gatekeeper.ts`
- Gatekeeper validatie/enum: `packages/ai/src/validations/gatekeeper.ts`
- Meeting-type constant + label: `packages/database/src/constants/meetings.ts`
- DB constraint: `supabase/migrations/20260405000005_manual_meeting_types.sql`
- Participant-classifier: `packages/ai/src/pipeline/participant-classifier.ts` (KnownPerson + admin-flag uitbreiden)
- Known-people query: `packages/database/src/queries/people.ts` (`getAllKnownPeople`)
- Profiles tabel + `role`-veld: `packages/auth/src/access.ts:42`
- Intelligence hub: `apps/cockpit/src/app/(dashboard)/intelligence/page.tsx`
- Bestaande placeholder: `apps/cockpit/src/app/(dashboard)/intelligence/leadership/page.tsx`
- Meetings query template: `packages/database/src/queries/meetings.ts` (regel 39, 85, 204 — bestaande list-shape)
- Meetings-lijst filter: `apps/cockpit/src/components/meetings/meetings-list.tsx:20`

## Context

### Trigger-regel: wanneer is het een board-meeting?

In de gatekeeper-pipeline krijgt elke deelnemer al een label (`internal` / `external` / `unknown`) via `participant-classifier.ts`. We breiden `KnownPerson` uit met een `is_admin`-flag — gevuld door een join tussen `people.email` en `profiles.email` (waar `profiles.role = 'admin'`).

De regel:

```
ALS alle classified participants
   - label = "internal" EN
   - is_admin = true
DAN meeting_type = 'board' (deterministisch, vóór de AI-call)
```

Dit gebeurt **vóór** de gatekeeper-AI-call: deterministisch in code. De AI hoeft hier niet over te beslissen — admin-status is een feit, geen interpretatie. Voordeel: spaart tokens, voorkomt drift, direct testbaar.

Als één deelnemer onbekend of niet-admin is, valt de meeting terug op de huidige logica (`one_on_one`, `strategy`, `team_sync`).

### Prompt-aanpassing gatekeeper

In de gatekeeper-prompt voegen we `board` toe aan de INTERN-sectie, met korte beschrijving:

```
- board: bestuurlijk overleg waarbij alle deelnemers admin zijn (Stef, Wouter).
  Strategische, financiële, of operationele beslissingen op directieniveau.
```

Voor het geval dat de deterministische pre-classificatie wordt overruled (bijv. handmatige edit of toekomstige use case), kan het LLM-pad ook `board` kiezen.

### Backfill

Eénmalig script dat over `meetings` itereert en per meeting checkt:

- Alle deelnemers (uit `participants` JSON of `raw_fireflies`) classificeren via bestaande `classifyParticipants`
- Als alle resulterende participants `is_admin = true` zijn → `UPDATE meetings SET meeting_type = 'board'`
- Geen extracties of pipeline opnieuw draaien — alleen het type updaten

`--dry-run` flag print welke meetings geüpdatet zouden worden.

### UI: Management-pagina v1

Bewust simpel. Geen visualisaties, geen analyses. Alleen:

- Header: "Management" + korte ondertitel ("Bestuurlijke overleggen tussen Stef en Wouter")
- Lijst van board-meetings, nieuwste eerst, gepagineerd (20 per keer)
- Per kaart: datum, titel, korte samenvatting (eerste 200 chars van `summary`), aantal extracties (besluiten / action items)
- Klik → bestaande `/meetings/[id]` detail

Visueel hergebruikt zoveel mogelijk van bestaande meeting-cards — geen nieuwe component-bibliotheek.

### Filter op `/meetings`

Board-meetings worden standaard **verborgen** op `/meetings`. Een extra toggle ("Toon Management") zet ze aan. Reden: de hoofd-meeting-lijst is een klantgericht overzicht; intern bestuurlijk hoort daar niet tussen.

## Prerequisites

- Profiles-tabel bestaat met `role`-kolom (✓ — sprint pre-DH-018)
- Stef en Wouter hebben `profiles.role = 'admin'` (✓ verifiëren)
- Hun e-mailadressen staan in `people.email` óf zijn al gekoppeld aan profiles via een eerdere flow (✓ verifiëren)

## Taken (per fase, elk een eigen commit)

### Fase A — Datamodel + constants

- [ ] Migratie `YYYYMMDDHHMMSS_meeting_type_board.sql`: drop + recreate `meetings_meeting_type_check` met `'board'` toegevoegd
- [ ] `packages/database/src/constants/meetings.ts`: voeg `{ value: "board", label: "Management" }` toe
- [ ] `packages/ai/src/validations/gatekeeper.ts`: voeg `"board"` toe aan `MEETING_TYPES`
- [ ] `npm run type-check` op database + ai

### Fase B — Admin-detectie in pipeline

- [ ] `packages/database/src/queries/people.ts`: `KnownPerson` shape uitbreiden met `is_admin: boolean`
- [ ] `getAllKnownPeople()` query aanpassen: LEFT JOIN op `profiles` via case-insensitive email-match, `is_admin = (profiles.role = 'admin')`
- [ ] `packages/ai/src/pipeline/participant-classifier.ts`: `ParticipantInfo` uitbreiden met `isAdmin?: boolean`, vullen vanuit `KnownPerson`
- [ ] Helper `isBoardMeeting(participants: ParticipantInfo[]): boolean` — true als `participants.length > 0 && participants.every(p => p.label === 'internal' && p.isAdmin)`

### Fase C — Gatekeeper-integratie

- [ ] `packages/ai/src/pipeline/gatekeeper-pipeline.ts`: vóór de gatekeeper-call `isBoardMeeting()` checken; zo ja, override `gatekeeperResult.meeting_type = 'board'` na de call (of skip de call en zet het direct, maar relevance_score etc. blijven gewenst)
- [ ] `packages/ai/src/agents/gatekeeper.ts`: prompt-tekst uitbreiden met `board`-beschrijving onder INTERN
- [ ] Tests in `packages/ai/__tests__/`: case "alle deelnemers admin" → `meeting_type = 'board'`; case "1 admin + 1 non-admin internal" → blijft `one_on_one`

### Fase D — Backfill-script

- [ ] `packages/ai/src/scripts/reclassify-board-meetings.ts` — leest alle meetings, classificeert participants, update `meeting_type = 'board'` waar van toepassing
- [ ] `--dry-run` flag print kandidaten zonder UPDATE
- [ ] Logging: per meeting de oude type → nieuwe type
- [ ] Documenteer aanroep in script-header: `npx tsx packages/ai/src/scripts/reclassify-board-meetings.ts [--dry-run]`

### Fase E — Query

- [ ] `packages/database/src/queries/meetings.ts`: `listBoardMeetings(options?: { limit?: number; offset?: number })` — sorted op `date` desc, alleen `meeting_type = 'board'`, alleen verified meetings
- [ ] Tests bijwerken / toevoegen in `packages/database/__tests__/queries/meetings.test.ts`

### Fase F — UI: Management-hub + pagina

- [ ] `apps/cockpit/src/app/(dashboard)/intelligence/page.tsx`: `Leadership`-card hernoemen naar `Management`, `comingSoon` weghalen, href naar `/intelligence/management`
- [ ] Nieuwe route `apps/cockpit/src/app/(dashboard)/intelligence/management/page.tsx` — lijst van board-meetings via `listBoardMeetings`
- [ ] `loading.tsx` + `error.tsx` in dezelfde folder
- [ ] `apps/cockpit/src/components/intelligence/board-meeting-card.tsx` — kaart-component (datum, titel, samenvatting, extractie-tellers)
- [ ] Oude `apps/cockpit/src/app/(dashboard)/intelligence/leadership/page.tsx` vervangen door `redirect('/intelligence/management')`

### Fase G — UI: Filter op /meetings

- [ ] `apps/cockpit/src/components/meetings/meetings-list.tsx`: board-meetings standaard filteren
- [ ] Toggle/checkbox "Toon Management" toevoegen aan filter-strip
- [ ] `meeting-type-selector.tsx` toont `Management` als optie (komt automatisch via uitgebreide constant — verifiëren)

### Fase H — Verificatie

- [ ] `npm run type-check` op cockpit, database, ai
- [ ] `npm run lint` op gewijzigde files
- [ ] Backfill draaien met `--dry-run`, output reviewen, dan echt draaien
- [ ] Handmatig: `/intelligence` → klik Management → lijst zichtbaar; klik meeting → detailpagina
- [ ] Handmatig: `/meetings` toont géén board-meetings standaard; toggle aan → ze verschijnen
- [ ] Requirements toevoegen aan `docs/specs/requirements.md`

## Acceptatiecriteria

- [ ] [DATA-060] CHECK constraint accepteert `'board'` als `meeting_type`
- [ ] [DATA-061 / DATA-062] Constants in zowel database- als ai-package bevatten `board`/`Management`
- [ ] [FUNC-038 / FUNC-040] `getAllKnownPeople()` retourneert `is_admin` correct voor Stef en Wouter
- [ ] [FUNC-039] `listBoardMeetings()` retourneert alleen `meeting_type = 'board'`, sorted desc
- [ ] [AI-012] Nieuwe meeting met alleen Stef + Wouter → `meeting_type = 'board'` na pipeline-run
- [ ] [AI-012] Meeting met Stef + Ege (member) → blijft `one_on_one` (niet board)
- [ ] [AI-013] Backfill `--dry-run` toont kandidaten; echte run update meetings; idempotent (tweede run = 0 wijzigingen)
- [ ] [UI-226] Hub-tegel "Management" zonder Coming-Soon-badge, klikbaar
- [ ] [UI-227 / UI-228] `/intelligence/management` toont board-meetings; klik op kaart → bestaande detailpagina opent
- [ ] [UI-229] Loading + error states aanwezig
- [ ] [UI-230] `/meetings` verbergt board-meetings standaard; toggle laat ze zien
- [ ] [UI-231] Edit-metadata modal toont `Management` als optie
- [ ] [UI-232] `/intelligence/leadership` redirect naar `/intelligence/management`
- [ ] Pre-existing tests groen; geen regressies in andere meeting-types

## Geraakt door deze sprint

### Nieuw

- `supabase/migrations/YYYYMMDDHHMMSS_meeting_type_board.sql`
- `packages/ai/src/scripts/reclassify-board-meetings.ts`
- `apps/cockpit/src/app/(dashboard)/intelligence/management/{page,loading,error}.tsx`
- `apps/cockpit/src/components/intelligence/board-meeting-card.tsx`

### Gewijzigd

- `packages/database/src/constants/meetings.ts`
- `packages/database/src/queries/people.ts` (KnownPerson shape + query)
- `packages/database/src/queries/meetings.ts` (`listBoardMeetings`)
- `packages/ai/src/validations/gatekeeper.ts`
- `packages/ai/src/agents/gatekeeper.ts` (prompt + ParticipantInfo)
- `packages/ai/src/pipeline/participant-classifier.ts`
- `packages/ai/src/pipeline/gatekeeper-pipeline.ts`
- `apps/cockpit/src/app/(dashboard)/intelligence/page.tsx`
- `apps/cockpit/src/app/(dashboard)/intelligence/leadership/page.tsx` (→ redirect)
- `apps/cockpit/src/components/meetings/meetings-list.tsx`
- `docs/specs/requirements.md`

## Vervolg (niet in scope, expliciet voor latere sprints)

- **Sprint 036 — Board-extractor.** Aparte extractor-prompt voor board-meetings: focus op besluiten, openstaande vragen, commitments tussen Stef/Wouter, thema-tags. Backfill-extracties op alle bestaande board-meetings.
- **Sprint 037 — Beslissingsstroom + open loops.** Eerste echte cross-meeting visualisatie: chronologische beslissingsstroom + kanban van open loops op `/intelligence/management`.
- **Sprint 038 — Thema-threads + tijdlijn.** Lanes per thema, evolutie over tijd, "rode draad"-samenvatting.
- **Sprint 039 — Cron-analyses.** Nightly job die revisits, drift, en stem-verschillen detecteert tussen board-meetings. Pas zinnig met 10+ meetings als dataset.
- **Board sub-types** (bijv. `board_strategy`, `board_financial`) — niet als hard subtype, maar als AI-thema-tag in sprint 036/038.
