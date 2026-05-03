# Feature: Inbox

Cross-project Cockpit-inbox waarin de PM klant- en eindgebruiker-feedback endorseert vóór die de DevHub-backlog raakt, plus two-way messaging met de klant via `client_questions`.

**Design-bron:** [`/inbox-preview`](/inbox-preview) — Linear-stijl voor het overzicht, iMessage-bubbles voor de conversation-detail. Implementatie matcht de mockup.

**Vision:** [`docs/specs/vision-customer-communication.md`](../../../../../docs/specs/vision-customer-communication.md) §3, §5, §6, §9.

## Menu per laag

### `actions/`

| File           | Exports                        | Gebruikt door                                    |
| -------------- | ------------------------------ | ------------------------------------------------ |
| `pm-review.ts` | `pmReviewAction`               | `inbox-row`, `conversation-action-bar`, modals   |
| `replies.ts`   | `replyAsTeamAction`            | `conversation-reply-dock`                        |
| `compose.ts`   | `composeMessageToClientAction` | `compose-modal` (header "+ Nieuw bericht")       |
| `mark-read.ts` | `markInboxItemReadAction`      | (toekomstige UI hooks; auto-mark gaat via query) |

### `components/`

| File                          | Rol                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `inbox-page.tsx`              | Composition-root voor `/inbox` — fetch + filter + render lijst.                                     |
| `inbox-header.tsx`            | Title + count badge + filter-chips (`?filter=` URL-param).                                          |
| `inbox-list.tsx`              | Time-grouped lijst (Vandaag / Eerder deze week / Eerder) met sticky headers.                        |
| `inbox-row.tsx`               | Linear-stijl rij — status-bullet, avatar, sender+project, snippet, hover-actions, source-indicator. |
| `conversation-page.tsx`       | Composition-root voor `/inbox/[kind]/[id]` — fetch thread + auto-mark-as-read + render.             |
| `conversation-header.tsx`     | Back-knop + titel + meta + status-pill.                                                             |
| `conversation-action-bar.tsx` | 4 PM-acties — alleen voor `kind=feedback` AND `status=needs_pm_review`.                             |
| `conversation-bubbles.tsx`    | iMessage-stijl thread; eigen-bericht rechts in primary, ander links in background. Date-dividers.   |
| `conversation-reply-dock.tsx` | Vaste reply-form onderaan (alleen voor question-threads).                                           |
| `decline-modal.tsx`           | Reden-textarea met min-10-chars validatie.                                                          |
| `convert-modal.tsx`           | Verheldering-textarea (issue → bericht spawn).                                                      |
| `compose-modal.tsx`           | CC-006 — vrije compose: project-selector + body, redirect naar conversation-detail na succes.       |
| `empty-state.tsx`             | Per filter een eigen empty-message.                                                                 |

### `validations/`

| File         | Exports                                                                |
| ------------ | ---------------------------------------------------------------------- |
| `compose.ts` | `composeMessageSchema` (CC-006 — projectId + body, min 10 / max 5000). |

PM-review's `pmReviewActionSchema` wordt sinds CC-008 direct vanuit
`@repo/database/validations/issues` geïmporteerd; de lokale 1-line re-export
is verwijderd om unnecessary indirection te voorkomen.

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
- **Kind-mapping `feedback` → `issue` (CC-007).** De UI-laag (`inbox-row.tsx`) gebruikt `kind="feedback"` voor issue-items, maar `inbox_reads.item_kind` kent enkel `issue` of `question`. `markInboxItemReadAction` accepteert daarom alle drie de UI-waardes (`issue` | `feedback` | `question`) en mapt `feedback` naar `issue` net vóór de mutation. Eén bron-van-waarheid voor de UI, één voor de DB.
- **Filter via URL-param, niet client-state.** `?filter=wacht_op_mij` → bookmark-baar, SSR-stabiel, geen hydration-mismatch.
- **Bubbles tonen "ik vs anderen", niet "team vs klant".** Een team-PM ziet zijn eigen reply rechts; collega-team-replies links — net als WhatsApp/iMessage. Voorkomt het verraderlijke patroon "alles wat de andere kant zegt staat links" dat in een team-multi-author thread verwart.

## Compose-flow (team → klant)

CC-006 voegt `composeMessageToClientAction` + `compose-modal` toe. Pad bij
"+ Nieuw bericht":

1. Header rendert de knop met de pre-geladen lijst van `listAccessibleProjects`.
2. Modal valideert via `composeMessageSchema` (projectId + body min 10).
3. Action haalt `getProjectOrganizationId` op (defense-in-depth: spoofing van
   `organization_id` uit de payload is uitgesloten omdat de payload hem niet
   eens accepteert).
4. `sendQuestion` insert root-row; RLS-policy (CC-006-migratie) staat root toe
   voor team altijd.
5. `markInboxItemRead` zet eigen compose direct als gelezen, voorkomt unread-
   badge op je verzonden bericht.
6. `notifyNewTeamMessage` stuurt mail naar klant-portal-leden met deeplink
   naar `/projects/[id]/inbox/[messageId]`.
7. Modal redirect via `router.push` naar `/inbox/question/[messageId]` zodat
   PM direct in het verse gesprek staat.

Klant-side equivalent leeft in de portal-inbox-componenten +
`sendMessageAsClientAction` (zie `apps/portal/src/actions/`).

## Vrije ruimte

- AI-draft-knop in cockpit-reply komt in CC-004 (vision §6 Phase 2).
- Audit-events bij endorse/decline/defer/convert: deferred (vision §10 #4); de mutations accepteren al een `actorId`-param zodat een latere insert geen signature-break is.
