"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import {
  generateProjectSummaries,
  generateOrgSummaries,
} from "@repo/ai/pipeline/summary-pipeline";

const regenerateSchema = z.object({
  entityType: z.enum(["project", "organization"]),
  entityId: z.string().uuid(),
});

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function regenerateSummaryAction(
  input: z.infer<typeof regenerateSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = regenerateSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const { entityType, entityId } = parsed.data;

  const result = entityType === "project"
    ? await generateProjectSummaries(entityId)
    : await generateOrgSummaries(entityId);

  if (!result.success) {
    return { error: result.error ?? "Samenvatting genereren mislukt" };
  }

  if (entityType === "project") {
    revalidatePath(`/projects/${entityId}`);
  }
  revalidatePath("/");

  return { success: true };
}
