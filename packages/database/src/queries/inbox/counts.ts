import type { SupabaseClient } from "@supabase/supabase-js";
import { listAccessibleProjectIds } from "@repo/auth/access";
import { getAdminClient } from "../../supabase/admin";
import type { InboxCounts } from "./types";
import { listInboxItemsForTeam } from "./list";

/**
 * Counts voor sidebar-badge en filter-chips. Vier kleine count-queries i.p.v.
 * de hele lijst — goedkoper want index-only.
 *
 * `unread` telt items waar nog geen read-row is OF read_at < activityAt.
 * Kan in één SQL met FILTER, maar PostgREST exposed dat niet zonder RPC.
 * Voor v1 lossen we dat client-side op (één extra fetch van de full list);
 * bij >10k items ooit: cache of move naar realtime-subscribed counter.
 */
export async function countInboxItemsForTeam(
  profileId: string,
  options: { projectId?: string } = {},
  client?: SupabaseClient,
): Promise<InboxCounts> {
  const db = client ?? getAdminClient();
  const accessibleIds = await listAccessibleProjectIds(profileId, db);
  if (accessibleIds.length === 0) {
    return { pmReview: 0, openQuestions: 0, respondedQuestions: 0, deferred: 0, unread: 0 };
  }
  const projectIds = options.projectId
    ? accessibleIds.includes(options.projectId)
      ? [options.projectId]
      : []
    : accessibleIds;
  if (projectIds.length === 0) {
    return { pmReview: 0, openQuestions: 0, respondedQuestions: 0, deferred: 0, unread: 0 };
  }

  const [pmRes, openQRes, respondedQRes, deferredRes, listResult] = await Promise.all([
    db
      .from("issues")
      .select("id", { count: "exact", head: true })
      .in("project_id", projectIds)
      .eq("status", "needs_pm_review"),
    db
      .from("client_questions")
      .select("id", { count: "exact", head: true })
      .in("project_id", projectIds)
      .is("parent_id", null)
      .eq("status", "open"),
    db
      .from("client_questions")
      .select("id", { count: "exact", head: true })
      .in("project_id", projectIds)
      .is("parent_id", null)
      .eq("status", "responded"),
    db
      .from("issues")
      .select("id", { count: "exact", head: true })
      .in("project_id", projectIds)
      .eq("status", "deferred"),
    listInboxItemsForTeam(profileId, options, db),
  ]);

  return {
    pmReview: pmRes.count ?? 0,
    openQuestions: openQRes.count ?? 0,
    respondedQuestions: respondedQRes.count ?? 0,
    deferred: deferredRes.count ?? 0,
    unread: listResult.items.filter((i) => i.isUnread).length,
  };
}
