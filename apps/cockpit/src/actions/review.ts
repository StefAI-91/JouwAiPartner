"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  verifyMeeting,
  verifyMeetingWithEdits,
  rejectMeeting,
} from "@repo/database/mutations/review";
import { updateMeetingSummaryOnly } from "@repo/database/mutations/meetings";
import { triggerSummariesForMeeting } from "@repo/ai/pipeline/summary-pipeline";
import { scanMeetingNeeds } from "@repo/ai/pipeline/scan-needs";
import {
  verifyMeetingSchema,
  verifyMeetingWithEditsSchema,
  rejectMeetingSchema,
} from "@/validations/review";
import { requireAdminInAction } from "@repo/auth/access";

// ── Actions ──

export async function approveMeetingAction(
  input: z.infer<typeof verifyMeetingSchema>,
): Promise<{ success: true } | { error: string }> {
  const auth = await requireAdminInAction();
  if ("error" in auth) return auth;

  const parsed = verifyMeetingSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const result = await verifyMeeting(parsed.data.meetingId, auth.user.id);
  if ("error" in result) return result;

  // Trigger summary generation + needs scan in background (non-blocking)
  triggerSummariesForMeeting(parsed.data.meetingId).catch((err) =>
    console.error("[approveMeetingAction] Summary generation failed:", err),
  );
  scanMeetingNeeds(parsed.data.meetingId).catch((err) =>
    console.error("[approveMeetingAction] Needs scan failed:", err),
  );

  revalidatePath("/review");
  revalidatePath("/intelligence/team");
  revalidatePath("/");
  return { success: true };
}

export async function approveMeetingWithEditsAction(
  input: z.infer<typeof verifyMeetingWithEditsSchema>,
): Promise<{ success: true } | { error: string }> {
  const auth = await requireAdminInAction();
  if ("error" in auth) return auth;

  const parsed = verifyMeetingWithEditsSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  // Save summary edit before verification (so it's persisted regardless)
  if (parsed.data.summaryEdit) {
    const summaryResult = await updateMeetingSummaryOnly(
      parsed.data.meetingId,
      parsed.data.summaryEdit,
    );
    if ("error" in summaryResult) return summaryResult;
  }

  const result = await verifyMeetingWithEdits(
    parsed.data.meetingId,
    auth.user.id,
    parsed.data.extractionEdits ?? [],
    parsed.data.rejectedExtractionIds ?? [],
    parsed.data.typeChanges ?? [],
  );
  if ("error" in result) return result;

  // Trigger summary generation + needs scan in background (non-blocking)
  triggerSummariesForMeeting(parsed.data.meetingId).catch((err) =>
    console.error("[approveMeetingWithEditsAction] Summary generation failed:", err),
  );
  scanMeetingNeeds(parsed.data.meetingId).catch((err) =>
    console.error("[approveMeetingWithEditsAction] Needs scan failed:", err),
  );

  revalidatePath("/review");
  revalidatePath(`/review/${parsed.data.meetingId}`);
  revalidatePath("/intelligence/team");
  revalidatePath("/");
  return { success: true };
}

export async function rejectMeetingAction(
  input: z.infer<typeof rejectMeetingSchema>,
): Promise<{ success: true } | { error: string }> {
  const auth = await requireAdminInAction();
  if ("error" in auth) return auth;

  const parsed = rejectMeetingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const result = await rejectMeeting(parsed.data.meetingId, auth.user.id);
  if ("error" in result) return result;

  revalidatePath("/review");
  revalidatePath("/");
  return { success: true };
}
