import { getAdminClient } from "../supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Update the assignment and/or due date of an action item (extraction).
 */
export async function updateActionItemAssignment(
  extractionId: string,
  updates: {
    assigned_to?: string | null;
    due_date?: string | null;
  },
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db
    .from("extractions")
    .update(updates)
    .eq("id", extractionId)
    .eq("type", "action_item");

  if (error) return { error: error.message };
  return { success: true };
}
