import type { InboxItem } from "./types";

// Internal helpers gedeeld door list/counts/detail. Niet via de publieke barrel.

export interface ReadRow {
  item_kind: "issue" | "question";
  item_id: string;
  read_at: string;
}

export const QUESTION_LIST_COLS =
  "id, project_id, organization_id, sender_profile_id, body, status, created_at, last_activity_at" as const;

export const QUESTION_REPLY_EMBED = `replies:client_questions!parent_id (
  id, body, sender_profile_id, created_at
)` as const;

// Status-first sort weight. Lager = hoger in de lijst. Vision §9 — items die
// op de PM wachten staan altijd bovenaan, parked items onderaan. `responded`
// staat hoog (klant antwoordde, team moet acteren); `open` staat laag (team
// stuurde, wacht op klant — geen actie voor team).
export function sortWeight(item: InboxItem): number {
  if (item.kind === "feedback") {
    if (item.issue.status === "needs_pm_review") return 0;
    if (item.issue.status === "deferred") return 3;
    return 2;
  }
  // question
  return item.thread.status === "responded" ? 1 : 4;
}

export function fetchReadMap(rows: ReadRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of rows) {
    map.set(`${r.item_kind}:${r.item_id}`, r.read_at);
  }
  return map;
}
