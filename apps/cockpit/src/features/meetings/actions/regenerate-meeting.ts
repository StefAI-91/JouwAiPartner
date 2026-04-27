"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  updateMeetingSummary,
  updateMeetingTitle,
  markMeetingEmbeddingStale,
} from "@repo/database/mutations/meetings";
import { getMeetingForRegenerate, getMeetingOrganizationId } from "@repo/database/queries/meetings";
import { runSummarizer, formatSummary, formatThemeSummary } from "@repo/ai/agents/summarizer";
import { runRiskSpecialistStep } from "@repo/ai/pipeline/steps/risk-specialist";
import { buildEntityContext } from "@repo/ai/pipeline/context-injection";
import { runGatekeeper } from "@repo/ai/agents/gatekeeper";
import { runTagger } from "@repo/ai/pipeline/tagger";
import { buildSegments } from "@repo/ai/pipeline/segment-builder";
import { embedBatch } from "@repo/ai/embeddings";
import { runThemeDetectorStep } from "@repo/ai/pipeline/steps/theme-detector";
import { runLinkThemesStep } from "@repo/ai/pipeline/steps/link-themes";
import {
  insertMeetingProjectSummaries,
  updateSegmentEmbedding,
  deleteSegmentsByMeetingId,
} from "@repo/database/mutations/meetings/project-summaries";
import { getIgnoredEntityNames } from "@repo/database/queries/ignored-entities";
import { regenerateSchema } from "@repo/database/validations/meetings";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";

export async function regenerateMeetingAction(
  input: z.infer<typeof regenerateSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = regenerateSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  const { meetingId } = parsed.data;

  const meeting = await getMeetingForRegenerate(meetingId);
  if (!meeting) {
    return { error: "Meeting niet gevonden" };
  }

  const transcript =
    meeting.transcript_elevenlabs_named || meeting.transcript_elevenlabs || meeting.transcript;
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

    // Step 2: Gatekeeper VÓÓR Summarizer (TH-013 aanpassing). De originele
    // volgorde was Summarizer → Gatekeeper op de verse summary. Voor TH-013
    // moet de Summarizer identified_themes krijgen, wat vereist dat de
    // Theme-Detector eerst draait — en die heeft identified_projects van
    // Gatekeeper als context nodig. We draaien Gatekeeper daarom op de
    // huidige (oude) meeting.summary. Projecten zijn invariant over
    // summary-regeneratie: dezelfde meeting heeft dezelfde projecten.
    const baselineSummaryForClassification = (meeting.summary ?? "").slice(0, 3000);
    const gatekeeperResult = await runGatekeeper(baselineSummaryForClassification, {
      title: context.title,
      entityContext: entityContext.contextString,
    });
    const identifiedProjects = gatekeeperResult.identified_projects;

    // Step 3: Theme-Detector (TH-013 aanpassing). Levert identified_themes
    // voor de Summarizer én de verifiedThemes-cache die link-themes later
    // hergebruikt (MB-1 patroon uit TH-011). Never-throws; bij falen een
    // lege output + lege cache zodat downstream gewoon doordraait.
    const themeDetectorResult = await runThemeDetectorStep({
      meeting: {
        meetingId,
        title: context.title,
        meeting_type: context.meeting_type,
        party_type: context.party_type,
        participants: context.participants,
        summary: meeting.summary ?? "",
        identifiedProjects: identifiedProjects.map((p) => ({
          project_name: p.project_name,
          project_id: p.project_id,
        })),
      },
    });

    const detectorIdentifiedThemeIds = new Set(
      themeDetectorResult.output.identified_themes.map((t) => t.themeId),
    );
    const identifiedThemesForSummarizer =
      detectorIdentifiedThemeIds.size > 0
        ? themeDetectorResult.verifiedThemes
            .filter((t) => detectorIdentifiedThemeIds.has(t.id))
            .map((t) => ({ themeId: t.id, name: t.name, description: t.description }))
        : [];

    // Step 4: Summarizer — nu met entityContext én identified_themes zodat
    // theme_summaries[] gevuld kan worden (TH-013 FUNC-290/292).
    const summarizerOutput = await runSummarizer(transcript, {
      ...context,
      entityContext: entityContext.contextString,
      identified_themes: identifiedThemesForSummarizer,
      meetingId,
    });
    const richSummary = formatSummary(summarizerOutput);

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

    // Step 7 (TH-013): link-themes met replace=true + Summarizer's rich
    // theme_summaries Map. Moet NÁ RiskSpecialist draaien — link-themes
    // parset extraction.content voor [Themes:]-annotaties, en risk-
    // extractions moeten al weggeschreven zijn (FUNC-284 patroon uit
    // gatekeeper-pipeline.ts). Never-throws.
    if (themeDetectorResult.success) {
      const summarizerMap = new Map<string, string>();
      for (const ts of summarizerOutput.theme_summaries) {
        if (!ts.briefing.trim()) continue;
        summarizerMap.set(ts.themeId, formatThemeSummary(ts));
      }

      const linkResult = await runLinkThemesStep({
        meetingId,
        detectorOutput: themeDetectorResult.output,
        replace: true,
        verifiedThemes: themeDetectorResult.verifiedThemes,
        summarizerThemeSummaries: summarizerMap,
      });
      if (linkResult.error) {
        console.error("link-themes failed during regeneration (non-blocking):", linkResult.error);
      }
    }

    // Step 8: Mark meeting embedding as stale for re-embedding
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
  // TH-013 — theme detail pages tonen meeting_themes.summary; revalidaten
  // zodat de rijke markdown direct zichtbaar is na regenerate.
  revalidatePath("/themes");
  revalidatePath("/themes/[slug]", "page");
  revalidatePath("/");
  return { success: true };
}
