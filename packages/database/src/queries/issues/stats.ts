import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";
import type { IssueRow } from "./detail";
import { listIssues } from "./list";

export type StatusCountKey = "triage" | "backlog" | "todo" | "in_progress" | "done" | "cancelled";

export type StatusCounts = Record<StatusCountKey, number>;

const STATUS_KEYS: readonly StatusCountKey[] = [
  "triage",
  "backlog",
  "todo",
  "in_progress",
  "done",
  "cancelled",
];

/**
 * Get issue counts per status for a project.
 *
 * Previously ran 6 separate count queries (one per status). Consolidated into
 * a single `select("status")` call and grouped in memory — one round trip
 * instead of six, which is the difference between "instant" and "visible lag"
 * for the sidebar badge.
 */
export async function getIssueCounts(
  projectId: string,
  client?: SupabaseClient,
): Promise<StatusCounts> {
  const db = client ?? getAdminClient();

  const counts: StatusCounts = {
    triage: 0,
    backlog: 0,
    todo: 0,
    in_progress: 0,
    done: 0,
    cancelled: 0,
  };

  const { data, error } = await db.from("issues").select("status").eq("project_id", projectId);

  if (error) {
    console.error("[getIssueCounts] Database error:", error.message);
    return counts;
  }

  if (!data) return counts;

  for (const row of data as { status: string }[]) {
    if ((STATUS_KEYS as readonly string[]).includes(row.status)) {
      counts[row.status as StatusCountKey]++;
    }
  }

  return counts;
}

export interface WeeklyIssueIntake {
  weekStart: string; // ISO date (YYYY-MM-DD) of the Monday the week starts on
  count: number;
}

/**
 * Issues created per week for a project, oldest → newest. Weeks are Monday-
 * aligned (UTC). Always returns `weeks` rows including zero-count weeks so the
 * chart renders a stable bar count even for quiet projects.
 */
export async function getWeeklyIssueIntake(
  projectId: string,
  weeks: number = 12,
  client?: SupabaseClient,
): Promise<WeeklyIssueIntake[]> {
  const db = client ?? getAdminClient();

  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysSinceMonday = (todayUTC.getUTCDay() + 6) % 7; // 0=Sun..6=Sat → Mon=0
  const thisMonday = new Date(todayUTC);
  thisMonday.setUTCDate(thisMonday.getUTCDate() - daysSinceMonday);

  const cutoff = new Date(thisMonday);
  cutoff.setUTCDate(cutoff.getUTCDate() - 7 * (weeks - 1));

  const buckets: WeeklyIssueIntake[] = [];
  for (let i = 0; i < weeks; i++) {
    const weekStart = new Date(cutoff);
    weekStart.setUTCDate(weekStart.getUTCDate() + i * 7);
    buckets.push({ weekStart: weekStart.toISOString().slice(0, 10), count: 0 });
  }

  const { data, error } = await db
    .from("issues")
    .select("created_at")
    .eq("project_id", projectId)
    .gte("created_at", cutoff.toISOString());

  if (error) {
    console.error("[getWeeklyIssueIntake] Database error:", error.message);
    return buckets;
  }

  const weekMs = 7 * 24 * 60 * 60 * 1000;
  for (const row of (data ?? []) as { created_at: string }[]) {
    const idx = Math.floor((new Date(row.created_at).getTime() - cutoff.getTime()) / weekMs);
    if (idx >= 0 && idx < weeks) buckets[idx].count++;
  }

  return buckets;
}

/**
 * Dashboard "Deze week" — twee buckets:
 *
 * 1. Urgent: open issues met priority IN ('urgent','high'). "Open" = status
 *    NIET in (done, cancelled). Antwoord op "wat moet deze week gebeuren".
 * 2. Active: issues met status='in_progress' (alle prio). Antwoord op
 *    "wat loopt nu".
 *
 * Een issue dat én P0/P1 én in_progress is verschijnt in beide buckets —
 * bewust, want in een stand-up wil je weten dat het brandt én dat iemand
 * er actief mee bezig is.
 *
 * Hergebruikt `listIssues`. Geen nieuwe DB-query / index nodig.
 */
export async function getDashboardThisWeek(
  projectId: string,
  client?: SupabaseClient,
): Promise<{ urgent: IssueRow[]; active: IssueRow[] }> {
  const [urgent, active] = await Promise.all([
    listIssues(
      {
        projectId,
        priority: ["urgent", "high"],
        status: ["triage", "backlog", "todo", "in_progress"],
        sort: "priority",
        limit: 50,
      },
      client,
    ),
    listIssues(
      {
        projectId,
        status: ["in_progress"],
        sort: "priority",
        limit: 50,
      },
      client,
    ),
  ]);

  return { urgent, active };
}

/**
 * Count critical issues without an assignee (open statuses only).
 */
export async function countCriticalUnassigned(
  projectId: string,
  client?: SupabaseClient,
): Promise<number> {
  const db = client ?? getAdminClient();

  const { count, error } = await db
    .from("issues")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("severity", "critical")
    .is("assigned_to", null)
    .not("status", "in", '("done","cancelled")');

  if (error) {
    console.error("[countCriticalUnassigned] Database error:", error.message);
    return 0;
  }

  return count ?? 0;
}
