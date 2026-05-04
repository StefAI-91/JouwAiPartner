import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";
import { SPRINT_COLS, type SprintRow, type SprintStatus } from "../../queries/sprints/list";

export type MutationResult<T> = { success: true; data: T } | { error: string };

export interface InsertSprintData {
  project_id: string;
  name: string;
  delivery_week: string;
  summary?: string | null;
  client_test_instructions?: string | null;
  status?: SprintStatus;
  order_index?: number;
}

export interface UpdateSprintData {
  name?: string;
  delivery_week?: string;
  summary?: string | null;
  client_test_instructions?: string | null;
  status?: SprintStatus;
  order_index?: number;
}

/**
 * Nieuwe sprint. Caller (Server Action) heeft `project_id` al gevalideerd
 * via project-access check; deze laag doet alleen de insert.
 *
 * `order_index` mag mee maar default = max+1 binnen project. We bepalen
 * dat hier (één extra query) in plaats van in de Server Action zodat
 * concurrent inserts ten minste deterministisch zijn — twee sprints in
 * dezelfde milliseconde krijgen dan beide de hoogste +1, en de "↑/↓"-knop
 * kan ze daarna handmatig herordenen. Race-condities bij batch-import
 * worden v2; in v1 voegt het team sprints één-voor-één toe.
 */
export async function insertSprint(
  data: InsertSprintData,
  client?: SupabaseClient,
): Promise<MutationResult<SprintRow>> {
  const db = client ?? getAdminClient();

  let order_index = data.order_index;
  if (order_index === undefined) {
    const { data: maxRow, error: maxError } = await db
      .from("sprints")
      .select("order_index")
      .eq("project_id", data.project_id)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxError) {
      return { error: `insertSprint precheck failed: ${maxError.message}` };
    }
    order_index = (maxRow?.order_index ?? -1) + 1;
  }

  const { data: row, error } = await db
    .from("sprints")
    .insert({ ...data, order_index })
    .select(SPRINT_COLS)
    .single();

  if (error) return { error: `insertSprint failed: ${error.message}` };
  return { success: true, data: row as unknown as SprintRow };
}

export async function updateSprint(
  id: string,
  data: UpdateSprintData,
  client?: SupabaseClient,
): Promise<MutationResult<SprintRow>> {
  const db = client ?? getAdminClient();

  const { data: row, error } = await db
    .from("sprints")
    .update(data)
    .eq("id", id)
    .select(SPRINT_COLS)
    .single();

  if (error) return { error: `updateSprint failed: ${error.message}` };
  return { success: true, data: row as unknown as SprintRow };
}

/**
 * Sprint verwijderen. Topics die aan deze sprint gekoppeld zijn krijgen
 * `target_sprint_id = NULL` via de FK ON DELETE SET NULL — geen extra
 * actie hier nodig. Hun `origin` blijft staan zoals hij was; het team
 * mag handmatig naar 'production' zetten als ze het topic uit het
 * sprint-spoor willen halen.
 */
export async function deleteSprint(
  id: string,
  client?: SupabaseClient,
): Promise<MutationResult<{ id: string }>> {
  const db = client ?? getAdminClient();
  const { error } = await db.from("sprints").delete().eq("id", id);
  if (error) return { error: `deleteSprint failed: ${error.message}` };
  return { success: true, data: { id } };
}

/**
 * Verschuif een sprint één positie omhoog of omlaag. Wisselt order_index
 * met de buur in dezelfde richting. Geen-op als de sprint al aan het
 * uiteinde staat.
 *
 * Twee opeenvolgende UPDATEs zonder transactie — acceptabel voor v1
 * omdat het ergste scenario (één UPDATE slaagt, andere faalt) leidt tot
 * twee sprints met dezelfde order_index. UI sorteert dan op secondary
 * key (created_at) totdat het team opnieuw klikt. Een DB-functie of
 * RPC met expliciete BEGIN/COMMIT komt v2 als dit problemen geeft.
 */
export async function reorderSprint(
  id: string,
  direction: "up" | "down",
  client?: SupabaseClient,
): Promise<MutationResult<{ id: string }>> {
  const db = client ?? getAdminClient();

  const { data: current, error: currentError } = await db
    .from("sprints")
    .select("id, project_id, order_index")
    .eq("id", id)
    .maybeSingle();

  if (currentError) return { error: `reorderSprint lookup failed: ${currentError.message}` };
  if (!current) return { error: "Sprint niet gevonden." };

  const op = direction === "up" ? "lt" : "gt";
  const orderDir = direction === "up";

  const { data: neighbor, error: neighborError } = await db
    .from("sprints")
    .select("id, order_index")
    .eq("project_id", current.project_id)
    [op]("order_index", current.order_index)
    .order("order_index", { ascending: orderDir ? false : true })
    .limit(1)
    .maybeSingle();

  if (neighborError)
    return { error: `reorderSprint neighbor lookup failed: ${neighborError.message}` };
  if (!neighbor) return { success: true, data: { id } };

  const { error: swap1 } = await db
    .from("sprints")
    .update({ order_index: neighbor.order_index })
    .eq("id", current.id);
  if (swap1) return { error: `reorderSprint swap1 failed: ${swap1.message}` };

  const { error: swap2 } = await db
    .from("sprints")
    .update({ order_index: current.order_index })
    .eq("id", neighbor.id);
  if (swap2) return { error: `reorderSprint swap2 failed: ${swap2.message}` };

  return { success: true, data: { id } };
}
