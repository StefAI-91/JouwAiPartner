import { getAdminClient } from "@/lib/supabase/admin";

export interface OpenActionItem {
  id: string;
  description: string;
  assignee: string | null;
  due_date: string | null;
  scope: string | null;
  status: string;
}

export async function listOpenActionItems(limit: number = 10): Promise<OpenActionItem[]> {
  const { data, error } = await getAdminClient()
    .from("action_items")
    .select("id, description, assignee, due_date, scope, status")
    .eq("status", "open")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as OpenActionItem[];
}
