import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export interface TaskRow {
  id: string;
  title: string;
  status: "active" | "done" | "dismissed";
  due_date: string | null;
  assigned_to: string | null;
  assigned_person: { id: string; name: string; team: string | null } | null;
  extraction_id: string | null;
  created_at: string;
  completed_at: string | null;
}

/**
 * List active tasks with their assigned person.
 */
export async function listActiveTasks(
  limit: number = 20,
  client?: SupabaseClient,
): Promise<TaskRow[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("tasks")
    .select(
      `id, title, status, due_date, assigned_to, extraction_id, created_at, completed_at,
       assigned_person:assigned_to (id, name, team)`,
    )
    .eq("status", "active")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as TaskRow[];
}

/**
 * Check if an extraction already has a promoted task.
 */
export async function hasTaskForExtraction(
  extractionId: string,
  client?: SupabaseClient,
): Promise<boolean> {
  const db = client ?? getAdminClient();
  const { count, error } = await db
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("extraction_id", extractionId)
    .neq("status", "dismissed");

  if (error) return false;
  return (count ?? 0) > 0;
}

/**
 * Get extraction IDs that already have an active/done task.
 */
export async function getPromotedExtractionIds(
  extractionIds: string[],
  client?: SupabaseClient,
): Promise<Set<string>> {
  if (extractionIds.length === 0) return new Set();
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("tasks")
    .select("extraction_id")
    .in("extraction_id", extractionIds)
    .neq("status", "dismissed");

  if (error || !data) return new Set();
  return new Set(data.map((r) => r.extraction_id).filter(Boolean) as string[]);
}

/**
 * List all tasks (active + done) for dashboard overview.
 */
export async function listAllTasks(
  limit: number = 50,
  client?: SupabaseClient,
): Promise<TaskRow[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("tasks")
    .select(
      `id, title, status, due_date, assigned_to, extraction_id, created_at, completed_at,
       assigned_person:assigned_to (id, name, team)`,
    )
    .in("status", ["active", "done"])
    .order("status", { ascending: true }) // active first
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as TaskRow[];
}

// ── Extended task type with context (for /tasks page) ──

export interface TaskRowWithContext extends TaskRow {
  extraction: {
    id: string;
    meeting_id: string;
    meeting: { id: string; title: string | null } | null;
    project: { id: string; name: string } | null;
    organization: { id: string; name: string } | null;
  } | null;
}

/**
 * List all tasks with project, organization and meeting context.
 * Used on the dedicated /tasks page.
 */
export async function listTasksWithContext(
  limit: number = 100,
  client?: SupabaseClient,
): Promise<TaskRowWithContext[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("tasks")
    .select(
      `id, title, status, due_date, assigned_to, extraction_id, created_at, completed_at,
       assigned_person:assigned_to (id, name, team),
       extraction:extraction_id (
         id, meeting_id,
         meeting:meeting_id (id, title),
         project:project_id (id, name),
         organization:organization_id (id, name)
       )`,
    )
    .in("status", ["active", "done"])
    .order("status", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as TaskRowWithContext[];
}
