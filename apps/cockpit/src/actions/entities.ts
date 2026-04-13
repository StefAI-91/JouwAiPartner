"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { updateOrganization, deleteOrganization } from "@repo/database/mutations/organizations";
import { updateProject, deleteProject } from "@repo/database/mutations/projects";
import { updatePerson, deletePerson } from "@repo/database/mutations/people";
import {
  createExtraction,
  updateExtraction,
  deleteExtraction,
} from "@repo/database/mutations/extractions";
import { deleteMeeting } from "@repo/database/mutations/meetings";
import {
  updateOrganizationSchema,
  updateProjectSchema,
  updatePersonSchema,
  createExtractionSchema,
  updateExtractionSchema,
  deleteSchema,
  deleteWithContextSchema,
} from "@repo/database/validations/entities";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";

// ── Helpers ──

/** Convert empty strings to null to prevent uuid/url validation errors */
function cleanInput<T extends Record<string, unknown>>(input: T): T {
  const cleaned = { ...input };
  for (const key of Object.keys(cleaned)) {
    if (cleaned[key] === "") {
      (cleaned as Record<string, unknown>)[key] = null;
    }
  }
  return cleaned;
}

// ── Organization Actions ──

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

// ── Project Actions ──

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

// ── Person Actions ──

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

// ── Extraction Actions ──

export async function createExtractionAction(
  input: z.infer<typeof createExtractionSchema>,
): Promise<{ success: true; data: { id: string } } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = createExtractionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const result = await createExtraction({
    meeting_id: parsed.data.meeting_id,
    type: parsed.data.type,
    content: parsed.data.content,
    transcript_ref: parsed.data.transcript_ref ?? null,
    confidence: 1.0, // manual = full confidence
    verification_status: "verified",
  });
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meeting_id}`);
  return { success: true, data: result.data };
}

export async function updateExtractionAction(
  input: z.infer<typeof updateExtractionSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = updateExtractionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const { id, meetingId, ...data } = parsed.data;
  const result = await updateExtraction(id, data, user.id);
  if ("error" in result) return result;

  if (meetingId) {
    revalidatePath(`/meetings/${meetingId}`);
  }
  return { success: true };
}

export async function deleteExtractionAction(
  input: z.infer<typeof deleteWithContextSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = deleteWithContextSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await deleteExtraction(parsed.data.id);
  if ("error" in result) return result;

  if (parsed.data.meetingId) {
    revalidatePath(`/meetings/${parsed.data.meetingId}`);
  }
  return { success: true };
}

// ── Meeting Actions ──

export async function deleteMeetingAction(
  input: z.infer<typeof deleteSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await deleteMeeting(parsed.data.id);
  if ("error" in result) return result;

  revalidatePath("/meetings");
  revalidatePath("/review");
  revalidatePath("/");
  return { success: true };
}
