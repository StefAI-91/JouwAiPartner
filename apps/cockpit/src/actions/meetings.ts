"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  updateMeetingTitle,
  updateMeetingType,
  updateMeetingPartyType,
  updateMeetingOrganization,
  updateMeetingSummaryOnly,
  markMeetingEmbeddingStale,
  linkMeetingProject,
  unlinkMeetingProject,
  deleteMeeting,
} from "@repo/database/mutations/meetings";
import {
  linkMeetingParticipant,
  unlinkMeetingParticipant,
} from "@repo/database/mutations/meeting-participants";
import { getAdminClient } from "@repo/database/supabase/admin";
import {
  updateTitleSchema,
  updateSummarySchema,
  updateMeetingTypeSchema,
  updatePartyTypeSchema,
  updateMeetingOrganizationSchema as updateOrganizationSchema,
  meetingProjectSchema,
  meetingParticipantSchema,
  updateMeetingMetadataSchema,
  regenerateSchema,
} from "@repo/database/validations/meetings";
import { deleteSchema } from "@repo/database/validations/entities";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";

// ── Actions ──

export async function updateMeetingTitleAction(
  input: z.infer<typeof updateTitleSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = updateTitleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const result = await updateMeetingTitle(parsed.data.meetingId, parsed.data.title);
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  revalidatePath(`/review/${parsed.data.meetingId}`);
  revalidatePath("/");
  return { success: true };
}

export async function updateMeetingSummaryAction(
  input: z.infer<typeof updateSummarySchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = updateSummarySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const result = await updateMeetingSummaryOnly(parsed.data.meetingId, parsed.data.summary);
  if ("error" in result) return result;

  await markMeetingEmbeddingStale(parsed.data.meetingId);
  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  revalidatePath(`/review/${parsed.data.meetingId}`);
  revalidatePath("/");
  return { success: true };
}

export async function updateMeetingTypeAction(
  input: z.infer<typeof updateMeetingTypeSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = updateMeetingTypeSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldig meeting type" };

  const result = await updateMeetingType(parsed.data.meetingId, parsed.data.meetingType);
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  revalidatePath(`/review/${parsed.data.meetingId}`);
  revalidatePath("/");
  return { success: true };
}

export async function updatePartyTypeAction(
  input: z.infer<typeof updatePartyTypeSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = updatePartyTypeSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldig party type" };

  const result = await updateMeetingPartyType(parsed.data.meetingId, parsed.data.partyType);
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  revalidatePath(`/review/${parsed.data.meetingId}`);
  revalidatePath("/");
  return { success: true };
}

export async function updateMeetingOrganizationAction(
  input: z.infer<typeof updateOrganizationSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = updateOrganizationSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await updateMeetingOrganization(parsed.data.meetingId, parsed.data.organizationId);
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  revalidatePath(`/review/${parsed.data.meetingId}`);
  revalidatePath("/clients");
  return { success: true };
}

export async function linkMeetingProjectAction(
  input: z.infer<typeof meetingProjectSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = meetingProjectSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await linkMeetingProject(parsed.data.meetingId, parsed.data.projectId, "manual");
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  revalidatePath(`/review/${parsed.data.meetingId}`);
  revalidatePath("/projects");
  return { success: true };
}

export async function unlinkMeetingProjectAction(
  input: z.infer<typeof meetingProjectSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = meetingProjectSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await unlinkMeetingProject(parsed.data.meetingId, parsed.data.projectId);
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  revalidatePath(`/review/${parsed.data.meetingId}`);
  revalidatePath("/projects");
  return { success: true };
}

export async function linkMeetingParticipantAction(
  input: z.infer<typeof meetingParticipantSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = meetingParticipantSchema.safeParse(input);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return { error: `Ongeldige invoer (${fields.join(", ")})` };
  }

  const result = await linkMeetingParticipant(parsed.data.meetingId, parsed.data.personId);
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  revalidatePath(`/review/${parsed.data.meetingId}`);
  return { success: true };
}

