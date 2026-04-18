import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export interface ActiveProjectWithUrgency {
  id: string;
  name: string;
  status: string;
  organization: { name: string } | null;
  deadline: string | null;
  /** Verified action_items where metadata.category = wachten_op_extern */
  waiting_on_client_count: number;
  /** All open verified action_items */
  open_action_count: number;
  /** Derived: lower = more urgent. Undefined = no urgency signal. */
  urgency_score: number;
}

/**
 * Lijst actieve projecten met urgentie-signalen voor de homepage switcher.
 * Sortering: urgent eerst (waiting_on_client_count desc, deadline asc).
 */
export async function listActiveProjectsWithUrgency(
  client?: SupabaseClient,
  options?: { limit?: number },
): Promise<ActiveProjectWithUrgency[]> {
  const db = client ?? getAdminClient();

  const { data: projects, error } = await db
    .from("projects")
    .select(
      `id, name, status, deadline,
       organization:organizations(name)`,
    )
    .in("status", ["kickoff", "in_progress", "review", "maintenance"])
    .order("updated_at", { ascending: false })
    .limit(options?.limit ?? 12);

  if (error || !projects || projects.length === 0) return [];

  const projectIds = projects.map((p) => p.id);

  const [allActionsResult, waitingResult] = await Promise.all([
    db
      .from("extractions")
      .select("project_id")
      .in("project_id", projectIds)
      .eq("type", "action_item")
      .eq("verification_status", "verified"),
    db
      .from("extractions")
      .select("project_id")
      .in("project_id", projectIds)
      .eq("type", "action_item")
      .eq("verification_status", "verified")
      .eq("metadata->>category", "wachten_op_extern"),
  ]);

  const openActionMap = new Map<string, number>();
  for (const row of allActionsResult.data ?? []) {
    if (!row.project_id) continue;
    openActionMap.set(row.project_id, (openActionMap.get(row.project_id) ?? 0) + 1);
  }

  const waitingMap = new Map<string, number>();
  for (const row of waitingResult.data ?? []) {
    if (!row.project_id) continue;
    waitingMap.set(row.project_id, (waitingMap.get(row.project_id) ?? 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const enriched = (
    projects as unknown as {
      id: string;
      name: string;
      status: string;
      deadline: string | null;
      organization: { name: string } | null;
    }[]
  ).map<ActiveProjectWithUrgency>((p) => {
    const waiting = waitingMap.get(p.id) ?? 0;
    const open = openActionMap.get(p.id) ?? 0;
    const daysToDeadline = p.deadline
      ? Math.ceil((new Date(p.deadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Urgency: lower = more urgent. Each waiting client item subtracts 100,
    // each open action 5, each day to deadline (capped at 30) adds 1.
    const deadlinePenalty =
      daysToDeadline === null ? 30 : Math.max(-30, Math.min(daysToDeadline, 30));
    const urgency_score = -waiting * 100 - open * 5 + deadlinePenalty;

    return {
      id: p.id,
      name: p.name,
      status: p.status,
      organization: p.organization,
      deadline: p.deadline,
      waiting_on_client_count: waiting,
      open_action_count: open,
      urgency_score,
    };
  });

  enriched.sort((a, b) => a.urgency_score - b.urgency_score);
  return enriched;
}
