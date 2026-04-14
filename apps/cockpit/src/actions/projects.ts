"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createProject, updateProject, deleteProject } from "@repo/database/mutations/projects";
import { updateProjectSchema, deleteSchema } from "@repo/database/validations/entities";
import { createProjectSchema } from "@repo/database/validations/meetings";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";
import { cleanInput } from "./_utils";

export async function createProjectAction(
  input: z.infer<typeof createProjectSchema>,
): Promise<{ success: true; data: { id: string; name: string } } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const result = await createProject({
    name: parsed.data.name,
    organizationId: parsed.data.organizationId,
  });
  if ("error" in result) return result;

  revalidatePath("/projects");
  return { success: true, data: result.data };
}

export async function updateProjectAction(
  input: z.infer<typeof updateProjectSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = updateProjectSchema.safeParse(cleanInput(input));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path?.join(".") || "onbekend";
    console.error("[updateProjectAction] Validation failed:", JSON.stringify(parsed.error.issues));
    return { error: `${field}: ${issue?.message ?? "Ongeldige invoer"}` };
  }

  const { id, ...data } = parsed.data;
  const result = await updateProject(id, data);
  if ("error" in result) return result;

  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  revalidatePath("/");
  return { success: true };
}

export async function deleteProjectAction(
  input: z.infer<typeof deleteSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await deleteProject(parsed.data.id);
  if ("error" in result) return result;

  revalidatePath("/projects");
  revalidatePath("/");
  return { success: true };
}
