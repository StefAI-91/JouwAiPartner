/**
 * Topics — bron-van-waarheid voor lifecycle-statuses, types en de mapping
 * van een topic-status naar een portal-bucket. Alle Portal-, DevHub- en
 * pipeline-code refereert hieraan in plaats van strings te dupliceren.
 *
 * Zie prd-portal-roadmap §11.7 voor de lifecycle-state-machine en §6.5/§6.6
 * voor de bucket-strategie in de Portal-roadmap.
 */

export const TOPIC_LIFECYCLE_STATUSES = [
  "clustering",
  "awaiting_client_input",
  "prioritized",
  "scheduled",
  "in_progress",
  "done",
  "wont_do",
  "wont_do_proposed_by_client",
] as const;
export type TopicLifecycleStatus = (typeof TOPIC_LIFECYCLE_STATUSES)[number];

export const TOPIC_TYPES = ["bug", "feature"] as const;
export type TopicType = (typeof TOPIC_TYPES)[number];

export const PORTAL_BUCKETS = [
  { key: "recent_done", label: "Recent gefixt" },
  { key: "upcoming", label: "Komende week" },
  { key: "high_prio", label: "Hoge prio daarna" },
  { key: "awaiting_input", label: "Niet geprioritiseerd" },
] as const;
export type PortalBucketKey = (typeof PORTAL_BUCKETS)[number]["key"];

const RECENT_DONE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Mapping van topic-status naar portal-bucket. `clustering`, `wont_do` en
 * `wont_do_proposed_by_client` zijn voor de klant niet aan een bucket
 * toegewezen — ze worden in fase 1 verborgen op de roadmap.
 *
 * TODO (PR-002): de `upcoming`-bucket geldt strikt genomen alleen voor topics
 * met `target_sprint_id` in de huidige of volgende sprint. Die check kan niet
 * hier — sprint-context leeft op query-niveau. PR-002 voegt dat sprint-filter
 * toe in de portal-queries; deze functie blijft de status→bucket-default.
 */
export function topicStatusToBucket(
  status: TopicLifecycleStatus,
  closedAt: string | null,
): PortalBucketKey | null {
  if (status === "done") {
    if (!closedAt) return null;
    const cutoff = Date.now() - RECENT_DONE_WINDOW_MS;
    return new Date(closedAt).getTime() >= cutoff ? "recent_done" : null;
  }
  if (status === "in_progress" || status === "scheduled") return "upcoming";
  if (status === "prioritized") return "high_prio";
  if (status === "awaiting_client_input") return "awaiting_input";
  return null;
}
