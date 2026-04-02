import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchFirefliesTranscript } from "@repo/ai/fireflies";
import { chunkTranscript } from "@repo/ai/transcript-processor";
import { transcribeWithElevenLabs, formatScribeTranscript } from "@repo/ai/transcribe-elevenlabs";
import { runSummarizer, formatSummary } from "@repo/ai/agents/summarizer";
import { updateMeetingElevenLabs } from "@repo/database/mutations/meetings";
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
    return NextResponse.json({ error: `Meeting not found: ${meetingError?.message}` }, { status: 404 });
  }

  // 2. Fetch full transcript from Fireflies (to get audio_url)
  const transcript = await fetchFirefliesTranscript(fireflies_id);
  if (!transcript) {
    return NextResponse.json({ error: "Failed to fetch transcript from Fireflies" }, { status: 502 });
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
  let elevenlabsTranscript: string | null = null;
  try {
    console.info(`Reprocess: Starting ElevenLabs for ${meeting.title}...`);
    const scribeResult = await transcribeWithElevenLabs(audioUrl);
    elevenlabsTranscript = formatScribeTranscript(scribeResult.words);

    await updateMeetingElevenLabs(meeting.id, {
      transcript_elevenlabs: elevenlabsTranscript,
      raw_elevenlabs: scribeResult.raw as unknown as Record<string, unknown>,
      audio_url: audioUrl,
    });

    results.elevenlabs = {
      success: true,
      words: scribeResult.words.length,
      language: scribeResult.languageCode,
      confidence: scribeResult.languageProbability,
    };
    console.info(`Reprocess: ElevenLabs done — ${scribeResult.words.length} words`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    results.elevenlabs = { success: false, error: errMsg };
    console.error("Reprocess: ElevenLabs failed:", errMsg);
  }

  // 4. Summarizer — use ElevenLabs transcript if available, fallback to Fireflies
  const summarizerTranscript = elevenlabsTranscript
    ?? chunkTranscript(transcript.sentences).map((c) => c.text).join("\n\n---\n\n");
  const transcriptSource = elevenlabsTranscript ? "elevenlabs" : "fireflies";

  try {
    console.info(`Reprocess: Starting Summarizer (${transcriptSource})...`);
    const summarizerOutput = await runSummarizer(summarizerTranscript, {
      title: meeting.title,
      meeting_type: meeting.meeting_type ?? "unknown",
      party_type: meeting.party_type ?? "other",
      participants: meeting.participants ?? [],
    });
    const richSummary = formatSummary(summarizerOutput);

    await getAdminClient()
      .from("meetings")
      .update({ summary: richSummary })
      .eq("id", meeting.id);

    results.summarizer = {
      success: true,
      transcript_source: transcriptSource,
      kernpunten: summarizerOutput.kernpunten.length,
      themas: summarizerOutput.themas.length,
      deelnemers: summarizerOutput.deelnemers.length,
      vervolgstappen: summarizerOutput.vervolgstappen.length,
      summary_preview: richSummary.slice(0, 500) + "...",
    };
    console.info(`Reprocess: Summarizer done — ${summarizerOutput.kernpunten.length} kernpunten`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    results.summarizer = { success: false, transcript_source: transcriptSource, error: errMsg };
    console.error("Reprocess: Summarizer failed:", errMsg);
  }

  return NextResponse.json(results);
}
