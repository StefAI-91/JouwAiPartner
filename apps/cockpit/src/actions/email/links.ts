"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  linkEmailProject,
  unlinkEmailProject,
  updateEmailOrganization,
  updateEmailSenderPerson,
  updateEmailType,
  updateEmailPartyType,
} from "@repo/database/mutations/emails";
import {
  emailProjectSchema,
  emailOrganizationSchema,
  emailSenderPersonSchema,
  emailTypeSchema,
  emailPartyTypeSchema,
} from "@/features/emails/validations";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";

export async function linkEmailProjectAction(
  input: z.infer<typeof emailProjectSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = emailProjectSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await linkEmailProject(parsed.data.emailId, parsed.data.projectId, "manual");
  if ("error" in result) return result;

  revalidatePath(`/emails/${parsed.data.emailId}`);
  revalidatePath(`/review/email/${parsed.data.emailId}`);
  revalidatePath("/emails");
  revalidatePath("/projects");
  return { success: true };
}

export async function unlinkEmailProjectAction(
  input: z.infer<typeof emailProjectSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = emailProjectSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await unlinkEmailProject(parsed.data.emailId, parsed.data.projectId);
  if ("error" in result) return result;

  revalidatePath(`/emails/${parsed.data.emailId}`);
  revalidatePath(`/review/email/${parsed.data.emailId}`);
  revalidatePath("/emails");
  revalidatePath("/projects");
  return { success: true };
}

export async function updateEmailOrganizationAction(
  input: z.infer<typeof emailOrganizationSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = emailOrganizationSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await updateEmailOrganization(parsed.data.emailId, parsed.data.organizationId);
  if ("error" in result) return result;

  revalidatePath(`/emails/${parsed.data.emailId}`);
  revalidatePath(`/review/email/${parsed.data.emailId}`);
  revalidatePath("/emails");
  revalidatePath("/clients");
  return { success: true };
}

export async function updateEmailSenderPersonAction(
  input: z.infer<typeof emailSenderPersonSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = emailSenderPersonSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await updateEmailSenderPerson(parsed.data.emailId, parsed.data.senderPersonId);
  if ("error" in result) return result;

  revalidatePath(`/emails/${parsed.data.emailId}`);
  revalidatePath(`/review/email/${parsed.data.emailId}`);
  revalidatePath("/emails");
  return { success: true };
}

export async function updateEmailTypeAction(
  input: z.infer<typeof emailTypeSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = emailTypeSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await updateEmailType(parsed.data.emailId, parsed.data.emailType);
  if ("error" in result) return result;

  revalidatePath(`/emails/${parsed.data.emailId}`);
  revalidatePath(`/review/email/${parsed.data.emailId}`);
  revalidatePath("/emails");
  return { success: true };
}

export async function updateEmailPartyTypeAction(
  input: z.infer<typeof emailPartyTypeSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = emailPartyTypeSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await updateEmailPartyType(parsed.data.emailId, parsed.data.partyType);
  if ("error" in result) return result;

  revalidatePath(`/emails/${parsed.data.emailId}`);
  revalidatePath(`/review/email/${parsed.data.emailId}`);
  revalidatePath("/emails");
  return { success: true };
}
