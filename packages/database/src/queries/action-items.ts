import { getAdminClient } from "../supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ActionItemRow {
  id: string;
  content: string;
  metadata: { assignee?: string; deadline?: string; scope?: string } | null;
  meeting: { id: string; title: string; date: string | null } | null;
  project: { id: string; name: string } | null;
  verification_status: string;
  created_at: string;
}

/**
 * List verified action item extractions from meetings.
 * These are raw AI-extracted items, not promoted tasks.
 */
export async function listVerifiedActionItems(
  limit: number = 20,
  client?: SupabaseClient,
): Promise<ActionItemRow[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("extractions")
    .select(
      `id, content, metadata, verification_status, created_at,
       meeting:meeting_id (id, title, date),
       project:project_id (id, name)`,
    )
    .eq("type", "action_item")
    .eq("verification_status", "verified")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as ActionItemRow[];
}
