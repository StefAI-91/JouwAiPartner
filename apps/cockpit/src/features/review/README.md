# Feature: Review

Verification gate — alle AI-output wordt door een mens goedgekeurd, afgewezen of bewerkt voordat het queryable waarheid wordt. Meetings-review is de primaire flow; e-mails gebruiken de `ReviewActionBar` als shared UI.

## Menu per laag

### `actions/`

Server actions voor meeting-review. Emails hebben een eigen review-action in `features/emails/actions/`.

| File        | Exports                                                                        | Gebruikt door                  |
| ----------- | ------------------------------------------------------------------------------ | ------------------------------ |
| `review.ts` | `approveMeetingAction`, `approveMeetingWithEditsAction`, `rejectMeetingAction` | `review-card`, `review-detail` |

### `components/`

UI voor review queue, review-detail en de actie-balk die meerdere review-types delen.

| File                 | Rol                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| `review-queue.tsx`   | Lijst met openstaande reviews op `/review`.                                                             |
| `empty-state.tsx`    | Getoond wanneer de queue leeg is.                                                                       |
| `review-card.tsx`    | Kaartje in de queue met snelle approve-knop.                                                            |
| `review-detail.tsx`  | Volledige review-pagina op `/review/[id]` — toont extractions, stelt bewerken toe, approve/reject flow. |
| `proposals-list.tsx` | Voorgestelde wijzigingen (bv. emerging themes) binnen de review-context.                                |

> `ReviewActionBar` (approve / edit / reject) is opgetild naar `components/shared/` (AD-001) — review-detail én email-review-detail (in features/emails/) consumeren hem daar.

### `validations/`

Zod-schemas voor de review-actions.

| File        | Exports                                                                      |
| ----------- | ---------------------------------------------------------------------------- |
| `review.ts` | `verifyMeetingSchema`, `verifyMeetingWithEditsSchema`, `rejectMeetingSchema` |

## Gerelateerde packages (NIET in deze feature)

| Pad                                  | Rol                                                               |
| ------------------------------------ | ----------------------------------------------------------------- |
| `@repo/database/mutations/review`    | `verifyMeeting`, `verifyMeetingWithEdits`, `rejectMeeting`.       |
| `@repo/database/mutations/meetings`  | `updateMeetingSummaryOnly` (gebruikt tijdens approve-with-edits). |
| `@repo/ai/pipeline/summary/triggers` | `triggerSummariesForMeeting` — draait ná approve.                 |
| `@repo/ai/scan-needs`                | `scanMeetingNeeds` — draait ná approve.                           |
| `@repo/database/validations/uuid`    | `zUuid` (basis-schema).                                           |

## Design decisions

- **`ReviewActionBar` is bewust shared tussen meetings en emails.** Emails hebben eigen approve/reject-actions in `features/emails/actions/`, maar hergebruiken deze UI. De knop kent geen domein-specifieke logica — callers geven de actions mee.
- **Emails-review heeft eigen action, meetings heeft die hier.** Historisch gegroeid: meetings-review kwam eerst en leeft hier; emails is later verticaal gebouwd binnen `features/emails/`. Niet samenvoegen tenzij er een duidelijke reden is.
- **Geen tasks-koppeling.** Review draait over extractions en AI-output, niet over action-items/tasks. Follow-ups worden apart via de horizontale tasks-action gepromoot.
