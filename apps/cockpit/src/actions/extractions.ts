"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  createExtraction,
  updateExtraction,
  deleteExtraction,
} from "@repo/database/mutations/extractions";
import {
  createExtractionSchema,
  updateExtractionSchema,
  deleteWithContextSchema,
} from "@repo/database/validations/entities";
import { requireAdminInAction } from "@repo/auth/access";

export async function createExtractionAction(
  input: z.infer<typeof createExtractionSchema>,
): Promise<{ success: true; data: { id: string } } | { error: string }> {
  const auth = await requireAdminInAction();
  if ("error" in auth) return auth;

  const parsed = createExtractionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const result = await createExtraction({
    meeting_id: parsed.data.meeting_id,
    type: parsed.data.type,
    content: parsed.data.content,
    transcript_ref: parsed.data.transcript_ref ?? null,
    confidence: 1.0, // manual = full confidence
    verification_status: "verified",
  });
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meeting_id}`);
  return { success: true, data: result.data };
}

export async function updateExtractionAction(
  input: z.infer<typeof updateExtractionSchema>,
): Promise<{ success: true } | { error: string }> {
  const auth = await requireAdminInAction();
  if ("error" in auth) return auth;

  const parsed = updateExtractionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const { id, meetingId, ...data } = parsed.data;
  const result = await updateExtraction(id, data, auth.user.id);
  if ("error" in result) return result;

  if (meetingId) {
    revalidatePath(`/meetings/${meetingId}`);
  }
  return { success: true };
}

export async function deleteExtractionAction(
  input: z.infer<typeof deleteWithContextSchema>,
): Promise<{ success: true } | { error: string }> {
  const auth = await requireAdminInAction();
  if ("error" in auth) return auth;

  const parsed = deleteWithContextSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await deleteExtraction(parsed.data.id);
  if ("error" in result) return result;

  if (parsed.data.meetingId) {
    revalidatePath(`/meetings/${parsed.data.meetingId}`);
  }
  return { success: true };
}
