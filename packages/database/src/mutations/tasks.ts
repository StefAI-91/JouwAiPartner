import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

/**
 * Promote an extraction to an active task.
 */
export async function createTaskFromExtraction(
  input: {
    extraction_id: string;
    title: string;
    assigned_to?: string | null;
    due_date?: string | null;
    created_by: string;
  },
  client?: SupabaseClient,
): Promise<{ success: true; id: string } | { error: string }> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("tasks")
    .insert({
      extraction_id: input.extraction_id,
      title: input.title,
      status: "active",
      assigned_to: input.assigned_to ?? null,
      due_date: input.due_date ?? null,
      created_by: input.created_by,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { success: true, id: data.id };
}

/**
 * Update task assignment, due date, or title.
 */
export async function updateTask(
  taskId: string,
  updates: {
    assigned_to?: string | null;
    due_date?: string | null;
    title?: string;
  },
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db
    .from("tasks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Mark a task as done.
 */
export async function completeTask(
  taskId: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db
    .from("tasks")
    .update({
      status: "done",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Dismiss a task (not relevant / mistake).
 */
export async function dismissTask(
  taskId: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db
    .from("tasks")
    .update({
      status: "dismissed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) return { error: error.message };
  return { success: true };
}
