"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdminInAction } from "@repo/auth/access";
import {
  upsertGoldenMeeting,
  insertGoldenItem,
  updateGoldenItem,
  deleteGoldenItem,
  resetGoldenForMeeting,
  type GoldenItemInput,
} from "@repo/database/mutations/golden";

/**
 * Server actions voor de Action Item golden-coding-UI op
 * `/dev/action-items/golden`. Admin-only — interne evaluatie-data.
 */

const laneSchema = z.enum(["A", "B", "none"]);
const typeWerkSchema = z.enum(["A", "B", "C", "D", "E"]);
const categorySchema = z.enum(["wachten_op_extern", "wachten_op_beslissing"]).nullable();

const itemBaseSchema = z.object({
  content: z.string().trim().min(1, "Content is verplicht").max(500),
  follow_up_contact: z.string().trim().min(1, "Follow-up contact is verplicht").max(120),
  assignee: z.string().trim().max(120).nullable(),
  source_quote: z.string().trim().max(400).nullable(),
  category: categorySchema,
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum moet YYYY-MM-DD zijn")
    .nullable(),
  lane: laneSchema,
  type_werk: typeWerkSchema,
  project_context: z.string().trim().max(200).nullable(),
  coder_notes: z.string().trim().max(1000).nullable(),
});

const upsertMeetingSchema = z.object({
  meetingId: z.string().uuid(),
  status: z.enum(["coded", "skipped"]),
  notes: z.string().trim().max(1000).nullable(),
});

const insertItemSchema = itemBaseSchema.extend({
  meetingId: z.string().uuid(),
});

const updateItemSchema = itemBaseSchema.partial().extend({
  itemId: z.string().uuid(),
});

const deleteItemSchema = z.object({
  itemId: z.string().uuid(),
});

const resetMeetingSchema = z.object({
  meetingId: z.string().uuid(),
});

function revalidateGoldenPaths(meetingId: string) {
  revalidatePath("/dev/action-items/golden");
  revalidatePath(`/dev/action-items/golden/${meetingId}`);
}

export async function upsertGoldenMeetingAction(
  input: z.input<typeof upsertMeetingSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = upsertMeetingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return { error: guard.error };

  const result = await upsertGoldenMeeting({
    meeting_id: parsed.data.meetingId,
    status: parsed.data.status,
    encoded_by: guard.user.id,
    notes: parsed.data.notes,
  });
  if ("error" in result) return result;

  revalidateGoldenPaths(parsed.data.meetingId);
  return { success: true };
}

export async function insertGoldenItemAction(
  input: z.input<typeof insertItemSchema>,
): Promise<{ success: true; id: string } | { error: string }> {
  const parsed = insertItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return { error: guard.error };

  // Zorg dat de meeting-state bestaat met status='coded' voor we items insert'en.
  // Auto-marker: eerste item op een nog-ongecodeerde meeting markeert de meeting
  // automatisch als 'coded'. Coder hoeft niet apart de status te zetten.
  const stateUpsert = await upsertGoldenMeeting({
    meeting_id: parsed.data.meetingId,
    status: "coded",
    encoded_by: guard.user.id,
    notes: null,
  });
  if ("error" in stateUpsert) return stateUpsert;

  const itemInput: GoldenItemInput = {
    meeting_id: parsed.data.meetingId,
    content: parsed.data.content,
    follow_up_contact: parsed.data.follow_up_contact,
    assignee: parsed.data.assignee,
    source_quote: parsed.data.source_quote,
    category: parsed.data.category,
    deadline: parsed.data.deadline,
    lane: parsed.data.lane,
    type_werk: parsed.data.type_werk,
    project_context: parsed.data.project_context,
    coder_notes: parsed.data.coder_notes,
  };

  const result = await insertGoldenItem(itemInput);
  if ("error" in result) return result;

  revalidateGoldenPaths(parsed.data.meetingId);
  return result;
}

export async function updateGoldenItemAction(
  input: z.input<typeof updateItemSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = updateItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return { error: guard.error };

  const { itemId, ...patch } = parsed.data;
  const result = await updateGoldenItem(itemId, patch);
  if ("error" in result) return result;

  revalidatePath("/dev/action-items/golden");
  return { success: true };
}

export async function deleteGoldenItemAction(
  input: z.input<typeof deleteItemSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = deleteItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return { error: guard.error };

  const result = await deleteGoldenItem(parsed.data.itemId);
  if ("error" in result) return result;

  revalidatePath("/dev/action-items/golden");
  return { success: true };
}

export async function resetGoldenForMeetingAction(
  input: z.input<typeof resetMeetingSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = resetMeetingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return { error: guard.error };

  const result = await resetGoldenForMeeting(parsed.data.meetingId);
  if ("error" in result) return result;

  revalidateGoldenPaths(parsed.data.meetingId);
  return { success: true };
}
