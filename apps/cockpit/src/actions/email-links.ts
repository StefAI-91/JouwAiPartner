"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import {
  linkEmailProject,
  unlinkEmailProject,
  updateEmailOrganization,
  updateEmailType,
  updateEmailPartyType,
} from "@repo/database/mutations/emails";
import {
  emailProjectSchema,
  emailOrganizationSchema,
  emailTypeSchema,
  emailPartyTypeSchema,
} from "@/validations/email-links";

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function linkEmailProjectAction(
  input: z.infer<typeof emailProjectSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

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

export async function updateEmailTypeAction(
  input: z.infer<typeof emailTypeSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

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

  const parsed = emailPartyTypeSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await updateEmailPartyType(parsed.data.emailId, parsed.data.partyType);
  if ("error" in result) return result;

  revalidatePath(`/emails/${parsed.data.emailId}`);
  revalidatePath(`/review/email/${parsed.data.emailId}`);
  revalidatePath("/emails");
  return { success: true };
}
