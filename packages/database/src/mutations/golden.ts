import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

/**
 * Mutations voor de Action Item golden-dataset. Schrijft naar twee tabellen:
 *   - action_item_golden_meetings (coding-state per meeting)
 *   - action_item_golden_items (per-item ground truth)
 *
 * Items kunnen alleen aangemaakt worden als de meeting-state bestaat met
 * status='coded'. Skipped meetings hebben geen items. De UI dwingt dit af,
 * maar de mutations vertrouwen op de UI — geen server-side check, want dat
 * verplaatst de business rule naar twee plekken.
 */

export interface UpsertGoldenMeetingInput {
  meeting_id: string;
  status: "coded" | "skipped";
  encoded_by: string | null;
  notes: string | null;
}

export async function upsertGoldenMeeting(
  input: UpsertGoldenMeetingInput,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db.from("action_item_golden_meetings").upsert(
    {
      meeting_id: input.meeting_id,
      status: input.status,
      encoded_by: input.encoded_by,
      notes: input.notes,
    },
    { onConflict: "meeting_id" },
  );
  if (error) return { error: error.message };
  return { success: true };
}

export interface GoldenItemInput {
  meeting_id: string;
  content: string;
  follow_up_contact: string;
  assignee: string | null;
  source_quote: string | null;
  category: "wachten_op_extern" | "wachten_op_beslissing" | null;
  deadline: string | null;
  lane: "A" | "B" | "none";
  type_werk: "A" | "B" | "C" | "D" | "E";
  project_context: string | null;
  coder_notes: string | null;
}

export async function insertGoldenItem(
  input: GoldenItemInput,
  client?: SupabaseClient,
): Promise<{ success: true; id: string } | { error: string }> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("action_item_golden_items")
    .insert(input)
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { success: true, id: data.id };
}

export async function updateGoldenItem(
  itemId: string,
  patch: Partial<Omit<GoldenItemInput, "meeting_id">>,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db.from("action_item_golden_items").update(patch).eq("id", itemId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteGoldenItem(
  itemId: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db.from("action_item_golden_items").delete().eq("id", itemId);
  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Verwijdert state én items voor een meeting. Bedoeld als "reset" knop in de UI
 * voor als de coder van voren af aan wil beginnen.
 */
export async function resetGoldenForMeeting(
  meetingId: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error: itErr } = await db
    .from("action_item_golden_items")
    .delete()
    .eq("meeting_id", meetingId);
  if (itErr) return { error: itErr.message };
  const { error: mErr } = await db
    .from("action_item_golden_meetings")
    .delete()
    .eq("meeting_id", meetingId);
  if (mErr) return { error: mErr.message };
  return { success: true };
}
