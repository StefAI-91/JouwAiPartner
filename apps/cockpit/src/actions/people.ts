"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createPerson, updatePerson, deletePerson } from "@repo/database/mutations/people";
import { updatePersonSchema, deleteSchema } from "@repo/database/validations/entities";
import { createPersonSchema } from "@repo/database/validations/meetings";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";
import { cleanInput } from "./_utils";

export async function createPersonAction(
  input: z.infer<typeof createPersonSchema>,
): Promise<{ success: true; data: { id: string; name: string } } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = createPersonSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const result = await createPerson({
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
    organizationId: parsed.data.organizationId,
  });
  if ("error" in result) return result;

  revalidatePath("/people");
  return { success: true, data: result.data };
}

export async function updatePersonAction(
  input: z.infer<typeof updatePersonSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = updatePersonSchema.safeParse(cleanInput(input));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const { id, ...data } = parsed.data;
  const result = await updatePerson(id, data);
  if ("error" in result) return result;

  revalidatePath(`/people/${id}`);
  revalidatePath("/people");
  return { success: true };
}

export async function deletePersonAction(
  input: z.infer<typeof deleteSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await deletePerson(parsed.data.id);
  if ("error" in result) return result;

  revalidatePath("/people");
  return { success: true };
}
