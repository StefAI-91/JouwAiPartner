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
  truncated?: boolean;
  originalSizeMB?: number;
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
  const res = await fetch(audioUrl, {
    headers: { Range: "bytes=0-0" },
  });
  const contentLength =
    res.headers.get("content-range")?.split("/")[1] ??
    res.headers.get("content-length") ??
    null;
  return {
    status: res.status,
    content_type: res.headers.get("content-type"),
    content_length: contentLength,
    size_mb: contentLength
      ? Math.round((Number(contentLength) / 1024 / 1024) * 100) / 100
      : null,
  };
}

const MAX_BYTES = 24 * 1024 * 1024; // 24MB — under OpenAI's 25MB limit

/**
 * Download audio from URL and transcribe with OpenAI gpt-4o-transcribe.
 * If the file is larger than 24MB, downloads only the first 24MB via Range request.
 */
export async function transcribeAudioUrl(
  audioUrl: string,
  options?: { language?: string; prompt?: string },
): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  // First, try Range request to limit download size
  const audioResponse = await fetch(audioUrl, {
    headers: { Range: `bytes=0-${MAX_BYTES - 1}` },
  });

  // If server doesn't support Range (returns 200 instead of 206), we get full file
  if (!audioResponse.ok && audioResponse.status !== 206) {
    throw new Error(
      `Failed to download audio: ${audioResponse.status} ${audioResponse.statusText}`,
    );
  }

  let audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

  const fullSize = audioResponse.headers.get("content-range")?.split("/")[1];
  const originalSizeMB = fullSize
    ? Number(fullSize) / 1024 / 1024
    : audioBuffer.byteLength / 1024 / 1024;
  const truncated = audioBuffer.byteLength < (fullSize ? Number(fullSize) : Infinity);

  // Safety: still truncate if Range wasn't honored
  if (audioBuffer.byteLength > MAX_BYTES) {
    audioBuffer = audioBuffer.subarray(0, MAX_BYTES);
  }

  // Force audio/mpeg MIME type — OpenAI may reject non-standard types like "audio/mp3"
  const file = await toFile(audioBuffer, "meeting.mp3", {
    type: "audio/mpeg",
  });

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
    truncated,
    originalSizeMB: Math.round(originalSizeMB * 100) / 100,
  };
}