export async function unlinkMeetingParticipantAction(
  input: z.infer<typeof meetingParticipantSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = meetingParticipantSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await unlinkMeetingParticipant(parsed.data.meetingId, parsed.data.personId);
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  revalidatePath(`/review/${parsed.data.meetingId}`);
  return { success: true };
}

// ── Update All Metadata ──

export async function updateMeetingMetadataAction(
  input: z.infer<typeof updateMeetingMetadataSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = updateMeetingMetadataSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const { meetingId, title, meetingType, partyType, organizationId, projectIds, participantIds } =
    parsed.data;

  // Fetch current links to diff
  const supabase = getAdminClient();
  const [{ data: currentProjects }, { data: currentParticipants }] = await Promise.all([
    supabase.from("meeting_projects").select("project_id").eq("meeting_id", meetingId),
    supabase.from("meeting_participants").select("person_id").eq("meeting_id", meetingId),
  ]);

  // Scalar updates in parallel
  const [titleResult, typeResult, partyResult, orgResult] = await Promise.all([
    updateMeetingTitle(meetingId, title),
    updateMeetingType(meetingId, meetingType),
    updateMeetingPartyType(meetingId, partyType),
    updateMeetingOrganization(meetingId, organizationId),
  ]);

  for (const result of [titleResult, typeResult, partyResult, orgResult]) {
    if ("error" in result) return result;
  }

  // Diff projects
  const currentProjectIds = new Set((currentProjects ?? []).map((p) => p.project_id));
  const desiredProjectIds = new Set(projectIds);
  const projectsToLink = projectIds.filter((id) => !currentProjectIds.has(id));
  const projectsToUnlink = [...currentProjectIds].filter((id) => !desiredProjectIds.has(id));

  // Diff participants
  const currentParticipantIds = new Set((currentParticipants ?? []).map((p) => p.person_id));
  const desiredParticipantIds = new Set(participantIds);
  const peopleToLink = participantIds.filter((id) => !currentParticipantIds.has(id));
  const peopleToUnlink = [...currentParticipantIds].filter((id) => !desiredParticipantIds.has(id));

  // Apply link/unlink changes in parallel
  const linkOps = [
    ...projectsToLink.map((id) => linkMeetingProject(meetingId, id, "manual")),
    ...projectsToUnlink.map((id) => unlinkMeetingProject(meetingId, id)),
    ...peopleToLink.map((id) => linkMeetingParticipant(meetingId, id)),
    ...peopleToUnlink.map((id) => unlinkMeetingParticipant(meetingId, id)),
  ];

  if (linkOps.length > 0) {
    const results = await Promise.all(linkOps);
    for (const result of results) {
      if ("error" in result) return result;
    }
  }

  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath(`/review/${meetingId}`);
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/people");
  revalidatePath("/clients");
  return { success: true };
}

export async function regenerateMeetingTitleAction(
  input: z.infer<typeof regenerateSchema>,
): Promise<{ success: true; title: string } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = regenerateSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const { getMeetingForTitleGeneration } = await import("@repo/database/queries/meetings");
  const meeting = await getMeetingForTitleGeneration(parsed.data.meetingId);
  if (!meeting) return { error: "Meeting niet gevonden" };

  const { generateMeetingTitle } = await import("@repo/ai/pipeline/generate-title");

  const orgName = meeting.organization?.name ?? null;
  const projectName = meeting.meeting_projects?.[0]?.project?.name ?? null;

  const summary = meeting.summary ?? "";
  if (!summary) return { error: "Geen samenvatting beschikbaar voor titelgeneratie" };

  const title = await generateMeetingTitle(summary, {
    meetingType: meeting.meeting_type ?? "other",
    partyType: meeting.party_type ?? "other",
    organizationName: orgName,
    projectName,
  });

  const result = await updateMeetingTitle(parsed.data.meetingId, title);
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  revalidatePath("/meetings");
  revalidatePath("/");
  return { success: true, title };
}

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
