import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

/**
 * Get the sync cursor for Userback incremental sync.
 * Returns the most recent userback_modified_at date, or null for first sync.
 *
 * Uses updated_at DESC + LIMIT 1 as a proxy — Userback issues are updated
 * during sync, so the most recently updated row has the latest cursor.
 */
export async function getUserbackSyncCursor(client?: SupabaseClient): Promise<string | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("issues")
    .select("source_metadata")
    .eq("source", "userback")
    .not("source_metadata", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return null;

  const meta = data[0].source_metadata as Record<string, unknown> | null;
  return (meta?.userback_modified_at as string) ?? null;
}

/**
 * Get existing userback_ids for dedup check.
 * Returns a Map of userback_id -> issue id.
 */
export async function getExistingUserbackIds(
  userbackIds: string[],
  client?: SupabaseClient,
): Promise<Map<string, string>> {
  if (userbackIds.length === 0) return new Map();
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("issues")
    .select("id, userback_id")
    .in("userback_id", userbackIds);

  if (error || !data) return new Map();

  const map = new Map<string, string>();
  for (const row of data) {
    if (row.userback_id) map.set(row.userback_id, row.id);
  }
  return map;
}

/**
 * Count total userback issues for a project.
 */
export async function countUserbackIssues(
  projectId: string,
  client?: SupabaseClient,
): Promise<number> {
  const db = client ?? getAdminClient();
  const { count, error } = await db
    .from("issues")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("source", "userback");

  if (error) return 0;
  return count ?? 0;
}

/**
 * List Userback issues that have source_metadata (for media backfill).
 */
export async function listUserbackIssuesForBackfill(
  client?: SupabaseClient,
): Promise<
  { id: string; userback_id: string | null; source_metadata: Record<string, unknown> | null }[]
> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("issues")
    .select("id, userback_id, source_metadata")
    .eq("source", "userback")
    .not("userback_id", "is", null)
    .not("source_metadata", "is", null);

  if (error) {
    console.error("[listUserbackIssuesForBackfill] Database error:", error.message);
    return [];
  }
  return (data ?? []) as {
    id: string;
    userback_id: string | null;
    source_metadata: Record<string, unknown> | null;
  }[];
}
