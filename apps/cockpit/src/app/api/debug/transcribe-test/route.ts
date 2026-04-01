import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

import { fetchFirefliesTranscript } from "@repo/ai/fireflies";
import OpenAI, { toFile } from "openai";

function verifyAuth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const querySecret = req.nextUrl.searchParams.get("secret");
  if (querySecret === secret) return true;
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

/**
 * Minimal transcription test endpoint.
 *
 * GET ?secret=...&id=<fireflies_id>
 *   Step 1: Fetch Fireflies transcript + audio_url
 *   Step 2: Download first 24MB of audio via Range request
 *   Step 3: Send to OpenAI whisper-1 (most battle-tested model)
 *   Step 4: Return both transcripts for comparison
 */
export async function GET(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meetingId = req.nextUrl.searchParams.get("id");
  if (!meetingId) {
    return NextResponse.json({ error: "Missing ?id= parameter", version: "v2" });
  }

  try {
    // Step 1: Fetch from Fireflies
    const ff = await fetchFirefliesTranscript(meetingId);
    if (!ff) return NextResponse.json({ error: "Transcript not found" });
    if (!ff.audio_url) return NextResponse.json({ error: "No audio_url", title: ff.title });

    // Step 2: Download audio
    // gpt-4o-transcribe limit: 25MB file size AND 1500 seconds (25 min) duration
    // At ~192kbps MP3, 20 minutes ≈ 17MB — download 17MB to stay under both limits
    const MAX_BYTES = 17 * 1024 * 1024;
    const audioRes = await fetch(ff.audio_url, {
      headers: { Range: `bytes=0-${MAX_BYTES - 1}` },
    });

    if (!audioRes.ok && audioRes.status !== 206) {
      return NextResponse.json({
        error: "Audio download failed",
        status: audioRes.status,
        statusText: audioRes.statusText,
      });
    }

    let audioBuffer = Buffer.from(await audioRes.arrayBuffer());
    const rangeUsed = audioRes.status === 206;

    // Truncate on last valid MP3 frame boundary if needed
    if (audioBuffer.byteLength > MAX_BYTES || rangeUsed) {
      audioBuffer = truncateToMp3Frame(audioBuffer);
    }

    const sizeMB = (audioBuffer.byteLength / 1024 / 1024).toFixed(2);

    // Step 3: Send to OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not set" });

    const file = await toFile(audioBuffer, "meeting.mp3", { type: "audio/mpeg" });
    const openai = new OpenAI({ apiKey });

    const startTime = Date.now();
    const model = req.nextUrl.searchParams.get("model") ?? "gpt-4o-transcribe";
    const isWhisper = model === "whisper-1";

    // gpt-4o-transcribe only supports "json" format; whisper-1 supports "verbose_json"
    const result = await openai.audio.transcriptions.create({
      file,
      model,
      language: "nl",
      ...(isWhisper
        ? { response_format: "verbose_json", timestamp_granularities: ["segment"] }
        : { response_format: "json" }),
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Step 4: Build Fireflies text for same time range
    const openaiDuration = result.duration ?? 0;
    const ffSentences = ff.sentences.filter((s) => s.start_time <= openaiDuration);
    const ffText = ffSentences.map((s) => s.text).join(" ");
    const openaiText = result.text;

    // Simple word count comparison
    const ffWordCount = ffText.split(/\s+/).filter(Boolean).length;
    const openaiWordCount = openaiText.split(/\s+/).filter(Boolean).length;

    return NextResponse.json({
      version: "v2",
      meeting: { id: ff.id, title: ff.title },
      audio: {
        downloaded_mb: sizeMB,
        range_used: rangeUsed,
        openai_duration_seconds: openaiDuration,
        openai_duration_minutes: Math.round(openaiDuration / 60),
      },
      transcription: {
        model,
        elapsed: `${elapsed}s`,
        openai_words: openaiWordCount,
        fireflies_words: ffWordCount,
        openai_sample: openaiText.substring(0, 500),
        fireflies_sample: ffText.substring(0, 500),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message, version: "v3" });
  }
}

/**
 * Strip ID3 tags and truncate to last complete MP3 frame.
 * Returns raw MP3 frame data without metadata headers that may
 * contain duration info conflicting with truncated content.
 */
function truncateToMp3Frame(buf: Buffer<ArrayBuffer>): Buffer<ArrayBuffer> {
  // Strip ID3v2 tag at the start if present
  let dataStart = 0;
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    const size =
      ((buf[6] & 0x7f) << 21) |
      ((buf[7] & 0x7f) << 14) |
      ((buf[8] & 0x7f) << 7) |
      (buf[9] & 0x7f);
    dataStart = 10 + size;
  }

  // Find first actual MP3 frame sync after ID3
  let frameStart = dataStart;
  for (let i = dataStart; i < buf.byteLength - 1; i++) {
    if (buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0) {
      frameStart = i;
      break;
    }
  }

  // Scan backwards from end to find last complete frame sync
  let frameEnd = buf.byteLength;
  for (let i = buf.byteLength - 2; i > frameStart; i--) {
    if (buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0) {
      frameEnd = i;
      break;
    }
  }

  // Return raw MP3 frames without ID3 header
  return Buffer.from(buf.buffer, buf.byteOffset + frameStart, frameEnd - frameStart);
}
