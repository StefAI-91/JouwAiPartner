import { getAdminClient } from "@/lib/supabase/admin";

export async function insertActionItem(item: {
  description: string;
  assignee: string | null;
  due_date: string | null;
  scope: string;
  status: string;
  source_type: string;
  source_id: string;
  project_id: string | null;
}) {
  await getAdminClient().from("action_items").insert(item);
}
