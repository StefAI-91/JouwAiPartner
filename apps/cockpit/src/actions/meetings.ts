"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  updateMeetingTitle,
  updateMeetingOrganization,
  linkMeetingProject,
  unlinkMeetingProject,
} from "@repo/database/mutations/meetings";

// ── Zod Schemas ──

const updateTitleSchema = z.object({
  meetingId: z.string().uuid(),
  title: z.string().min(1, "Titel is verplicht").max(500),
});

const updateOrganizationSchema = z.object({
  meetingId: z.string().uuid(),
  organizationId: z.string().uuid().nullable(),
});

const meetingProjectSchema = z.object({
  meetingId: z.string().uuid(),
  projectId: z.string().uuid(),
});

// ── Actions ──

export async function updateMeetingTitleAction(
  input: z.infer<typeof updateTitleSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = updateTitleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const result = await updateMeetingTitle(parsed.data.meetingId, parsed.data.title);
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  revalidatePath("/");
  return { success: true };
}

export async function updateMeetingOrganizationAction(
  input: z.infer<typeof updateOrganizationSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = updateOrganizationSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await updateMeetingOrganization(parsed.data.meetingId, parsed.data.organizationId);
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  revalidatePath("/clients");
  return { success: true };
}

export async function linkMeetingProjectAction(
  input: z.infer<typeof meetingProjectSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = meetingProjectSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await linkMeetingProject(parsed.data.meetingId, parsed.data.projectId);
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  revalidatePath("/projects");
  return { success: true };
}

export async function unlinkMeetingProjectAction(
  input: z.infer<typeof meetingProjectSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = meetingProjectSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await unlinkMeetingProject(parsed.data.meetingId, parsed.data.projectId);
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  revalidatePath("/projects");
  return { success: true };
}
