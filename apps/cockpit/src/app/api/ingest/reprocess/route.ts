import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchFirefliesTranscript } from "@repo/ai/fireflies";
import { chunkTranscript } from "@repo/ai/transcript-processor";
import { runTranscribeStep } from "@repo/ai/pipeline/steps/transcribe";
import { runSummarizeStep } from "@repo/ai/pipeline/steps/summarize";
import { runExtractor } from "@repo/ai/agents/extractor";
import { saveExtractions } from "@repo/ai/pipeline/save-extractions";
import { embedMeetingWithExtractions } from "@repo/ai/pipeline/embed-pipeline";
import { deleteExtractionsByMeetingId } from "@repo/database/mutations/extractions";
import { markMeetingEmbeddingStale } from "@repo/database/mutations/meetings";
import { getAdminClient } from "@repo/database/supabase/admin";

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
  const { data: meeting, error: meetingError } = await getAdminClient()
    .from("meetings")
    .select("id, title, meeting_type, party_type, participants")
    .eq("fireflies_id", fireflies_id)
    .single();

  if (meetingError || !meeting) {
    return NextResponse.json(
      { error: `Meeting not found: ${meetingError?.message}` },
      { status: 404 },
    );
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
    title: meeting.title,
    meeting_type: meeting.meeting_type ?? "unknown",
    party_type: meeting.party_type ?? "other",
    participants: meeting.participants ?? [],
  });
  results.summarizer = summarizeResult.success
    ? { success: true, transcript_source: transcriptSource }
    : { success: false, transcript_source: transcriptSource, error: summarizeResult.error };

  // 5. Delete old extractions and re-run Extractor
  const extractorSummary = summarizeResult.richSummary ?? (transcript.summary?.notes ?? "");

  try {
    console.info(`Reprocess: Deleting old extractions for ${meeting.id}...`);
    await deleteExtractionsByMeetingId(meeting.id);

    console.info(`Reprocess: Running Extractor (${transcriptSource})...`);
    const extractorResult = await runExtractor(summarizerTranscript, {
      title: meeting.title,
      meeting_type: meeting.meeting_type ?? "unknown",
      party_type: meeting.party_type ?? "other",
      participants: meeting.participants ?? [],
      summary: extractorSummary,
    });

    const saveResult = await saveExtractions(extractorResult, meeting.id);

    results.extractor = {
      success: true,
      transcript_source: transcriptSource,
      extractions_saved: saveResult.extractions_saved,
      project_linked: saveResult.project_linked,
      entities: extractorResult.entities,
      primary_project: extractorResult.primary_project,
    };
    console.info(`Reprocess: Extractor done — ${saveResult.extractions_saved} extractions`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    results.extractor = { success: false, error: errMsg };
    console.error("Reprocess: Extractor failed:", errMsg);
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
