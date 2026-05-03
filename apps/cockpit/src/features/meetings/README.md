# Meetings feature

Hart van het cockpit-data-in-pattern: meetings uit Fireflies komen binnen,
worden door de AI-pipeline verwerkt (summarizer → gatekeeper → tagger →
risk-specialist → theme-detector), gereviewed door admins, en voeden de
rest van het platform (dashboard, themes, projects, review-queue).

Derde verticale feature na `themes` en `emails` (migratie: 2026-04-24).
Grootste feature qua oppervlak — 20 files verdeeld over 2 lagen.

## Structuur

```
features/meetings/
  ├─ actions/        (5 files + index.ts)
  └─ components/     (15 files, GEEN index.ts)
```

**Geen hooks, geen validations in deze feature.** De Zod-schemas voor
meeting-review (`verifyMeetingSchema`, `rejectMeetingSchema`, ...) leven
in `features/review/validations/` omdat de review-action zelf daar
woont — gedeeld tussen meetings en email-review-flows.

---

## Menu — actions (server actions)

Import-pad: `@/features/meetings/actions`

### `field-updates.ts` — ad-hoc metadata wijzigingen

| Actie                                    | Wat hij doet                                 |
| ---------------------------------------- | -------------------------------------------- |
| `updateMeetingTitleAction(input)`        | titel bewerken                               |
| `updateMeetingSummaryAction(input)`      | summary-markdown bewerken                    |
| `updateMeetingTypeAction(input)`         | type zetten (client_call, internal, ...)     |
| `updatePartyTypeAction(input)`           | party-type zetten (intern/klant/partner/...) |
| `updateMeetingOrganizationAction(input)` | organisatie koppelen/ontkoppelen             |
| `linkMeetingProjectAction(input)`        | project koppelen                             |
| `unlinkMeetingProjectAction(input)`      | project ontkoppelen                          |
| `linkMeetingParticipantAction(input)`    | deelnemer koppelen                           |
| `unlinkMeetingParticipantAction(input)`  | deelnemer ontkoppelen                        |
| `updateMeetingMetadataAction(input)`     | combo-update via edit-metadata-modal         |

### `lifecycle.ts` — state-transities

| Actie                                 | Wat hij doet                        |
| ------------------------------------- | ----------------------------------- |
| `regenerateMeetingTitleAction(input)` | AI een nieuwe titel laten genereren |
| `deleteMeetingAction(input)`          | meeting verwijderen (admin-only)    |

### `regenerate-meeting.ts` — volledige pipeline-herstart

| Actie                            | Wat hij doet                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `regenerateMeetingAction(input)` | draait summarizer → gatekeeper → tagger → risk → theme-detector → link-themes opnieuw voor één meeting |

### `regenerate-risks.ts` — alleen risks

| Actie                          | Wat hij doet                                   |
| ------------------------------ | ---------------------------------------------- |
| `regenerateRisksAction(input)` | alleen de risk-specialist step opnieuw draaien |

### `regenerate-action-items.ts` — alleen action_items

| Actie                                | Wat hij doet                                          |
| ------------------------------------ | ----------------------------------------------------- |
| `regenerateActionItemsAction(input)` | alleen de action-item-specialist step opnieuw draaien |

### `reprocess-meeting.ts` — full re-ingest

| Actie                           | Wat hij doet                                  |
| ------------------------------- | --------------------------------------------- |
| `reprocessMeetingAction(input)` | raw_fireflies opnieuw door de ingest-pipeline |

### `extractions.ts` — handmatige CRUD op AI-extractions

| Actie                           | Wat hij doet                                |
| ------------------------------- | ------------------------------------------- |
| `createExtractionAction(input)` | handmatig een extraction toevoegen          |
| `updateExtractionAction(input)` | extraction-content bewerken                 |
| `deleteExtractionAction(input)` | extraction soft-deleten (met reden-context) |

