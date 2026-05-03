/**
 * Publieke deur voor de inbox-cluster. Externe consumers importeren
 * `from "@repo/database/queries/inbox"` — de splitsing in types/list/
 * counts/detail is intern en hoeft niet bekend te zijn.
 *
 * SRP-013 splitste de oude flat `queries/inbox.ts` (537 r) op in:
 *   - types.ts    — public types + INBOX_LIST_LIMIT
 *   - helpers.ts  — internal helpers (niet via barrel)
 *   - list.ts     — listInboxItemsForTeam + filter-statussen
 *   - counts.ts   — countInboxItemsForTeam
 *   - detail.ts   — getConversationThread, getInboxItemForDetail
 */

export * from "./types";
export {
  ISSUE_STATUSES_PER_FILTER,
  QUESTION_STATUSES_PER_FILTER,
  listInboxItemsForTeam,
} from "./list";
export { countInboxItemsForTeam } from "./counts";
export { getConversationThread, getInboxItemForDetail } from "./detail";
