import OpenAI from "openai";

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

  // Download audio to buffer
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio: ${audioResponse.status} ${audioResponse.statusText}`);
  }

  const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
  const audioFile = new File([audioBuffer], "meeting.mp3", { type: "audio/mpeg" });

  const openai = new OpenAI({ apiKey });

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
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
