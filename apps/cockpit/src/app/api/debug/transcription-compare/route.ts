import { NextRequest, NextResponse } from "next/server";
import {
  listFirefliesTranscripts,
  fetchFirefliesTranscript,
} from "@repo/ai/fireflies";
import { transcribeAudioUrl } from "@repo/ai/transcribe";

// Only allow in development
function isDev() {
  return process.env.NODE_ENV === "development";
}

/**
 * GET /api/debug/transcription-compare
 *   → Lists recent Fireflies transcripts (pick one to compare)
 *
 * GET /api/debug/transcription-compare?id=<fireflies_meeting_id>
 *   → Fetches audio, transcribes with OpenAI, compares with Fireflies
 */
export async function GET(req: NextRequest) {
  if (!isDev()) {
    return NextResponse.json(
      { error: "Only available in development" },
      { status: 403 },
    );
  }

  const meetingId = req.nextUrl.searchParams.get("id");

  // ── No ID: list recent transcripts ──────────────────────────────
  if (!meetingId) {
    const transcripts = await listFirefliesTranscripts(10);

    const items = transcripts.map((t) => ({
      id: t.id,
      title: t.title,
      date: new Date(Number(t.date)).toISOString(),
      participants: t.participants,
      test_url: `/api/debug/transcription-compare?id=${t.id}`,
    }));

    return NextResponse.json({
      message: "Kies een meeting om te vergelijken. Open de test_url in je browser.",
      transcripts: items,
    });
  }

  // ── With ID: run comparison ─────────────────────────────────────
  const startTotal = Date.now();

  // 1. Fetch Fireflies transcript
  const ff = await fetchFirefliesTranscript(meetingId);
  if (!ff) {
    return NextResponse.json(
      { error: "Transcript niet gevonden in Fireflies" },
      { status: 404 },
    );
  }

  if (!ff.audio_url) {
    return NextResponse.json(
      {
        error: "Geen audio_url beschikbaar voor dit transcript",
        hint: "Zet Audio Storage aan in app.fireflies.ai → Settings",
        transcript: {
          id: ff.id,
          title: ff.title,
          date: new Date(Number(ff.date)).toISOString(),
          participants: ff.participants,
          sentences: ff.sentences.length,
        },
      },
      { status: 422 },
    );
  }

  // 2. Build Fireflies full text
  const ffText = ff.sentences.map((s) => s.text).join(" ");
  const ffWords = wordTokenize(ffText);

  // 3. Transcribe with OpenAI
  const startOpenAI = Date.now();
  const openaiResult = await transcribeAudioUrl(ff.audio_url, {
    language: "nl",
    prompt: `Meeting transcript. Deelnemers: ${ff.participants.join(", ")}`,
  });
  const openaiDuration = ((Date.now() - startOpenAI) / 1000).toFixed(1);
  const openaiWords = wordTokenize(openaiResult.text);

  // 4. Compute WER
  const wer = computeWER(ffWords, openaiWords);

  // 5. Build response
  const totalDuration = ((Date.now() - startTotal) / 1000).toFixed(1);

  return NextResponse.json({
    meeting: {
      id: ff.id,
      title: ff.title,
      date: new Date(Number(ff.date)).toISOString(),
      participants: ff.participants,
      audio_url: ff.audio_url,
      video_url: ff.video_url,
    },
    fireflies: {
      word_count: ffWords.length,
      sentence_count: ff.sentences.length,
      sample: ffWords.slice(0, 150).join(" "),
    },
    openai: {
      model: "gpt-4o-transcribe",
      language_detected: openaiResult.language,
      audio_duration_seconds: openaiResult.duration,
      word_count: openaiWords.length,
      segment_count: openaiResult.segments.length,
      transcription_time: `${openaiDuration}s`,
      sample: openaiWords.slice(0, 150).join(" "),
    },
    comparison: {
      word_error_rate: `${(wer * 100).toFixed(1)}%`,
      word_error_rate_raw: wer,
      word_count_diff: Math.abs(openaiWords.length - ffWords.length),
      verdict:
        wer < 0.1
          ? "Zeer goede overeenkomst (<10% WER)"
          : wer < 0.2
            ? "Redelijke overeenkomst (10-20% WER)"
            : "Significant verschil (>20% WER)",
    },
    timing: {
      total: `${totalDuration}s`,
      openai_transcription: `${openaiDuration}s`,
    },
  });
}

// ── Helpers ────────────────────────────────────────────────────────

function wordTokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\sáàâäéèêëíìîïóòôöúùûüñç]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function computeWER(reference: string[], hypothesis: string[]): number {
  const n = reference.length;
  const m = hypothesis.length;
  const d: number[][] = Array.from({ length: n + 1 }, () =>
    Array(m + 1).fill(0),
  );

  for (let i = 0; i <= n; i++) d[i][0] = i;
  for (let j = 0; j <= m; j++) d[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = reference[i - 1] === hypothesis[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost,
      );
    }
  }

  return n === 0 ? 0 : d[n][m] / n;
}
