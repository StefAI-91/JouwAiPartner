export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchFirefliesTranscript } from "@repo/ai/fireflies";
import { chunkTranscript } from "@repo/ai/transcript-processor";
import { runTranscribeStep } from "@repo/ai/pipeline/steps/transcribe";
import { runSummarizeStep } from "@repo/ai/pipeline/steps/summarize";
import { runRiskSpecialistStep } from "@repo/ai/pipeline/steps/risk-specialist";
import { embedMeetingWithExtractions } from "@repo/ai/pipeline/embed-pipeline";
import { markMeetingEmbeddingStale } from "@repo/database/mutations/meetings";
import { getMeetingByFirefliesIdForReprocess } from "@repo/database/queries/meetings";
import { buildEntityContext } from "@repo/ai/pipeline/context-injection";
import { runTagger } from "@repo/ai/pipeline/tagger";
import { buildSegments } from "@repo/ai/pipeline/segment-builder";
import {
  insertMeetingProjectSummaries,
  updateSegmentEmbedding,
} from "@repo/database/mutations/meetings/project-summaries";
import { embedBatch } from "@repo/ai/embeddings";
import { getIgnoredEntityNames } from "@repo/database/queries/ignored-entities";
import type { IdentifiedProject } from "@repo/ai/validations/gatekeeper";

const reprocessSchema = z.object({
  fireflies_id: z.string(),
});

