import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export interface AgentMetrics {
  agent_name: string;
  runs_today: number;
  runs_7d: number;
  last_run_at: string | null;
  last_run_status: "success" | "error" | null;
  success_rate_7d: number | null;
  total_input_tokens_today: number;
  total_output_tokens_today: number;
  total_cached_tokens_today: number;
  avg_latency_ms_7d: number | null;
  /** Snapshot van het meest-recente model dat deze agent draaide — voor pricing lookup. */
  last_model: string | null;
}

export interface AgentRunRow {
  id: string;
  created_at: string;
  agent_name: string;
  model: string;
  status: "success" | "error";
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  reasoning_tokens: number | null;
  cached_tokens: number | null;
  prompt_version: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
}

interface AgentRunAggregateRow {
  agent_name: string;
  created_at: string;
  model: string;
  status: "success" | "error";
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cached_tokens: number | null;
}

/**
 * Hard cap op het aantal rijen dat we per 7-dagen venster in JS aggregeren.
 * Boven deze grens raakt de metrics-berekening ongezond traag en krijgen
 * we ook een warn-signal dat we naar een RPC-aggregaat moeten. Supabase's
 * default row-cap is 1000 — wij zetten 'm expliciet op 50k zodat de query
 * niet stilletjes afgekapt wordt op een drukke pipeline-week.
 */
const METRICS_7D_ROW_CAP = 50_000;

/**
 * Aggregated metrics per agent over the last 7 days + today. Drives the
 * per-agent cards on the /agents page.
 *
 * Pulls the last 7 days of runs for the given agent_names en vouwt in JS.
 * Goedkoper dan 4 count-queries per agent; dataset blijft bounded door de
 * `.range()` cap — als we die raken is dat een signaal om naar een
 * server-side SUM/COUNT RPC te migreren.
 */
export async function getAgentMetrics(
  agentNames: string[],
  client?: SupabaseClient,
): Promise<AgentMetrics[]> {
  if (agentNames.length === 0) return [];

  const db = client ?? getAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayIso = startOfToday.toISOString();

  const { data, error } = await db
    .from("agent_runs")
    .select(
      "agent_name, created_at, model, status, latency_ms, input_tokens, output_tokens, cached_tokens",
    )
    .in("agent_name", agentNames)
    .gte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: false })
    .range(0, METRICS_7D_ROW_CAP - 1);

  if (error) throw new Error(`agent_runs fetch failed: ${error.message}`);

  if (data && data.length >= METRICS_7D_ROW_CAP) {
    console.warn(
      `[agent-runs] getAgentMetrics hit row cap (${METRICS_7D_ROW_CAP}). ` +
        `Metrics zijn afgekapt — overweeg migratie naar een SUM/COUNT RPC.`,
    );
  }

  const byAgent = new Map<string, AgentRunAggregateRow[]>();
  for (const name of agentNames) byAgent.set(name, []);
  for (const row of (data ?? []) as AgentRunAggregateRow[]) {
    byAgent.get(row.agent_name)?.push(row);
  }

  return agentNames.map((name) => {
    const rows = byAgent.get(name) ?? [];
    const todayRows = rows.filter((r) => r.created_at >= todayIso);
    const successCount = rows.filter((r) => r.status === "success").length;
    const latencies = rows.map((r) => r.latency_ms).filter((v): v is number => v != null);
    const lastRun = rows[0] ?? null;

    return {
      agent_name: name,
      runs_today: todayRows.length,
      runs_7d: rows.length,
      last_run_at: lastRun?.created_at ?? null,
      last_run_status: lastRun?.status ?? null,
      last_model: lastRun?.model ?? null,
      success_rate_7d: rows.length > 0 ? Math.round((successCount / rows.length) * 100) : null,
      total_input_tokens_today: todayRows.reduce((sum, r) => sum + (r.input_tokens ?? 0), 0),
      total_output_tokens_today: todayRows.reduce((sum, r) => sum + (r.output_tokens ?? 0), 0),
      total_cached_tokens_today: todayRows.reduce((sum, r) => sum + (r.cached_tokens ?? 0), 0),
      avg_latency_ms_7d:
        latencies.length > 0
          ? Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length)
          : null,
    };
  });
}

/**
 * Recent activity feed across all agents. Drives the live-activity strook
 * onderaan de /agents pagina.
 */
export async function listRecentAgentRuns(
  limit: number = 20,
  client?: SupabaseClient,
): Promise<AgentRunRow[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("agent_runs")
    .select(
      "id, created_at, agent_name, model, status, latency_ms, input_tokens, output_tokens, reasoning_tokens, cached_tokens, prompt_version, error_message, metadata",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`agent_runs feed failed: ${error.message}`);
  return (data ?? []) as AgentRunRow[];
}
