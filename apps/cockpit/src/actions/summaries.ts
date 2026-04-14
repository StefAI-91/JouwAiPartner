"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { generateProjectSummaries, generateOrgSummaries } from "@repo/ai/pipeline/summary-pipeline";
import { requireAdminInAction } from "@repo/auth/access";

const regenerateSchema = z.object({
  entityType: z.enum(["project", "organization"]),
  entityId: z.string().uuid(),
});

export async function regenerateSummaryAction(
  input: z.infer<typeof regenerateSchema>,
): Promise<{ success: true } | { error: string }> {
  const auth = await requireAdminInAction();
  if ("error" in auth) return auth;

  const parsed = regenerateSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const { entityType, entityId } = parsed.data;

  const result =
    entityType === "project"
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
