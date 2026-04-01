import OpenAI, { toFile } from "openai";

export interface TranscriptionResult {
  text: string;
  segments: {
    text: string;
    start: number;
    end: number;
  }[];
  language: string;
  duration: number;
}

export interface AudioProbe {
  status: number;
  content_type: string | null;
  content_length: string | null;
  size_mb: number | null;
}

/**
 * Probe audio URL without downloading — returns content-type and size.
 */
export async function probeAudioUrl(audioUrl: string): Promise<AudioProbe> {
  // Some CDNs don't support HEAD, so do a range request for first byte
  const res = await fetch(audioUrl, {
    headers: { Range: "bytes=0-0" },
  });
  const contentLength = res.headers.get("content-length") ?? res.headers.get("content-range")?.split("/")[1] ?? null;
  return {
    status: res.status,
    content_type: res.headers.get("content-type"),
    content_length: contentLength,
    size_mb: contentLength ? Math.round((Number(contentLength) / 1024 / 1024) * 100) / 100 : null,
  };
}

/**
 * Download audio from URL and transcribe with OpenAI gpt-4o-transcribe.
 * Returns full text + timestamped segments.
 */
export async function transcribeAudioUrl(
  audioUrl: string,
  options?: { language?: string; prompt?: string },
): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  // Download audio
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio: ${audioResponse.status} ${audioResponse.statusText}`);
  }

  const contentType = audioResponse.headers.get("content-type") ?? "audio/mpeg";
  const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

  const sizeMB = (audioBuffer.byteLength / 1024 / 1024).toFixed(2);
  if (audioBuffer.byteLength > 25 * 1024 * 1024) {
    throw new Error(`Audio file too large for OpenAI (${sizeMB}MB, max 25MB)`);
  }

  // Determine extension from content-type or URL
  const urlPath = new URL(audioUrl).pathname.toLowerCase();
  let ext = "mp3";
  if (contentType.includes("mp4") || contentType.includes("m4a") || urlPath.endsWith(".m4a")) {
    ext = "m4a";
  } else if (contentType.includes("wav") || urlPath.endsWith(".wav")) {
    ext = "wav";
  } else if (contentType.includes("webm") || urlPath.endsWith(".webm")) {
    ext = "webm";
  } else if (contentType.includes("ogg") || urlPath.endsWith(".ogg")) {
    ext = "ogg";
  } else if (contentType.includes("flac") || urlPath.endsWith(".flac")) {
    ext = "flac";
  }

  // Use OpenAI's toFile helper for proper multipart upload
  const file = await toFile(audioBuffer, `meeting.${ext}`, { type: contentType });

  const openai = new OpenAI({ apiKey });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "gpt-4o-transcribe",
    language: options?.language ?? "nl",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
    prompt: options?.prompt,
  });

  return {
    text: transcription.text,
    segments: (transcription.segments ?? []).map((s) => ({
      text: s.text,
      start: s.start,
      end: s.end,
    })),
    language: transcription.language ?? "nl",
    duration: transcription.duration ?? 0,
  };
}
