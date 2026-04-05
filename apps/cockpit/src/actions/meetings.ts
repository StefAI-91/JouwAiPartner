"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import {
  updateMeetingTitle,
  updateMeetingType,
  updateMeetingOrganization,
  updateMeetingSummary,
  markMeetingEmbeddingStale,
  linkMeetingProject,
  unlinkMeetingProject,
} from "@repo/database/mutations/meetings";
import { deleteExtractionsByMeetingId } from "@repo/database/mutations/extractions";
import { createOrganization } from "@repo/database/mutations/organizations";
import { createProject } from "@repo/database/mutations/projects";
import {
  linkMeetingParticipant,
  unlinkMeetingParticipant,
} from "@repo/database/mutations/meeting-participants";
import { createPerson } from "@repo/database/mutations/people";
import { getAdminClient } from "@repo/database/supabase/admin";
import { runSummarizer, formatSummary } from "@repo/ai/agents/summarizer";
import { runExtractor } from "@repo/ai/agents/extractor";
import { saveExtractions } from "@repo/ai/pipeline/save-extractions";

// ── Auth Helper ──

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// ── Zod Schemas ──

const updateTitleSchema = z.object({
  meetingId: z.string().min(1),
  title: z.string().min(1, "Titel is verplicht").max(500),
});

const updateMeetingTypeSchema = z.object({
  meetingId: z.string().min(1),
  meetingType: z.enum([
    "strategy", "one_on_one", "team_sync", "discovery",
    "sales", "project_kickoff", "status_update", "collaboration", "other",
  ]),
});

const updateOrganizationSchema = z.object({
  meetingId: z.string().min(1),
  organizationId: z.string().nullable(),
});

const meetingProjectSchema = z.object({
  meetingId: z.string().min(1),
  projectId: z.string().min(1),
});

const meetingParticipantSchema = z.object({
  meetingId: z.string().min(1),
  personId: z.string().min(1),
});

const createOrganizationSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(200),
  type: z.enum(["client", "partner", "supplier", "other"]).optional(),
});

const createProjectSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(200),
  organizationId: z.string().nullable().optional(),
});

const createPersonSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(200),
  email: z.string().email("Ongeldig e-mailadres").nullable().optional(),
  role: z.string().max(200).nullable().optional(),
  organizationId: z.string().nullable().optional(),
});

// ── Actions ──

export async function updateMeetingTitleAction(
  input: z.infer<typeof updateTitleSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = updateTitleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const result = await updateMeetingTitle(parsed.data.meetingId, parsed.data.title);
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  revalidatePath("/");
  return { success: true };
}

export async function updateMeetingTypeAction(
  input: z.infer<typeof updateMeetingTypeSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = updateMeetingTypeSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldig meeting type" };

  const result = await updateMeetingType(parsed.data.meetingId, parsed.data.meetingType);
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  revalidatePath("/");
  return { success: true };
}

export async function updateMeetingOrganizationAction(
  input: z.infer<typeof updateOrganizationSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

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
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

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
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = meetingProjectSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await unlinkMeetingProject(parsed.data.meetingId, parsed.data.projectId);
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  revalidatePath("/projects");
  return { success: true };
}

export async function linkMeetingParticipantAction(
  input: z.infer<typeof meetingParticipantSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = meetingParticipantSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(", ") };

  const result = await linkMeetingParticipant(parsed.data.meetingId, parsed.data.personId);
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  return { success: true };
}

export async function unlinkMeetingParticipantAction(
  input: z.infer<typeof meetingParticipantSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = meetingParticipantSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await unlinkMeetingParticipant(parsed.data.meetingId, parsed.data.personId);
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  return { success: true };
}

// ── Regenerate Summary + Action Items ──

const regenerateSchema = z.object({
  meetingId: z.string().min(1),
});

export async function regenerateMeetingAction(
  input: z.infer<typeof regenerateSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = regenerateSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const { meetingId } = parsed.data;

  // Fetch meeting with transcript and context
  const supabase = getAdminClient();
  const { data: meeting, error: fetchError } = await supabase
    .from("meetings")
    .select(
      `id, title, meeting_type, party_type, transcript, transcript_elevenlabs,
       meeting_participants(person:people(name))`,
    )
    .eq("id", meetingId)
    .single();

  if (fetchError || !meeting) {
    return { error: "Meeting niet gevonden" };
  }

  const transcript = (meeting.transcript_elevenlabs || meeting.transcript) as string | null;
  if (!transcript) {
    return { error: "Geen transcript beschikbaar voor deze meeting" };
  }

  const participants = (
    meeting.meeting_participants as { person: { name: string } }[]
  ).map((mp) => mp.person.name);

  const context = {
    title: (meeting.title as string) || "Onbekend",
    meeting_type: (meeting.meeting_type as string) || "other",
    party_type: (meeting.party_type as string) || "other",
    participants,
  };

  try {
    // Step 1: Regenerate summary
    const summarizerOutput = await runSummarizer(transcript, context);
    const richSummary = formatSummary(summarizerOutput);

    const summaryResult = await updateMeetingSummary(meetingId, richSummary, summarizerOutput.briefing);
    if ("error" in summaryResult) {
      return { error: `Summary opslaan mislukt: ${summaryResult.error}` };
    }

    // Step 2: Delete old extractions
    const deleteResult = await deleteExtractionsByMeetingId(meetingId);
    if ("error" in deleteResult) {
      return { error: `Oude extracties verwijderen mislukt: ${deleteResult.error}` };
    }

    // Step 3: Re-extract action items
    const extractorOutput = await runExtractor(transcript, {
      ...context,
      summary: richSummary,
    });

    // Step 4: Save new extractions
    await saveExtractions(extractorOutput, meetingId);

    // Step 5: Mark meeting embedding as stale for re-embedding
    await markMeetingEmbeddingStale(meetingId);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { error: `Regeneratie mislukt: ${errMsg}` };
  }

  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath(`/review/${meetingId}`);
  revalidatePath("/review");
  revalidatePath("/");
  return { success: true };
}

// ── Create Organization ──

export async function createOrganizationAction(
  input: z.infer<typeof createOrganizationSchema>,
): Promise<{ success: true; data: { id: string; name: string } } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

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

// ── Create Project ──

export async function createProjectAction(
  input: z.infer<typeof createProjectSchema>,
): Promise<{ success: true; data: { id: string; name: string } } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

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

// ── Create Person ──

export async function createPersonAction(
  input: z.infer<typeof createPersonSchema>,
): Promise<{ success: true; data: { id: string; name: string } } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

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
