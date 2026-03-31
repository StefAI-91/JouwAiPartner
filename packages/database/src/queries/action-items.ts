import { getAdminClient } from "../supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface OpenActionItem {
  id: string;
  description: string;
  assignee: string | null;
  due_date: string | null;
  scope: string | null;
  status: string;
}

export async function listOpenActionItems(
  limit: number = 10,
  client?: SupabaseClient,
): Promise<OpenActionItem[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("action_items")
    .select("id, description, assignee, due_date, scope, status")
    .eq("status", "open")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as OpenActionItem[];
}
