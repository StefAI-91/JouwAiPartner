import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";
import { SPRINT_COLS, type SprintRow } from "./list";

/**
 * Klein topic-shape voor sprint-tijdlijn. Portal toont per sprint een
 * lijstje van gekoppelde topic-titels — geen volledige topic-payload nodig.
 */
export interface SprintTopicRow {
  id: string;
  title: string;
  client_title: string | null;
  status: string;
}

export interface SprintWithTopics extends SprintRow {
  topics: SprintTopicRow[];
}

/**
 * Eén sprint op id. Geen joins.
 */
export async function getSprintById(
  sprintId: string,
  client?: SupabaseClient,
): Promise<SprintRow | null> {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("sprints")
    .select(SPRINT_COLS)
    .eq("id", sprintId)
    .maybeSingle();

  if (error) throw new Error(`getSprintById failed: ${error.message}`);
  return (data as unknown as SprintRow | null) ?? null;
}

/**
 * Sprints van een project mét gekoppelde topics — voor de portal-tijdlijn.
 * Eén PostgREST-call met embed van topics waar `target_sprint_id` matcht.
 *
 * Bewust geen `referencedTable`-tricks — simpele embed (zie waarschuwing
 * in CLAUDE.md "Experimentele wijzigingen die niet lokaal testbaar zijn").
 */
export async function listSprintsWithTopics(
  projectId: string,
  client?: SupabaseClient,
): Promise<SprintWithTopics[]> {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("sprints")
    .select(
      `
        ${SPRINT_COLS},
        topics (id, title, client_title, status)
      `,
    )
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });

  if (error) throw new Error(`listSprintsWithTopics failed: ${error.message}`);

  type Raw = SprintRow & { topics: SprintTopicRow[] | null };
  return ((data ?? []) as unknown as Raw[]).map((row) => ({
    ...row,
    topics: row.topics ?? [],
  }));
}
