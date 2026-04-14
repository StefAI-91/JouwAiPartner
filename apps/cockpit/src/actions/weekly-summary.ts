"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdminInAction } from "@repo/auth/access";
import { generateWeeklySummary } from "@repo/ai/pipeline/weekly-summary-pipeline";

const generateWeeklySummarySchema = z.object({
  weekStart: z.string().optional(),
  weekEnd: z.string().optional(),
});

export async function generateWeeklySummaryAction(
  input: z.infer<typeof generateWeeklySummarySchema>,
) {
  const auth = await requireAdminInAction();
  if ("error" in auth) return auth;

  const parsed = generateWeeklySummarySchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Ongeldige invoer." };
  }

  const result = await generateWeeklySummary(parsed.data.weekStart, parsed.data.weekEnd);

  if (!result.success) {
    return { error: result.error ?? "Genereren mislukt." };
  }

  revalidatePath("/weekly");
  return { success: true };
}
