# queries/inbox/

Cockpit-team Inbox cross-project queries. Eén DB, twee views (vision §3) —
deze cluster bedient de **cockpit-zijde** (alle accessible projecten).
Portal-klant ziet eigen project via aparte query-paden.

Externe consumers importeren `from "@repo/database/queries/inbox"`; de
interne file-splitsing is een implementatie-detail.

## Files

| File         | Rol                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`   | Publieke barrel.                                                                                                          |
| `types.ts`   | Public types: `InboxItem`, `InboxFilter`, `ConversationThread`, etc. + `INBOX_LIST_LIMIT`.                                |
| `helpers.ts` | Internal: query-fragmenten (`QUESTION_LIST_COLS`, `QUESTION_REPLY_EMBED`), `sortWeight`, `fetchReadMap`. Niet via barrel. |
| `list.ts`    | `listInboxItemsForTeam` + `ISSUE_STATUSES_PER_FILTER` / `QUESTION_STATUSES_PER_FILTER`.                                   |
| `counts.ts`  | `countInboxItemsForTeam` — sidebar-badge & filter-chips.                                                                  |
| `detail.ts`  | `getConversationThread` (+ auto-mark-read), `getInboxItemForDetail` (header-fetch).                                       |

## Design decisions

- **Twee parallelle SELECTs (issues, client_questions) i.p.v. SQL UNION.** Verlaagt typing-precisie en bemoeilijkt embed van replies. Mergen gebeurt JS-side, status-first sorted.
- **`filter` push naar de DB (CC-008).** Status-sets per bucket. Voor filters die één kant niet nodig hebben skipt de helper die query-side helemaal — 0 of 1 sub-query in plaats van 2.
- **`hasMore` cap = 200 per side.** UI cued de ceiling met "verfijn filter".
- **`unread` count blijft client-side.** Eén extra fetch van de full list (max 200) — PostgREST exposed FILTER-aggregaten niet zonder RPC. Move naar realtime-subscribed counter pas relevant bij >10k items.
- **Mark-as-read draait NA de fetch** (in `getConversationThread`), zodat gelijktijdige nieuwe activiteit niet ten onrechte als "gezien" gemarkeerd wordt.
- **`options.projectIds` overschrijft team-scoping in `getConversationThread`.** Portal vraagt deze query aan voor één klant-project — `listAccessibleProjectIds` zou voor klanten leeg teruggeven (team-only).

## SRP-013

Vóór SRP-013 stond alles in één `inbox.ts` (537 r, 21 exports). Splitsing volgt het cluster-criterium uit CLAUDE.md (>300 r, ≥2 sub-domeinen).
