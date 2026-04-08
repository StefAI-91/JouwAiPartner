"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import { verifyEmail, verifyEmailWithEdits, rejectEmail } from "@repo/database/mutations/emails";
import {
  verifyEmailSchema,
  verifyEmailWithEditsSchema,
  rejectEmailSchema,
} from "@/validations/email-review";

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function approveEmailAction(
  input: z.infer<typeof verifyEmailSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = verifyEmailSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const user = await getAuthenticatedUser();
  if (!user) return { error: "Unauthorized" };

  const result = await verifyEmail(parsed.data.emailId, user.id);
  if ("error" in result) return result;

  revalidatePath("/review");
  revalidatePath("/emails");
  revalidatePath("/");
  return { success: true };
}

export async function approveEmailWithEditsAction(
  input: z.infer<typeof verifyEmailWithEditsSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = verifyEmailWithEditsSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const user = await getAuthenticatedUser();
  if (!user) return { error: "Unauthorized" };

  const result = await verifyEmailWithEdits(
    parsed.data.emailId,
    user.id,
    parsed.data.extractionEdits ?? [],
    parsed.data.rejectedExtractionIds ?? [],
    parsed.data.typeChanges ?? [],
  );
  if ("error" in result) return result;

  revalidatePath("/review");
  revalidatePath(`/review/email/${parsed.data.emailId}`);
  revalidatePath("/emails");
  revalidatePath("/");
  return { success: true };
}

export async function rejectEmailAction(
  input: z.infer<typeof rejectEmailSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = rejectEmailSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const user = await getAuthenticatedUser();
  if (!user) return { error: "Unauthorized" };

  const result = await rejectEmail(parsed.data.emailId, user.id);
  if ("error" in result) return result;

  revalidatePath("/review");
  revalidatePath("/emails");
  revalidatePath("/");
  return { success: true };
}