Gebruikt door `add-extraction-form` en `extraction-tabs-panel` binnen deze feature.

Alle acties: admin-guard → Zod/input-check → Supabase-mutation →
revalidatePaths. Return `{ success: true }` / `{ ... data }` of
`{ error: string }`.

## Menu — components

**Geen index.ts.** Consumers importeren direct per specifieke component:

```ts
import { MeetingDetailView } from "@/features/meetings/components/meeting-detail";
```

### Top-level views

| Component           | Props                                        | Doel                            |
| ------------------- | -------------------------------------------- | ------------------------------- |
| `MeetingsList`      | `{ meetings, total }`                        | lijst op `/meetings`            |
| `MeetingDetailView` | `{ meeting, allPeople, organizations, ... }` | detail-page (transcript + tabs) |

### Metadata editors (inline)

| Component           | Props                             | Doel              |
| ------------------- | --------------------------------- | ----------------- |
| `EditMetadataModal` | `{ open, onClose, meeting, ... }` | combo-edit-dialog |

> `EditableTitle`, `MeetingTypeSelector`, `PartyTypeSelector`, `PeopleSelector`, `ProjectLinker` zijn opgetild naar `components/shared/` (AD-001) — review-pagina hergebruikt ze. Meeting-actions blijven via `@/features/meetings/actions`.

### Extraction-panel

| Component             | Props                                       | Doel                            |
| --------------------- | ------------------------------------------- | ------------------------------- |
| `ExtractionTabsPanel` | `{ extractions, meetingId, editable, ... }` | tabs: actions / decisions / ... |
| `AddExtractionForm`   | `{ meetingId, type }`                       | handmatig extraction toevoegen  |

> `RiskList` (risk-tab rendering) is opgetild naar `components/shared/` (AD-001).

### Helpers

| Component                 | Props                                         | Doel                                                                      |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| `RegenerateMenu`          | `{ meetingId }`                               | dropdown om titel/risks/themes/etc opnieuw te genereren                   |
| `CreateOrganizationModal` | `{ open, onClose, onCreated }`                | inline org-create                                                         |
| `CreatePersonSubModal`    | `{ open, onClose, onCreated, organizations }` | inline person-create                                                      |
| `CreateProjectSubModal`   | `{ open, onClose, onCreated, organizations }` | inline project-create                                                     |
| `MetadataSubModals`       | `{ ... }`                                     | container die de bovenstaande sub-modals stapelt voor edit-metadata-modal |
| `MetadataTagSelector`     | `{ tags, onChange }`                          | multi-tag picker in edit-metadata-modal                                   |

> `CopyMeetingButton` is opgetild naar `components/shared/` (AD-001).

---

## Import-patterns voor consumers

### Server components

```ts
import { MeetingsList } from "@/features/meetings/components/meetings-list";
import { listVerifiedMeetings } from "@repo/database/queries/meetings";
```

### Client components

```ts
"use client";

import { MeetingDetailView } from "@/features/meetings/components/meeting-detail";
import { updateMeetingTitleAction } from "@/features/meetings/actions";
```

### Tests (integration)

```ts
const mod = await import("@/features/meetings/actions/field-updates");
const { updateMeetingTitleAction } = mod;
```

---

## Gerelateerde packages (horizontaal, blijven daar)

Deze code hoort NIET in deze feature — wordt gedeeld door cockpit + MCP +
toekomstige apps:

