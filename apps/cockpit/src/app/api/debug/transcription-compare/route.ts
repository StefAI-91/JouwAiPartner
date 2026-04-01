import { NextRequest, NextResponse } from "next/server";

// Allow up to 5 minutes for long audio files
export const maxDuration = 300;
import {
  listFirefliesTranscripts,
  fetchFirefliesTranscript,
} from "@repo/ai/fireflies";
import { transcribeAudioUrl, probeAudioUrl } from "@repo/ai/transcribe";

function verifyAuth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  // Support both ?secret= query param (easy browser testing) and Bearer token
  const querySecret = req.nextUrl.searchParams.get("secret");
  if (querySecret === secret) return true;

  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

/**
 * GET /api/debug/transcription-compare?secret=<CRON_SECRET>
 *   → Lists recent Fireflies transcripts (pick one to compare)
 *
 * GET /api/debug/transcription-compare?secret=<CRON_SECRET>&id=<fireflies_meeting_id>
 *   → Fetches audio, transcribes with OpenAI, compares with Fireflies
 */
export async function GET(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meetingId = req.nextUrl.searchParams.get("id");

  // ── No ID: list recent transcripts ──────────────────────────────
  if (!meetingId) {
    const transcripts = await listFirefliesTranscripts(10);
    const secret = req.nextUrl.searchParams.get("secret") ?? "";

    const items = transcripts.map((t) => ({
      id: t.id,
      title: t.title,
      date: new Date(Number(t.date)).toISOString(),
      participants: t.participants,
      test_url: `/api/debug/transcription-compare?secret=${secret}&id=${t.id}`,
    }));

    return NextResponse.json({
      message: "Kies een meeting om te vergelijken. Open de test_url in je browser.",
      transcripts: items,
    });
  }

  // ── With ID: run comparison ─────────────────────────────────────
  const mode = req.nextUrl.searchParams.get("mode"); // "check" = only fetch Fireflies info

  try {
    const startTotal = Date.now();

    // 1. Fetch Fireflies transcript
    const ff = await fetchFirefliesTranscript(meetingId);
    if (!ff) {
      return NextResponse.json(
        { error: "Transcript niet gevonden in Fireflies" },
        { status: 404 },
      );
    }

    // mode=check: return Fireflies info + audio probe (no OpenAI call)
    if (mode === "check") {
      let audioProbe = null;
      if (ff.audio_url) {
        try {
          audioProbe = await probeAudioUrl(ff.audio_url);
        } catch (e) {
          audioProbe = { error: e instanceof Error ? e.message : String(e) };
        }
      }

      return NextResponse.json({
        meeting: {
          id: ff.id,
          title: ff.title,
          date: new Date(Number(ff.date)).toISOString(),
          participants: ff.participants,
          audio_url: ff.audio_url,
          video_url: ff.video_url,
          sentences: ff.sentences.length,
        },
        audio_probe: audioProbe,
        env: {
          OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "SET" : "NOT SET",
          FIREFLIES_API_KEY: process.env.FIREFLIES_API_KEY ? "SET" : "NOT SET",
        },
      });
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

    // 2. Probe audio to diagnose issues
    const audioRes = await fetch(ff.audio_url);
    const audioContentType = audioRes.headers.get("content-type");
    const audioBytes = Buffer.from(await audioRes.arrayBuffer());
    const audioSizeMB = (audioBytes.byteLength / 1024 / 1024).toFixed(2);
    const audioHeader = audioBytes.slice(0, 16).toString("hex");

    // If mode=probe, return audio diagnostics only
    if (mode === "probe") {
      return NextResponse.json({
        audio_url: ff.audio_url.substring(0, 80) + "...",
        download_status: audioRes.status,
        content_type: audioContentType,
        size_mb: audioSizeMB,
        first_16_bytes_hex: audioHeader,
        is_mp3: audioHeader.startsWith("fff") || audioHeader.startsWith("4944"), // MP3 sync word or ID3 tag
        is_html: audioBytes.slice(0, 5).toString().startsWith("<"),
      });
    }

    // 3. Build Fireflies full text
    const ffText = ff.sentences.map((s) => s.text).join(" ");
    const ffWords = wordTokenize(ffText);

    // 4. Transcribe with OpenAI
    const startOpenAI = Date.now();
    const openaiResult = await transcribeAudioUrl(ff.audio_url, {
      language: "nl",
      prompt: `Meeting transcript. Deelnemers: ${ff.participants.join(", ")}`,
    });
    const openaiDuration = ((Date.now() - startOpenAI) / 1000).toFixed(1);
    const openaiWords = wordTokenize(openaiResult.text);

    // If audio was truncated, only compare the portion OpenAI could transcribe
    // Match Fireflies sentences to the same time range
    const openaiDurationSec = openaiResult.duration;
    let ffCompareWords = ffWords;
    let ffCompareSentences = ff.sentences.length;
    if (openaiResult.truncated && openaiDurationSec > 0) {
      const ffPartial = ff.sentences.filter(
        (s) => s.start_time <= openaiDurationSec,
      );
      ffCompareWords = wordTokenize(ffPartial.map((s) => s.text).join(" "));
      ffCompareSentences = ffPartial.length;
    }

    // 5. Compute WER
    const wer = computeWER(ffCompareWords, openaiWords);

    // 6. Build response
    const totalDuration = ((Date.now() - startTotal) / 1000).toFixed(1);

    return NextResponse.json({
      meeting: {
        id: ff.id,
        title: ff.title,
        date: new Date(Number(ff.date)).toISOString(),
        participants: ff.participants,
        audio_url: ff.audio_url ? ff.audio_url.substring(0, 80) + "..." : null,
        video_url: ff.video_url,
      },
      fireflies: {
        word_count: ffCompareWords.length,
        word_count_full: ffWords.length,
        sentence_count: ffCompareSentences,
        sentence_count_full: ff.sentences.length,
        sample: ffCompareWords.slice(0, 150).join(" "),
      },
      openai: {
        model: "gpt-4o-transcribe",
        language_detected: openaiResult.language,
        audio_duration_seconds: openaiDurationSec,
        audio_truncated: openaiResult.truncated ?? false,
        audio_original_size_mb: openaiResult.originalSizeMB,
        word_count: openaiWords.length,
        segment_count: openaiResult.segments.length,
        transcription_time: `${openaiDuration}s`,
        sample: openaiWords.slice(0, 150).join(" "),
      },
      comparison: {
        note: openaiResult.truncated
          ? `Audio was getrunceerd naar 24MB — vergelijking betreft eerste ~${Math.round(openaiDurationSec / 60)} minuten`
          : "Volledige meeting vergeleken",
        word_error_rate: `${(wer * 100).toFixed(1)}%`,
        word_error_rate_raw: wer,
        word_count_diff: Math.abs(openaiWords.length - ffCompareWords.length),
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    // Return 200 so the error detail is visible via simple fetch tools
    return NextResponse.json({
      error: "Transcription comparison failed",
      detail: message,
      stack,
    });
  }
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
