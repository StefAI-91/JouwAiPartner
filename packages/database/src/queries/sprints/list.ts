import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

/**
 * Sprint-status. Drie waardes — handmatig gezet door het team in v1
 * (geen auto-rollup). Volgorde reflecteert de natuurlijke lifecycle:
 * planned → in_progress → delivered.
 */
export const SPRINT_STATUSES = ["planned", "in_progress", "delivered"] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];

/**
 * Volledig sprint-record. Een sprint heeft maar weinig velden in v1,
 * dus geen aparte list/detail-typing — één type voor beide views.
 */
export interface SprintRow {
  id: string;
  project_id: string;
  name: string;
  delivery_week: string;
  summary: string | null;
  client_test_instructions: string | null;
  status: SprintStatus;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export const SPRINT_COLS =
  "id, project_id, name, delivery_week, summary, client_test_instructions, status, order_index, created_at, updated_at" as const;

/**
 * Alle sprints binnen één project, gesorteerd op `order_index` zodat
 * cockpit-editor en portal-tijdlijn dezelfde volgorde tonen. Order-veld
 * ondersteunt expliciete herordening (zie `mutations/sprints/crud.ts`).
 */
export async function listSprintsByProject(
  projectId: string,
  client?: SupabaseClient,
): Promise<SprintRow[]> {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("sprints")
    .select(SPRINT_COLS)
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });

  if (error) throw new Error(`listSprintsByProject failed: ${error.message}`);
  return (data ?? []) as unknown as SprintRow[];
}

/**
 * "Huidige" sprint binnen een project = de eerste met status `in_progress`.
 * Returnt `null` als er geen actieve sprint is (alle planned of delivered).
 * Portal Briefing-banner toont alleen iets als deze niet null is.
 *
 * Bewust niet "de meest recente delivered of de eerstvolgende planned" —
 * dat zou suggereren dat er iets nu speelt terwijl het team niets actief
 * heeft staan. Liever banner weglaten dan misleidende info tonen.
 */
export async function getCurrentSprint(
  projectId: string,
  client?: SupabaseClient,
): Promise<SprintRow | null> {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("sprints")
    .select(SPRINT_COLS)
    .eq("project_id", projectId)
    .eq("status", "in_progress")
    .order("order_index", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`getCurrentSprint failed: ${error.message}`);
  return (data as unknown as SprintRow | null) ?? null;
}
