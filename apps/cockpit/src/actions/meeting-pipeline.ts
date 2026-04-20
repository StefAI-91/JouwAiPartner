"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  updateMeetingSummary,
  updateMeetingTitle,
  markMeetingEmbeddingStale,
  deleteMeeting,
  parkMeetingForReprocess,
  restoreParkedMeeting,
} from "@repo/database/mutations/meetings";
import {
  getMeetingForRegenerate,
  getMeetingForRegenerateRisks,
  getMeetingForReprocess,
  getMeetingOrganizationId,
} from "@repo/database/queries/meetings";
import { runSummarizer, formatSummary } from "@repo/ai/agents/summarizer";
import { runRiskSpecialistStep } from "@repo/ai/pipeline/steps/risk-specialist";
import { buildEntityContext } from "@repo/ai/pipeline/context-injection";
import { runGatekeeper } from "@repo/ai/agents/gatekeeper";
import { runTagger } from "@repo/ai/pipeline/tagger";
import { buildSegments } from "@repo/ai/pipeline/segment-builder";
import { embedBatch } from "@repo/ai/embeddings";
import {
  insertMeetingProjectSummaries,
  updateSegmentEmbedding,
  deleteSegmentsByMeetingId,
} from "@repo/database/mutations/meeting-project-summaries";
import { getIgnoredEntityNames } from "@repo/database/queries/ignored-entities";
import { regenerateSchema } from "@repo/database/validations/meetings";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";

// ── Regenerate Summary + Action Items ──

