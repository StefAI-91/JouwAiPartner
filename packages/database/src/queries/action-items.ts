import { getAdminClient } from "../supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ActionItemRow {
  id: string;
  content: string;
  metadata: { assignee?: string; deadline?: string; scope?: string } | null;
  due_date: string | null;
  assigned_to: string | null;
  assigned_person: { id: string; name: string; team: string | null } | null;
  meeting: { id: string; title: string; date: string | null } | null;
  project: { id: string; name: string } | null;
  verification_status: string;
  created_at: string;
}

/**
 * List open (verified) action items with their assigned person.
 * Uses the extractions table filtered on type='action_item'.
 */
export async function listOpenActionItems(
  limit: number = 10,
  client?: SupabaseClient,
): Promise<ActionItemRow[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("extractions")
    .select(
      `id, content, metadata, due_date, assigned_to, verification_status, created_at,
       assigned_person:assigned_to (id, name, team),
       meeting:meeting_id (id, title, date),
       project:project_id (id, name)`,
    )
    .eq("type", "action_item")
    .eq("verification_status", "verified")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as ActionItemRow[];
}

/**
 * List all action items (including drafts) for a specific meeting.
 */
export async function listActionItemsByMeeting(
  meetingId: string,
  client?: SupabaseClient,
): Promise<ActionItemRow[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("extractions")
    .select(
      `id, content, metadata, due_date, assigned_to, verification_status, created_at,
       assigned_person:assigned_to (id, name, team),
       meeting:meeting_id (id, title, date),
       project:project_id (id, name)`,
    )
    .eq("type", "action_item")
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as unknown as ActionItemRow[];
}
