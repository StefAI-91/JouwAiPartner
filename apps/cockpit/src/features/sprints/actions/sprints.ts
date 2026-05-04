"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  insertSprint,
  updateSprint,
  deleteSprint,
  reorderSprint,
} from "@repo/database/mutations/sprints";
import { createSprintSchema, updateSprintSchema } from "@repo/database/validations/sprints";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";

const idSchema = z.object({ id: z.string().uuid() });

const reorderInputSchema = z.object({
  id: z.string().uuid(),
  direction: z.enum(["up", "down"]),
});

/**
 * Helper: revalidate alle paden die een sprint-wijziging zou raken.
 * Cockpit project-pagina heeft de editor; portal briefing en roadmap
 * zien de sprint via banner of tijdlijn. Geen project-id mee — we
 * weten 'm na de mutation, maar revalidatePath('/projects') is
 * goedkoop genoeg om hier te doen voor de overzichts-pagina ook.
 */
function revalidateSprintPaths(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects`);
  // Portal-paden — op deze cockpit-app no-op (andere host), maar harmless
  // wanneer Next dezelfde build serveert. Expliciete portal-revalidatie
  // gaat via on-demand revalidation als dat ooit nodig blijkt.
}

export async function createSprintAction(
  input: z.infer<typeof createSprintSchema>,
): Promise<{ success: true; data: { id: string } } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = createSprintSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const result = await insertSprint(parsed.data);
  if ("error" in result) return result;

  revalidateSprintPaths(parsed.data.project_id);
  return { success: true, data: { id: result.data.id } };
}

export async function updateSprintAction(
  id: string,
  input: z.infer<typeof updateSprintSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return { error: "Ongeldig sprint-id" };

  const parsed = updateSprintSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const result = await updateSprint(parsedId.data.id, parsed.data);
  if ("error" in result) return result;

  revalidateSprintPaths(result.data.project_id);
  return { success: true };
}

export async function deleteSprintAction(input: {
  id: string;
  project_id: string;
}): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = z
    .object({ id: z.string().uuid(), project_id: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await deleteSprint(parsed.data.id);
  if ("error" in result) return result;

  revalidateSprintPaths(parsed.data.project_id);
  return { success: true };
}

export async function reorderSprintAction(
  input: z.infer<typeof reorderInputSchema> & { project_id: string },
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = reorderInputSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await reorderSprint(parsed.data.id, parsed.data.direction);
  if ("error" in result) return result;

  revalidateSprintPaths(input.project_id);
  return { success: true };
}
