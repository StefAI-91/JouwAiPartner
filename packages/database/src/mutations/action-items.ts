import { getAdminClient } from "../supabase/admin";

export async function insertActionItem(item: {
  description: string;
  assignee: string | null;
  due_date: string | null;
  scope: string;
  status: string;
  source_type: string;
  source_id: string;
  project_id: string | null;
}): Promise<{ success: true; id: string } | { error: string }> {
  const { data, error } = await getAdminClient()
    .from("action_items")
    .insert(item)
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { success: true, id: data.id };
}
