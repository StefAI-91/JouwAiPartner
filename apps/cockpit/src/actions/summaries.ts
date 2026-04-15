"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { generateProjectSummaries, generateOrgSummaries } from "@repo/ai/pipeline/summary-pipeline";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";

const regenerateSchema = z.object({
  entityType: z.enum(["project", "organization"]),
  entityId: z.string().uuid(),
});

export async function regenerateSummaryAction(
  input: z.infer<typeof regenerateSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = regenerateSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

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
  } else {
    // Organization — briefing zichtbaar op beide detail-routes
    revalidatePath(`/clients/${entityId}`);
    revalidatePath(`/administratie/${entityId}`);
  }
  revalidatePath("/");

  return { success: true };
}
