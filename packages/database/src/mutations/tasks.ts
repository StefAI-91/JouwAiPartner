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
    already_done?: boolean;
  },
  client?: SupabaseClient,
): Promise<{ success: true; id: string } | { error: string }> {
  const db = client ?? getAdminClient();
  const isDone = input.already_done === true;
  const { data, error } = await db
    .from("tasks")
    .insert({
      extraction_id: input.extraction_id,
      title: input.title,
      status: isDone ? "done" : "active",
      assigned_to: input.assigned_to ?? null,
      due_date: input.due_date ?? null,
      created_by: input.created_by,
      ...(isDone ? { completed_at: new Date().toISOString() } : {}),
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

/**
 * Snooze a task — verberg uit de actieve inbox tot `snoozed_until`.
 * Reason wordt opgeslagen als training-signaal voor Action Item Specialist
 * tuning (zie vision-doc §3.1 amendment 2026-04-28).
 */
export async function snoozeTask(
  taskId: string,
  input: {
    snoozed_until: string;
    snoozed_reason?: string | null;
  },
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db
    .from("tasks")
    .update({
      snoozed_until: input.snoozed_until,
      snoozed_reason: input.snoozed_reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Unsnooze: maak de task direct weer actief.
 */
export async function unsnoozeTask(
  taskId: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db
    .from("tasks")
    .update({
      snoozed_until: null,
      snoozed_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) return { error: error.message };
  return { success: true };
}