/**
 * Re-process an existing meeting through the ElevenLabs + Summarizer pipeline.
 * Does NOT delete or re-create the meeting — only adds the new data.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = reprocessSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "fireflies_id is required" }, { status: 400 });
  }

  const { fireflies_id } = parsed.data;

  // 1. Find existing meeting in DB
  const meeting = await getMeetingByFirefliesIdForReprocess(fireflies_id);
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // 2. Fetch full transcript from Fireflies (to get audio_url)
  const transcript = await fetchFirefliesTranscript(fireflies_id);
  if (!transcript) {
    return NextResponse.json(
      { error: "Failed to fetch transcript from Fireflies" },
      { status: 502 },
    );
  }

  const audioUrl = transcript.audio_url;
  if (!audioUrl) {
    return NextResponse.json({ error: "No audio_url available from Fireflies" }, { status: 422 });
  }

  const results: Record<string, unknown> = {
    meeting_id: meeting.id,
    title: meeting.title,
    fireflies_id,
    audio_url: audioUrl,
  };

  // 3. ElevenLabs Scribe v2 transcription
  console.info(`Reprocess: Starting ElevenLabs for ${meeting.title}...`);
  const transcribeResult = await runTranscribeStep(meeting.id, audioUrl);
  results.elevenlabs = transcribeResult.success
    ? { success: true }
    : { success: false, error: transcribeResult.error };

  // 4. Summarizer
  const summarizerTranscript =
    transcribeResult.transcript ??
    chunkTranscript(transcript.sentences)
      .map((c) => c.text)
      .join("\n\n---\n\n");
  const transcriptSource = transcribeResult.transcript ? "elevenlabs" : "fireflies";

  console.info(`Reprocess: Starting Summarizer (${transcriptSource})...`);
  const summarizeResult = await runSummarizeStep(meeting.id, summarizerTranscript, {
    title: meeting.title ?? "",
    meeting_type: meeting.meeting_type ?? "unknown",
    party_type: meeting.party_type ?? "other",
    participants: meeting.participants ?? [],
  });
  results.summarizer = summarizeResult.success
    ? { success: true, transcript_source: transcriptSource }
    : { success: false, transcript_source: transcriptSource, error: summarizeResult.error };

  // 5. Tagger + Segment-bouw (idempotent: insertMeetingProjectSummaries verwijdert eerst oude segmenten)
  let segmentsSaved = 0;
  const identifiedProjects: IdentifiedProject[] = [];
  if (summarizeResult.success) {
    try {
      // Haal identified_projects uit raw_fireflies (van eerdere Gatekeeper run)
      const rawFf = meeting.raw_fireflies as Record<string, unknown> | null;
      const pipeline = rawFf?.pipeline as Record<string, unknown> | undefined;
      const gkData = pipeline?.gatekeeper as Record<string, unknown> | undefined;
      if (gkData?.identified_projects && Array.isArray(gkData.identified_projects)) {
        for (const p of gkData.identified_projects) {
          identifiedProjects.push(p as IdentifiedProject);
        }
      }

      const entityContext = await buildEntityContext();
      const orgId = meeting.organization_id;
      const ignoredNames = orgId
        ? await getIgnoredEntityNames(orgId, "project")
        : new Set<string>();

      const taggerOutput = runTagger({
        kernpunten: summarizeResult.kernpunten ?? [],
        vervolgstappen: summarizeResult.vervolgstappen ?? [],
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
          meeting_id: meeting.id,
          project_id: s.project_id,
          project_name_raw: s.project_name_raw,
          kernpunten: s.kernpunten,
          vervolgstappen: s.vervolgstappen,
          summary_text: s.summary_text,
        }));

        const insertSegResult = await insertMeetingProjectSummaries(segmentRows);
        if ("error" in insertSegResult) {
          console.error("Reprocess: Segment insert failed:", insertSegResult.error);
        } else {
          segmentsSaved = insertSegResult.ids.length;
          try {
            const texts = segments.map((s) => s.summary_text);
            const embeddings = await embedBatch(texts);
            await Promise.all(
              insertSegResult.ids.map((id, i) => updateSegmentEmbedding(id, embeddings[i])),
            );
          } catch (embedErr) {
            const msg = embedErr instanceof Error ? embedErr.message : String(embedErr);
            console.error("Reprocess: Segment embedding failed (non-blocking):", msg);
          }
        }
      }
      console.info(`Reprocess: ${segmentsSaved} segments saved`);
    } catch (taggerErr) {
      const msg = taggerErr instanceof Error ? taggerErr.message : String(taggerErr);
      console.error("Reprocess: Tagger failed (graceful degradation):", msg);
    }
  }
  results.segments = { saved: segmentsSaved };

  // 6. RiskSpecialist — vervangt de legacy Extractor. Risks schrijven naar
  // `extractions` (UI) + `experimental_risk_extractions` (audit). Per-type
  // idempotent: action_items uit historische runs blijven staan.
  try {
    console.info(`Reprocess: Running RiskSpecialist (${transcriptSource})...`);
    await runRiskSpecialistStep(
      meeting.id,
      summarizerTranscript,
      {
        title: meeting.title ?? "",
        meeting_type: meeting.meeting_type ?? "unknown",
        party_type: meeting.party_type ?? "other",
        participants: meeting.participants ?? [],
        speakerContext: null,
        entityContext: "",
        meeting_date: meeting.date ?? new Date().toISOString().split("T")[0],
        identified_projects: identifiedProjects.map((p) => ({
          project_name: p.project_name,
          project_id: p.project_id,
        })),
      },
      identifiedProjects,
    );
    results.risk_specialist = { success: true, transcript_source: transcriptSource };
    console.info("Reprocess: RiskSpecialist done");
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    results.risk_specialist = { success: false, error: errMsg };
    console.error("Reprocess: RiskSpecialist failed:", errMsg);
  }

  // 6. Re-embed meeting + extractions
  try {
    console.info(`Reprocess: Re-embedding ${meeting.id}...`);
    await markMeetingEmbeddingStale(meeting.id);
    await embedMeetingWithExtractions(meeting.id);
    results.embedded = true;
    console.info("Reprocess: Embedding done");
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    results.embedded = false;
    results.embed_error = errMsg;
    console.error("Reprocess: Embedding failed:", errMsg);
  }

  return NextResponse.json(results);
}
