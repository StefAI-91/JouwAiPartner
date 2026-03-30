"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import { insertActionItemSchema } from "@/lib/validations/action-items-action";

export async function insertActionItem(item: {
  description: string;
  assignee: string | null;
  due_date: string | null;
  scope: string;
  status: string;
  source_type: string;
  source_id: string;
  project_id: string | null;
}): Promise<{ success: true; data: { id: string } } | { error: string }> {
  const parsed = insertActionItemSchema.safeParse(item);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data, error } = await getAdminClient()
    .from("action_items")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { success: true, data: { id: data.id } };
}