| Locatie                                               | Wat                                    |
| ----------------------------------------------------- | -------------------------------------- |
| `@repo/database/queries/meetings`                     | publieke deur — alle sub-exports samen |
| `@repo/database/queries/meetings/project-summaries`   | segmenten per project (fine-grained)   |
| `@repo/database/mutations/meetings`                   | title/summary/type/metadata updates    |
| `@repo/database/mutations/meetings/participants`      | link/unlink people (fine-grained)      |
| `@repo/database/mutations/meetings/project-summaries` | segmenten schrijven (fine-grained)     |
| `@repo/database/constants/meetings`                   | `MEETING_TYPES`, `formatMeetingType`   |
| `@repo/ai/agents/summarizer`                          | summary-generator                      |
| `@repo/ai/agents/gatekeeper`                          | extraction-filter                      |
| `@repo/ai/pipeline/tagger`                            | extraction-tagger                      |
| `@repo/ai/pipeline/steps/risk-specialist`             | risk-detector step                     |
| `@repo/ai/pipeline/steps/theme-detector`              | theme-link step                        |
| `@repo/ai/pipeline/steps/link-themes`                 | theme-link writer                      |
| `@repo/ai/pipeline/lib/context-injection`             | entity-context voor prompts            |
| `@repo/ai/pipeline/lib/segment-builder`               | transcript → segmenten                 |
| `@repo/ai/embeddings`                                 | Cohere embed-batch                     |

Als je een query/mutation toevoegt voor meetings: plaats hem in packages/,
niet hier.

## Database

Schema: `meetings`, `meeting_projects`, `meeting_participants`,
`meeting_project_summaries`, `extractions`, `extraction_risks`.

Raw Fireflies payload: `meetings.raw_fireflies` (JSONB).

## Routes (blijven in app/, Next.js dicteert)

- `/meetings` — list (consumeert `MeetingsList`)
- `/meetings/[id]` — detail (consumeert `MeetingDetailView`)
- `/review/[id]` — meeting-review (consumeert 7 components uit deze feature
  via de review-detail component in `features/review/components/`)
- `/dashboard` — consumeert `recent-verified-meetings` en carousel
  (die zelf via `@repo/database/queries/meetings` draaien — geen
  component uit deze feature)

## Design decisions

### `meeting-pipeline/` is verdwenen

Vóór de migratie zaten actions verspreid over `actions/meetings/` en
`actions/meeting-pipeline/`. Binnen de feature-folder heeft die splitsing
geen meerwaarde meer — de parent-folder (`features/meetings/actions/`)
maakt de context al expliciet. Resultaat: één barrel, consumers hoeven
niet meer te kiezen tussen twee imports (regenerate-menu ging van
2 imports naar 1).

### Components géén barrel

Zelfde reden als themes: `components/meeting-detail.tsx` en enkele
selectors zijn client components die transitief server-code kunnen
raken. Per-component imports vermijden bundle-lekken in Next.js.

### Validations wonen bij de review-feature

De meeting-review schemas (`verifyMeetingSchema`, `rejectMeetingSchema`,
...) worden alleen gebruikt door de gedeelde review-action, en leven
daarom in `features/review/validations/`. Meeverhuizen naar meetings zou
duplicatie geven omdat email-review dezelfde schemas raakt.

### `meetings.raw_fireflies` blijft de bron van waarheid

`reprocessMeetingAction` draait de hele ingest-pipeline opnieuw vanuit
het originele Fireflies-payload. Geen re-fetch van de externe API —
alles komt uit onze eigen DB-kopie. Dit is een bewuste keuze: reproduce-
baarheid boven netwerk-afhankelijkheid.

---

## Tests

Locatie: `apps/cockpit/__tests__/` — review-action tests (approve/reject
flow) en ingest-pipeline tests voor Fireflies. Zie de test-folder voor
de actuele dekking.

- Geen directe tests op `features/meetings/actions/*` (field-updates,
  lifecycle, regenerate): kandidaat voor toekomstige coverage

---

## Migratie-historie

| Substap | Commit    | Wat                                                 |
| ------- | --------- | --------------------------------------------------- |
| A       | n.v.t.    | geen eigen validations of hooks om te verplaatsen   |
| B       | `298f9e8` | actions + meeting-pipeline geconsolideerd tot 1 map |
| C       | `8490d4b` | 15 components verhuisd (geen barrel)                |

Zie `.claude/skills/feature-folder-migrate/` voor het reusable draaiboek.