export async function regenerateMeetingAction(
  input: z.infer<typeof regenerateSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = regenerateSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const { meetingId } = parsed.data;

  // Fetch meeting with transcript and context
  const meeting = await getMeetingForRegenerate(meetingId);
  if (!meeting) {
    return { error: "Meeting niet gevonden" };
  }

  const transcript = meeting.transcript_elevenlabs || meeting.transcript;
  if (!transcript) {
    return { error: "Geen transcript beschikbaar voor deze meeting" };
  }

  const participants = meeting.meeting_participants.map((mp) => mp.person.name);

  const context = {
    title: meeting.title || "Onbekend",
    meeting_type: meeting.meeting_type || "other",
    party_type: meeting.party_type || "other",
    participants,
  };

  try {
    // Step 1: Build entity context FIRST so the Summarizer can use known project
    // names/aliases for its [ProjectNaam] prefix on thema-koppen and vervolgstappen
    // (sprint 035: AI-062). Previously this ran parallel with runSummarizer, which
    // meant Sonnet had no project list and fell back to Algemeen too often.
    const entityContext = await buildEntityContext();

    // Step 2: Summarizer — now receives entityContext so prefixes match known projects.
    const summarizerOutput = await runSummarizer(transcript, {
      ...context,
      entityContext: entityContext.contextString,
    });
    const richSummary = formatSummary(summarizerOutput);

    // Step 3: Gatekeeper (projecten + meta). Extractor is vervangen door
    // RiskSpecialist — die draait hieronder als een aparte stap omdat hij
    // de identified_projects van de Gatekeeper nodig heeft voor het
    // mappen van project_id op z'n rij.
    const gatekeeperResult = await runGatekeeper(richSummary.slice(0, 3000), {
      title: context.title,
      entityContext: entityContext.contextString,
    });
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

    // Step 4b: Regenerate title based on new summary
    try {
      const { generateMeetingTitle } = await import("@repo/ai/pipeline/generate-title");
      const { getMeetingForTitleGeneration } = await import("@repo/database/queries/meetings");
      const meetingContext = await getMeetingForTitleGeneration(meetingId);

      if (meetingContext) {
        const generatedTitle = await generateMeetingTitle(richSummary, {
          meetingType: meetingContext.meeting_type || "other",
          partyType: meetingContext.party_type || "other",
          organizationName: meetingContext.organization?.name ?? null,
          projectName: meetingContext.meeting_projects?.[0]?.project?.name ?? null,
        });
        await updateMeetingTitle(meetingId, generatedTitle);
      }
    } catch (titleErr) {
      // Non-blocking: title generation failure should not stop regeneration
      console.error("Title generation failed during regeneration (non-blocking):", titleErr);
    }

    // Step 5: RiskSpecialist — vervangt de legacy Extractor. Draait ook
    // de audit-insert naar `experimental_risk_extractions` en is per meeting
    // idempotent (alleen type='risk' rijen worden vervangen). Action_items
    // uit historische runs blijven staan tot ze handmatig gewist worden.
    await runRiskSpecialistStep(
      meetingId,
      transcript,
      {
        title: context.title,
        meeting_type: context.meeting_type,
        party_type: context.party_type,
        participants: context.participants,
        speakerContext: null,
        entityContext: entityContext.contextString,
        meeting_date: meeting.date || new Date().toISOString().split("T")[0],
        identified_projects: identifiedProjects.map((p) => ({
          project_name: p.project_name,
          project_id: p.project_id,
        })),
      },
      identifiedProjects,
    );

    // Step 6: Tagger + segment-bouw (delete old segments first, then rebuild)
    const meetingOrganizationId = await getMeetingOrganizationId(meetingId);

    // Delete existing segments for this meeting
    await deleteSegmentsByMeetingId(meetingId);

    if (summarizerOutput.kernpunten.length > 0 || summarizerOutput.vervolgstappen.length > 0) {
      try {
        const ignoredNames = meetingOrganizationId
          ? await getIgnoredEntityNames(meetingOrganizationId, "project")
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

// ── Regenerate Risks Only (alleen RiskSpecialist opnieuw draaien) ──

/**
 * Lichte regenerate die alleen de RiskSpecialist opnieuw draait en de
 * risks in `extractions` vervangt. Summary, action_items, segments en
 * project-koppelingen blijven ongemoeid.
 *
 * Gebruikt de eerder door de Gatekeeper geïdentificeerde projecten uit
 * `raw_fireflies.pipeline.gatekeeper.identified_projects` zodat project_id-
 * mapping exact hetzelfde blijft als bij de originele run — geen tweede
 * Gatekeeper-call nodig.
 */
export async function regenerateRisksAction(
  input: z.infer<typeof regenerateSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = regenerateSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const { meetingId } = parsed.data;

  const meeting = await getMeetingForRegenerateRisks(meetingId);
  if (!meeting) {
    return { error: "Meeting niet gevonden" };
  }

  const transcript = meeting.transcript_elevenlabs || meeting.transcript;
  if (!transcript) {
    return { error: "Geen transcript beschikbaar voor deze meeting" };
  }

  const participants = meeting.meeting_participants.map((mp) => mp.person.name);

  // Haal identified_projects uit raw_fireflies zodat we exact dezelfde
  // project-mapping gebruiken als de originele pipeline. Bij legacy
  // meetings waar die kolom nog leeg is vallen we terug op een lege lijst
  // — RiskSpecialist schrijft dan risks met project_id=null, wat acceptabel
  // is (beter dan falen).
  type RawProject = { project_name?: unknown; project_id?: unknown; confidence?: unknown };
  const rawFf = meeting.raw_fireflies as Record<string, unknown> | null;
  const pipeline = rawFf?.pipeline as Record<string, unknown> | undefined;
  const gkData = pipeline?.gatekeeper as Record<string, unknown> | undefined;
  const rawProjects = Array.isArray(gkData?.identified_projects)
    ? (gkData.identified_projects as RawProject[])
    : [];
  const identifiedProjects = rawProjects
    .filter((p): p is RawProject & { project_name: string } => typeof p.project_name === "string")
    .map((p) => ({
      project_name: p.project_name,
      project_id: typeof p.project_id === "string" ? p.project_id : null,
      confidence: typeof p.confidence === "number" ? p.confidence : 0.5,
    }));

  try {
    const entityContext = await buildEntityContext();

    await runRiskSpecialistStep(
      meetingId,
      transcript,
      {
        title: meeting.title || "Onbekend",
        meeting_type: meeting.meeting_type || "other",
        party_type: meeting.party_type || "other",
        participants,
        speakerContext: null,
        entityContext: entityContext.contextString,
        meeting_date: meeting.date || new Date().toISOString().split("T")[0],
        identified_projects: identifiedProjects.map((p) => ({
          project_name: p.project_name,
          project_id: p.project_id,
        })),
      },
      identifiedProjects,
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { error: `Risks regenereren mislukt: ${errMsg}` };
  }

  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath(`/review/${meetingId}`);
  revalidatePath("/review");
  return { success: true };
}

// ── Full Reprocess (re-fetch from Fireflies + full pipeline) ──

export async function reprocessMeetingAction(
  input: z.infer<typeof regenerateSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = regenerateSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const { meetingId } = parsed.data;

  // 1. Fetch meeting to get fireflies_id + title (title is needed for rollback)
  const meeting = await getMeetingForReprocess(meetingId);
  if (!meeting) {
    return { error: "Meeting niet gevonden" };
  }

  if (!meeting.fireflies_id) {
    return { error: "Geen Fireflies ID — kan niet opnieuw ophalen" };
  }

  // 2. Fetch full transcript from Fireflies (before any mutations — safe to fail here)
  const { fetchFirefliesTranscript } = await import("@repo/ai/fireflies");
  const transcript = await fetchFirefliesTranscript(meeting.fireflies_id);
  if (!transcript) {
    return { error: "Kon transcript niet ophalen van Fireflies" };
  }

  // 3. Move the old meeting out of the way so both unique constraints
  //    (fireflies_id AND (lower(title), date::date)) don't block the new insert.
  //    We clear fireflies_id and prefix the title with a reprocessing marker.
  //    The old meeting stays intact (and fully reversible) until the pipeline succeeds.
  const reprocessMarker = `__reprocessing_${Date.now()}__`;
  const parkedTitle = `${reprocessMarker}:${meeting.title ?? ""}`;
  const parkResult = await parkMeetingForReprocess(meetingId, parkedTitle);
  if ("error" in parkResult) {
    return { error: `Voorbereiding mislukt: ${parkResult.error}` };
  }

  // Helper: restore the old meeting exactly as it was.
  const restoreOldMeeting = async () => {
    await restoreParkedMeeting(meetingId, meeting.fireflies_id, meeting.title);
  };

  // 4. Run full pipeline (gatekeeper → classify → speaker map → ElevenLabs → summarizer → extractor → embed)
  try {
    const { chunkTranscript } = await import("@repo/ai/transcript-processor");
    const { processMeeting } = await import("@repo/ai/pipeline/gatekeeper-pipeline");

    const chunks = chunkTranscript(transcript.sentences);
    const chunkedTranscript = chunks.map((c) => c.text).join("\n\n---\n\n");

    const pipelineResult = await processMeeting({
      fireflies_id: meeting.fireflies_id,
      title: transcript.title,
      date: transcript.date,
      participants: transcript.participants,
      organizer_email: transcript.organizer_email,
      meeting_attendees: transcript.meeting_attendees ?? [],
      sentences: transcript.sentences,
      summary: transcript.summary?.notes ?? "",
      topics: transcript.summary?.topics_discussed ?? [],
      transcript: chunkedTranscript,
      raw_fireflies: {
        fireflies_id: meeting.fireflies_id,
        title: transcript.title,
        date: transcript.date,
        participants: transcript.participants,
        organizer_email: transcript.organizer_email,
        meeting_attendees: transcript.meeting_attendees,
        summary: transcript.summary,
        sentences: transcript.sentences,
      },
      audio_url: transcript.audio_url ?? undefined,
    });

    if (!pipelineResult.meetingId) {
      // Pipeline failed — restore the old meeting so nothing is lost
      await restoreOldMeeting();
      return { error: "Pipeline mislukt — oude meeting is behouden" };
    }

    // 5. Pipeline succeeded — delete the old (parked) meeting (CASCADE cleans up related data)
    await deleteMeeting(meetingId);

    revalidatePath(`/meetings/${pipelineResult.meetingId}`);
    revalidatePath(`/review/${pipelineResult.meetingId}`);
    revalidatePath("/review");
    revalidatePath("/meetings");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    // Pipeline crashed — restore the old meeting
    await restoreOldMeeting();
    const errMsg = err instanceof Error ? err.message : String(err);
    return { error: `Herverwerking mislukt — oude meeting is behouden: ${errMsg}` };
  }
}
