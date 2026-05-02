import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

/**
 * PR-022 — `listOpenQuestionsForProject`.
 *
 * Root-vragen + replies in één PostgREST-call via een nested embed op
 * `client_questions!parent_id`. Filter: alleen root (`parent_id IS NULL`)
 * met status `open` voor het opgegeven project + organisatie. Replies
 * komen mee ongeacht hun status (een reply heeft zelf geen status-
 * lifecycle — alleen de root verandert van `open` naar `responded`).
 *
 * RLS-aware: in productie wordt deze query met de page-client (cookie auth)
 * uitgevoerd; team ziet alles, klant alleen eigen org × eigen project. De
 * default-fallback naar `getAdminClient()` is voor server-only callers
 * (cron, MCP, internal tooling) die expliciet RLS willen bypassen.
 */
export interface ClientQuestionReplyRow {
  id: string;
  body: string;
  sender_profile_id: string;
  created_at: string;
}

export interface ClientQuestionListRow {
  id: string;
  body: string;
  due_date: string | null;
  status: "open" | "responded";
  created_at: string;
  responded_at: string | null;
  sender_profile_id: string;
  topic_id: string | null;
  issue_id: string | null;
  replies: ClientQuestionReplyRow[];
}

const QUESTION_LIST_COLS =
  "id, body, due_date, status, created_at, responded_at, sender_profile_id, topic_id, issue_id" as const;

const REPLY_EMBED = `replies:client_questions!parent_id (
  id, body, sender_profile_id, created_at
)` as const;

export async function listOpenQuestionsForProject(
  projectId: string,
  organizationId: string,
  client?: SupabaseClient,
): Promise<ClientQuestionListRow[]> {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("client_questions")
    .select(`${QUESTION_LIST_COLS}, ${REPLY_EMBED}`)
    .eq("project_id", projectId)
    .eq("organization_id", organizationId)
    .is("parent_id", null)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`listOpenQuestionsForProject failed: ${error.message}`);

  // Replies komen ongeordend terug uit het PostgREST-embed; sorteer op tijd
  // zodat de UI een chronologische thread kan renderen zonder zelf te sorteren.
  const rows = (data ?? []) as unknown as ClientQuestionListRow[];
  for (const row of rows) {
    row.replies = [...(row.replies ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  return rows;
}

/**
 * Count open root-questions per project — voor de portal-sidebar `Vragen (N)`.
 *
 * Eén DB-call met `in("project_id", projectIds)`; we groeperen in JS
 * (PostgREST kent geen GROUP BY zonder RPC). Bij <10 projecten per gebruiker
 * triviaal goedkoop, en RLS filtert automatisch op org-zichtbaarheid wanneer
 * de page-client (cookie auth) wordt doorgegeven.
 *
 * Returnt een `Map<projectId, number>` zodat de caller per project kan
 * lookuppen zonder extra ifs voor "geen rij" (`get` retourneert dan `undefined`,
 * caller defaultt naar 0).
 */
export async function countOpenQuestionsByProject(
  projectIds: string[],
  client?: SupabaseClient,
): Promise<Map<string, number>> {
  if (projectIds.length === 0) return new Map();
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("client_questions")
    .select("project_id")
    .in("project_id", projectIds)
    .is("parent_id", null)
    .eq("status", "open");

  if (error) throw new Error(`countOpenQuestionsByProject failed: ${error.message}`);

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as unknown as Array<{ project_id: string }>) {
    counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1);
  }
  return counts;
}

export interface ClientQuestionLookupRow {
  id: string;
  project_id: string;
  organization_id: string;
  parent_id: string | null;
  body: string;
}

/**
 * Lookup-query voor één client-vraag — bedoeld voor server-actions die ná
 * een mutation wat extra context willen (bv. notify-orchestrator die
 * project_id + body nodig heeft). Bewust kleine select: niet de volledige
 * rij + replies-embed, dat doet `listOpenQuestionsForProject`.
 */
export async function getQuestionById(
  id: string,
  client?: SupabaseClient,
): Promise<ClientQuestionLookupRow | null> {
  if (!id) return null;
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("client_questions")
    .select("id, project_id, organization_id, parent_id, body")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[getQuestionById] failed", error.message);
    return null;
  }
  return (data as ClientQuestionLookupRow) ?? null;
}
