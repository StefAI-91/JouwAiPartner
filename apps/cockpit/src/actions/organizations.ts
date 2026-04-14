"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from "@repo/database/mutations/organizations";
import { updateOrganizationSchema, deleteSchema } from "@repo/database/validations/entities";
import { createOrganizationSchema } from "@repo/database/validations/meetings";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";
import { cleanInput } from "./_utils";

export async function createOrganizationAction(
  input: z.infer<typeof createOrganizationSchema>,
): Promise<{ success: true; data: { id: string; name: string } } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = createOrganizationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const result = await createOrganization({
    name: parsed.data.name,
    type: parsed.data.type,
  });
  if ("error" in result) return result;

  revalidatePath("/clients");
  return { success: true, data: result.data };
}

export async function updateOrganizationAction(
  input: z.infer<typeof updateOrganizationSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = updateOrganizationSchema.safeParse(cleanInput(input));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const { id, ...data } = parsed.data;
  const result = await updateOrganization(id, data);
  if ("error" in result) return result;

  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
  revalidatePath("/");
  return { success: true };
}

export async function deleteOrganizationAction(
  input: z.infer<typeof deleteSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await deleteOrganization(parsed.data.id);
  if ("error" in result) return result;

  revalidatePath("/clients");
  revalidatePath("/");
  return { success: true };
}
