"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import { isAdmin } from "@repo/auth/access";
import { generateManagementInsights } from "@repo/ai/pipeline/management-insights-pipeline";
import { dismissInsight } from "@repo/database/mutations/management-insights";

export async function generateManagementInsightsAction(): Promise<
  { success: true } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd." };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang." };

  const result = await generateManagementInsights();

  if (!result.success) {
    return { error: result.error ?? "Genereren mislukt." };
  }

  revalidatePath("/intelligence/management");
  revalidatePath("/intelligence");
  return { success: true };
}

const dismissInsightSchema = z.object({
  insightKey: z.string().min(1),
});

export async function dismissInsightAction(
  input: z.infer<typeof dismissInsightSchema>,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd." };

  const parsed = dismissInsightSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer." };

  const result = await dismissInsight(supabase, user.id, parsed.data.insightKey);
  if ("error" in result) return result;

  revalidatePath("/intelligence/management");
  return { success: true };
}
