"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import {
  updateMeetingTitle,
  updateMeetingType,
  updateMeetingOrganization,
  updateMeetingSummary,
  updateMeetingSummaryOnly,
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
import { buildEntityContext } from "@repo/ai/pipeline/context-injection";
import { runGatekeeper } from "@repo/ai/agents/gatekeeper";
import { runTagger } from "@repo/ai/pipeline/tagger";
import { buildSegments } from "@repo/ai/pipeline/segment-builder";
import { embedBatch } from "@repo/ai/embeddings";
import {
  insertMeetingProjectSummaries,
  updateSegmentEmbedding,
} from "@repo/database/mutations/meeting-project-summaries";
import { getIgnoredEntityNames } from "@repo/database/queries/ignored-entities";
import {
  updateTitleSchema,
  updateSummarySchema,
  updateMeetingTypeSchema,
  updateMeetingOrganizationSchema as updateOrganizationSchema,
  meetingProjectSchema,
  meetingParticipantSchema,
  createOrganizationSchema,
  createProjectSchema,
  createPersonSchema,
  regenerateSchema,
} from "@/validations/meetings";

// ── Auth Helper ──

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

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
  revalidatePath(`/review/${parsed.data.meetingId}`);
  revalidatePath("/");
  return { success: true };
}

export async function updateMeetingSummaryAction(
  input: z.infer<typeof updateSummarySchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

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

  const parsed = updateMeetingTypeSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldig meeting type" };

  const result = await updateMeetingType(parsed.data.meetingId, parsed.data.meetingType);
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

  const parsed = meetingParticipantSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const result = await unlinkMeetingParticipant(parsed.data.meetingId, parsed.data.personId);
  if ("error" in result) return result;

  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  revalidatePath(`/review/${parsed.data.meetingId}`);
  return { success: true };
}

// ── Regenerate Summary + Action Items ──

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
      `id, title, date, meeting_type, party_type, transcript, transcript_elevenlabs,
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
    meeting.meeting_participants as unknown as { person: { name: string } }[]
  ).map((mp) => mp.person.name);

  const context = {
    title: (meeting.title as string) || "Onbekend",
    meeting_type: (meeting.meeting_type as string) || "other",
    party_type: (meeting.party_type as string) || "other",
    participants,
  };

  try {
    // Step 1: Summarizer + entity context in parallel (saves ~10-15s)
    const [summarizerOutput, entityContext] = await Promise.all([
      runSummarizer(transcript, context),
      buildEntityContext(),
    ]);
    const richSummary = formatSummary(summarizerOutput);

    // Step 2: Gatekeeper + Extractor in parallel
    // Gatekeeper uses summary for project-identification
    // Extractor starts without project constraint, we'll link after
    const [gatekeeperResult, extractorOutput] = await Promise.all([
      runGatekeeper(richSummary.slice(0, 3000), {
        title: context.title,
        entityContext: entityContext.contextString,
      }),
      runExtractor(transcript, {
        ...context,
        summary: richSummary,
        meeting_date: (meeting.date as string) || new Date().toISOString().split("T")[0],
      }),
    ]);
    const identifiedProjects = gatekeeperResult.identified_projects;

    // Step 4: Save summary (safe — overwrites existing, no data loss on failure)
    const summaryResult = await updateMeetingSummary(
      meetingId,
      richSummary,
      summarizerOutput.briefing,
    );
    if ("error" in summaryResult) {
      return { error: `Summary opslaan mislukt: ${summaryResult.error}` };
    }

    // Step 5: Delete old extractions + save new ones (only after AI steps succeeded)
    const deleteResult = await deleteExtractionsByMeetingId(meetingId);
    if ("error" in deleteResult) {
      return { error: `Oude extracties verwijderen mislukt: ${deleteResult.error}` };
    }

    const saveResult = await saveExtractions(extractorOutput, meetingId, identifiedProjects);
    if (saveResult.extractions_saved === 0 && extractorOutput.extractions.length > 0) {
      return { error: "Nieuwe extracties opslaan mislukt" };
    }

    // Step 6: Tagger + segment-bouw (delete old segments first, then rebuild)
    const { data: meetingOrg } = await supabase
      .from("meetings")
      .select("organization_id")
      .eq("id", meetingId)
      .single();

    // Delete existing segments for this meeting
    await supabase.from("meeting_project_summaries").delete().eq("meeting_id", meetingId);

    if (summarizerOutput.kernpunten.length > 0 || summarizerOutput.vervolgstappen.length > 0) {
      try {
        const ignoredNames = meetingOrg?.organization_id
          ? await getIgnoredEntityNames(meetingOrg.organization_id, "project")
          : new Set<string>();

        const taggerOutput = runTagger({
          kernpunten: summarizerOutput.kernpunten,
          vervolgstappen: summarizerOutput.vervolgstappen,
          identified_projects: identifiedProjects,
          knownProjects: entityContext.projects.map((p) => ({
            id: p.id,
            name: p.name,
            aliases: p.aliases,
          })),
          ignoredNames,
        });

        const segments = buildSegments(taggerOutput);

        if (segments.length > 0) {
          const segmentRows = segments.map((s) => ({
            meeting_id: meetingId,
            project_id: s.project_id,
            project_name_raw: s.project_name_raw,
            kernpunten: s.kernpunten,
            vervolgstappen: s.vervolgstappen,
            summary_text: s.summary_text,
          }));

          const insertSegResult = await insertMeetingProjectSummaries(segmentRows);
          if (!("error" in insertSegResult)) {
            // Embed segments
            try {
              const texts = segments.map((s) => s.summary_text);
              const embeddings = await embedBatch(texts);
              await Promise.all(
                insertSegResult.ids.map((id, i) => updateSegmentEmbedding(id, embeddings[i])),
              );
            } catch (embedErr) {
              console.error("Segment embedding failed (non-blocking):", embedErr);
            }
          }
        }
      } catch (taggerErr) {
        // Graceful degradation: log error, continue
        console.error("Tagger failed during regeneration (non-blocking):", taggerErr);
      }
    }

    // Step 7: Mark meeting embedding as stale for re-embedding
    const staleResult = await markMeetingEmbeddingStale(meetingId);
    if ("error" in staleResult) {
      console.error("Failed to mark embedding stale:", staleResult.error);
    }
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
