"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifyEmail, verifyEmailWithEdits, rejectEmail } from "@repo/database/mutations/emails";
import { triggerSummariesForEmail } from "@repo/ai/pipeline/summary-pipeline";
import {
  verifyEmailSchema,
  verifyEmailWithEditsSchema,
  rejectEmailSchema,
} from "@/validations/email-review";
import { requireAdminInAction } from "@repo/auth/access";

export async function approveEmailAction(
  input: z.infer<typeof verifyEmailSchema>,
): Promise<{ success: true } | { error: string }> {
  const auth = await requireAdminInAction();
  if ("error" in auth) return auth;

  const parsed = verifyEmailSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const result = await verifyEmail(parsed.data.emailId, auth.user.id);
  if ("error" in result) return result;

  // Trigger summary generation in background (non-blocking)
  triggerSummariesForEmail(parsed.data.emailId).catch((err) =>
    console.error("[approveEmailAction] Summary generation failed:", err),
  );

  revalidatePath("/review");
  revalidatePath("/emails");
  revalidatePath("/");
  return { success: true };
}

export async function approveEmailWithEditsAction(
  input: z.infer<typeof verifyEmailWithEditsSchema>,
): Promise<{ success: true } | { error: string }> {
  const auth = await requireAdminInAction();
  if ("error" in auth) return auth;

  const parsed = verifyEmailWithEditsSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const result = await verifyEmailWithEdits(
    parsed.data.emailId,
    auth.user.id,
    parsed.data.extractionEdits ?? [],
    parsed.data.rejectedExtractionIds ?? [],
    parsed.data.typeChanges ?? [],
  );
  if ("error" in result) return result;

  // Trigger summary generation in background (non-blocking)
  triggerSummariesForEmail(parsed.data.emailId).catch((err) =>
    console.error("[approveEmailWithEditsAction] Summary generation failed:", err),
  );

  revalidatePath("/review");
  revalidatePath(`/review/email/${parsed.data.emailId}`);
  revalidatePath("/emails");
  revalidatePath("/");
  return { success: true };
}

export async function rejectEmailAction(
  input: z.infer<typeof rejectEmailSchema>,
): Promise<{ success: true } | { error: string }> {
  const auth = await requireAdminInAction();
  if ("error" in auth) return auth;

  const parsed = rejectEmailSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const result = await rejectEmail(parsed.data.emailId, auth.user.id, parsed.data.reason);
  if ("error" in result) return result;

  revalidatePath("/review");
  revalidatePath("/emails");
  revalidatePath("/");
  return { success: true };
}
