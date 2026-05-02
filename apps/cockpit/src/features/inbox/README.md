# Feature: Inbox

Cross-project Cockpit-inbox waarin de PM klant- en eindgebruiker-feedback endorseert vóór die de DevHub-backlog raakt, plus two-way messaging met de klant via `client_questions`.

**Design-bron:** [`/inbox-preview`](/inbox-preview) — Linear-stijl voor het overzicht, iMessage-bubbles voor de conversation-detail. Implementatie matcht de mockup.

**Vision:** [`docs/specs/vision-customer-communication.md`](../../../../../docs/specs/vision-customer-communication.md) §3, §5, §6, §9.

## Menu per laag

### `actions/`

| File           | Exports                   | Gebruikt door                                    |
| -------------- | ------------------------- | ------------------------------------------------ |
| `pm-review.ts` | `pmReviewAction`          | `inbox-row`, `conversation-action-bar`, modals   |
| `replies.ts`   | `replyAsTeamAction`       | `conversation-reply-dock`                        |
| `mark-read.ts` | `markInboxItemReadAction` | (toekomstige UI hooks; auto-mark gaat via query) |

### `components/`

| File                          | Rol                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| `inbox-page.tsx`              | Composition-root voor `/inbox` — fetch + filter + render lijst.                                   |
| `inbox-header.tsx`            | Title + count badge + filter-chips (`?filter=` URL-param).                                        |
| `inbox-list.tsx`              | Time-grouped lijst (Vandaag / Eerder deze week / Eerder) met sticky headers.                      |
| `inbox-row.tsx`               | Linear-stijl rij — status-bullet, avatar, sender+project, snippet, hover-actions, source-dot.     |
| `source-dot.tsx`              | Subtle bron-indicator (Klant-PM violet / Eindgebruiker oranje).                                   |
| `conversation-page.tsx`       | Composition-root voor `/inbox/[kind]/[id]` — fetch thread + auto-mark-as-read + render.           |
| `conversation-header.tsx`     | Back-knop + titel + meta + status-pill.                                                           |
| `conversation-action-bar.tsx` | 4 PM-acties — alleen voor `kind=feedback` AND `status=needs_pm_review`.                           |
| `conversation-bubbles.tsx`    | iMessage-stijl thread; eigen-bericht rechts in primary, ander links in background. Date-dividers. |
| `conversation-reply-dock.tsx` | Vaste reply-form onderaan (alleen voor question-threads).                                         |
| `decline-modal.tsx`           | Reden-textarea met min-10-chars validatie.                                                        |
| `convert-modal.tsx`           | Verheldering-textarea (issue → vraag spawn).                                                      |
| `empty-state.tsx`             | Per filter een eigen empty-message.                                                               |

### `validations/`

| File           | Exports                                                                |
| -------------- | ---------------------------------------------------------------------- |
| `pm-review.ts` | Re-export van `pmReviewActionSchema` uit `@repo/database/validations`. |

## Gerelateerde packages (NIET in deze feature)

| Pad                                         | Rol                                                                         |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| `@repo/database/queries/inbox`              | `listInboxItemsForTeam`, `countInboxItemsForTeam`, `getConversationThread`. |
| `@repo/database/mutations/issues/pm-review` | `endorseIssue`, `declineIssue`, `deferIssue`, `convertIssueToQuestion`.     |
| `@repo/database/mutations/inbox-reads`      | `markInboxItemRead` (UPSERT op `inbox_reads`).                              |
| `@repo/database/mutations/client-questions` | `replyToQuestion` (gedeeld met portal).                                     |
| `@repo/database/constants/issues`           | `defaultStatusForSource()` (PM-gate routing op ingestion).                  |

## Design decisions

- **Eén entry-point voor PM-acties.** `pmReviewAction` accepteert een discriminated union i.p.v. vier losse server-actions. Auth + revalidation zitten op één plek; voorkomt drift bij toekomstige actie-toevoegingen.
- **`replyAsTeamAction` mirror van portal `replyAsClientAction`.** Identieke mutation, andere `role: "team"`, geen portal-access-check (cockpit is team).
- **Mark-as-read implicit op detail-page.** `getConversationThread` markeert automatisch. De expliciete `markInboxItemReadAction` is voor toekomstige UI-hooks (swipe-to-read e.d.) en blijft daarom toch geëxporteerd.
- **Filter via URL-param, niet client-state.** `?filter=wacht_op_mij` → bookmark-baar, SSR-stabiel, geen hydration-mismatch.
- **Bubbles tonen "ik vs anderen", niet "team vs klant".** Een team-PM ziet zijn eigen reply rechts; collega-team-replies links — net als WhatsApp/iMessage. Voorkomt het verraderlijke patroon "alles wat de andere kant zegt staat links" dat in een team-multi-author thread verwart.

## Vrije ruimte

- Compose-knop ("+ Nieuw bericht") komt in CC-006.
- AI-draft-knop in cockpit-reply komt in CC-004 (vision §6 Phase 2).
- Per-project inbox-tab (`/projects/[id]/inbox`) komt in CC-005.
- Audit-events bij endorse/decline/defer/convert: deferred (vision §10 #4); de mutations accepteren al een `actorId`-param zodat een latere insert geen signature-break is.
