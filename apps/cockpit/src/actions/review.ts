"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import {
  verifyMeeting,
  verifyMeetingWithEdits,
  rejectMeeting,
} from "@repo/database/mutations/review";
import { triggerSummariesForMeeting } from "@repo/ai/pipeline/summary-pipeline";

// ── Zod Schemas ──

const verifyMeetingSchema = z.object({
  meetingId: z.string().uuid(),
});

const verifyMeetingWithEditsSchema = z.object({
  meetingId: z.string().uuid(),
  extractionEdits: z
    .array(
      z.object({
        extractionId: z.string().uuid(),
        content: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .optional(),
  rejectedExtractionIds: z.array(z.string().uuid()).optional(),
  typeChanges: z
    .array(
      z.object({
        extractionId: z.string().uuid(),
        type: z.enum(["decision", "action_item", "need", "insight"]),
      }),
    )
    .optional(),
});

const rejectMeetingSchema = z.object({
  meetingId: z.string().uuid(),
  reason: z.string().min(1, "Reason is required"),
});

// ── Helpers ──

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// ── Actions ──

export async function approveMeetingAction(
  input: z.infer<typeof verifyMeetingSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = verifyMeetingSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const user = await getAuthenticatedUser();
  if (!user) return { error: "Unauthorized" };

  const result = await verifyMeeting(parsed.data.meetingId, user.id);
  if ("error" in result) return result;

  // Trigger summary generation in background (non-blocking)
  triggerSummariesForMeeting(parsed.data.meetingId).catch((err) =>
    console.error("[approveMeetingAction] Summary generation failed:", err),
  );

  revalidatePath("/review");
  revalidatePath("/");
  return { success: true };
}

export async function approveMeetingWithEditsAction(
  input: z.infer<typeof verifyMeetingWithEditsSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = verifyMeetingWithEditsSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const user = await getAuthenticatedUser();
  if (!user) return { error: "Unauthorized" };

  const result = await verifyMeetingWithEdits(
    parsed.data.meetingId,
    user.id,
    parsed.data.extractionEdits ?? [],
    parsed.data.rejectedExtractionIds ?? [],
    parsed.data.typeChanges ?? [],
  );
  if ("error" in result) return result;

  // Trigger summary generation in background (non-blocking)
  triggerSummariesForMeeting(parsed.data.meetingId).catch((err) =>
    console.error("[approveMeetingWithEditsAction] Summary generation failed:", err),
  );

  revalidatePath("/review");
  revalidatePath(`/review/${parsed.data.meetingId}`);
  revalidatePath("/");
  return { success: true };
}

export async function rejectMeetingAction(
  input: z.infer<typeof rejectMeetingSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = rejectMeetingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const user = await getAuthenticatedUser();
  if (!user) return { error: "Unauthorized" };

  const result = await rejectMeeting(parsed.data.meetingId, user.id, parsed.data.reason);
  if ("error" in result) return result;

  revalidatePath("/review");
  revalidatePath("/");
  return { success: true };
}
