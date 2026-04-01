import { NextRequest, NextResponse } from "next/server";

// ElevenLabs Scribe v2 — full meeting transcription comparison
export const maxDuration = 300;

import { fetchFirefliesTranscript } from "@repo/ai/fireflies";

function verifyAuth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const querySecret = req.nextUrl.searchParams.get("secret");
  if (querySecret === secret) return true;
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

interface ScribeWord {
  text: string;
  start: number;
  end: number;
  type: string;
  speaker_id?: string;
}

interface ScribeResponse {
  language_code: string;
  language_probability: number;
  text: string;
  words: ScribeWord[];
}

/**
 * Transcription comparison: Fireflies vs ElevenLabs Scribe v2
 *
 * GET ?secret=...&id=<fireflies_id>
 *   → Sends Fireflies audio_url to ElevenLabs Scribe v2 (no download needed)
 *   → Compares with Fireflies transcript
 */
export async function GET(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meetingId = req.nextUrl.searchParams.get("id");
  if (!meetingId) {
    return NextResponse.json({ error: "Missing ?id= parameter", version: "v4" });
  }

  try {
    // Step 1: Fetch Fireflies transcript
    const ff = await fetchFirefliesTranscript(meetingId);
    if (!ff) return NextResponse.json({ error: "Transcript not found", version: "v4" });
    if (!ff.audio_url) return NextResponse.json({ error: "No audio_url", title: ff.title, version: "v4" });

    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsKey) return NextResponse.json({ error: "ELEVENLABS_API_KEY not set", version: "v4" });

    // Step 2: Send audio URL directly to ElevenLabs (no download needed, supports up to 2GB via URL)
    const startTime = Date.now();

    const formData = new FormData();
    formData.append("model_id", "scribe_v2");
    formData.append("cloud_storage_url", ff.audio_url);
    formData.append("language_code", "nld");
    formData.append("diarize", "true");
    formData.append("timestamps_granularity", "word");
    formData.append("tag_audio_events", "false");

    const scribeRes = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": elevenLabsKey },
      body: formData,
    });

    if (!scribeRes.ok) {
      const errorBody = await scribeRes.text();
      return NextResponse.json({
        error: "ElevenLabs API error",
        status: scribeRes.status,
        detail: errorBody,
        version: "v4",
      });
    }

    const scribeResult = (await scribeRes.json()) as ScribeResponse;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Step 3: Get duration from word timestamps
    const lastWord = scribeResult.words[scribeResult.words.length - 1];
    const scribeDuration = lastWord?.end ?? 0;

    // Step 4: Build Fireflies text for same time range
    const ffSentences = scribeDuration > 0
      ? ff.sentences.filter((s) => s.start_time <= scribeDuration)
      : ff.sentences;
    const ffText = ffSentences.map((s) => s.text).join(" ");

    // Step 5: Word counts
    const scribeWords = scribeResult.text.split(/\s+/).filter(Boolean);
    const ffWords = ffText.split(/\s+/).filter(Boolean);

    // Step 6: Unique speakers
    const speakers = [...new Set(scribeResult.words
      .filter((w) => w.speaker_id)
      .map((w) => w.speaker_id))];

    return NextResponse.json({
      version: "v4",
      meeting: {
        id: ff.id,
        title: ff.title,
        date: new Date(Number(ff.date)).toISOString(),
        participants: ff.participants,
      },
      elevenlabs: {
        model: "scribe_v2",
        language: scribeResult.language_code,
        language_confidence: scribeResult.language_probability,
        duration_seconds: Math.round(scribeDuration),
        duration_minutes: Math.round(scribeDuration / 60),
        word_count: scribeWords.length,
        speakers_detected: speakers,
        transcription_time: `${elapsed}s`,
        full_text: scribeResult.text,
      },
      fireflies: {
        word_count: ffWords.length,
        sentence_count: ffSentences.length,
        full_text: ffText,
      },
      comparison: {
        word_count_diff: Math.abs(scribeWords.length - ffWords.length),
        elevenlabs_to_fireflies_ratio: (scribeWords.length / ffWords.length).toFixed(2),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message, version: "v4" });
  }
}
