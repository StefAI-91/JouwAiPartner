import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";
import { getTopicMembershipForIssues } from "../topics/linked-issues";

/**
 * Portal-facing issue-rij — alleen velden die de feedback-pagina toont.
 * Apart van `IssueRow` (zie core.ts) omdat we hier geen interne velden als
 * `assigned_to` of `priority` willen lekken naar de klant-bundle.
 */
export interface ClientIssueRow {
  id: string;
  title: string;
  type: string;
  status: string;
  decline_reason: string | null;
  issue_number: number;
  created_at: string;
  topic: { id: string; title: string } | null;
}

/**
 * Issues van één project voor de portal-feedback-timeline.
 *
 * Naamgeving "ForOrg" is een legacy van de eerste shape — feitelijk filtert
 * deze query op `project_id`. RLS borgt dat een client-rol alleen issues
 * ziet binnen z'n eigen organisatie. Caller geeft een server-side client
 * mee zodat RLS effectief is.
 *
 * Optionele `sources` filtert op `issues.source` — laat de feedback-pagina
 * alleen tonen wat de klant zelf indiende (`["portal"]`) en breidt later
 * uit naar bv. `["portal", "jaip_widget"]` zonder query-wijziging.
 *
 * Twee calls, geen PostgREST-embed: eerst issues, dan topic-membership via
 * `getTopicMembershipForIssues`. Volgt het pattern uit TH-914 (geen embed-
 * aliassen die productie-only kunnen breken).
 */
export async function listClientIssuesForOrg(
  projectId: string,
  client?: SupabaseClient,
  sources?: readonly string[],
): Promise<ClientIssueRow[]> {
  const db = client ?? getAdminClient();
  let query = db
    .from("issues")
    .select("id, title, client_title, type, status, decline_reason, issue_number, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (sources && sources.length > 0) {
    query = query.in("source", [...sources]);
  }

  const { data, error } = await query;

  if (error) throw new Error(`listClientIssuesForOrg failed: ${error.message}`);
  if (!data || data.length === 0) return [];

  const rows = data as Array<{
    id: string;
    title: string;
    client_title: string | null;
    type: string;
    status: string;
    decline_reason: string | null;
    issue_number: number;
    created_at: string;
  }>;

  const topics = await getTopicMembershipForIssues(
    rows.map((r) => r.id),
    client,
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.client_title ?? row.title,
    type: row.type,
    status: row.status,
    decline_reason: row.decline_reason,
    issue_number: row.issue_number,
    created_at: row.created_at,
    topic: topics.get(row.id) ?? null,
  }));
}
