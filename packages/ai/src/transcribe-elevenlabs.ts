const ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";

export interface ScribeWord {
  text: string;
  start: number;
  end: number;
  type: "word" | "spacing" | "audio_event";
  speaker_id?: string;
}

export interface ScribeResponse {
  language_code: string;
  language_probability: number;
  text: string;
  words: ScribeWord[];
}

export interface TranscribeOptions {
  languageCode?: string;
  diarize?: boolean;
  timestampsGranularity?: "word" | "segment";
  tagAudioEvents?: boolean;
}

export interface TranscribeResult {
  text: string;
  words: ScribeWord[];
  languageCode: string;
  languageProbability: number;
  raw: ScribeResponse;
}

/**
 * Transcribe audio using ElevenLabs Scribe v2.
 * Sends a cloud storage URL (e.g. Fireflies audio_url) directly — no download needed.
 */
export async function transcribeWithElevenLabs(
  audioUrl: string,
  options?: TranscribeOptions,
): Promise<TranscribeResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

  const formData = new FormData();
  formData.append("model_id", "scribe_v2");
  formData.append("cloud_storage_url", audioUrl);
  formData.append("language_code", options?.languageCode ?? "nld");
  formData.append("diarize", String(options?.diarize ?? true));
  formData.append("timestamps_granularity", options?.timestampsGranularity ?? "word");
  formData.append("tag_audio_events", String(options?.tagAudioEvents ?? false));

  const response = await fetch(ELEVENLABS_STT_URL, {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "unknown");
    throw new Error(
      `ElevenLabs Scribe API error ${response.status}: ${errorBody}`,
    );
  }

  const data: ScribeResponse = await response.json();

  return {
    text: data.text,
    words: data.words,
    languageCode: data.language_code,
    languageProbability: data.language_probability,
    raw: data,
  };
}

/**
 * Format a Scribe transcription as speaker-labeled plain text.
 * Groups consecutive words by speaker_id into paragraphs.
 */
export function formatScribeTranscript(words: ScribeWord[]): string {
  if (words.length === 0) return "";

  const segments: { speaker: string; text: string }[] = [];
  let currentSpeaker = "";
  let currentText = "";

  for (const word of words) {
    if (word.type === "audio_event") continue;

    const speaker = word.speaker_id ?? "unknown";

    if (speaker !== currentSpeaker && word.type === "word") {
      if (currentText.trim()) {
        segments.push({ speaker: currentSpeaker, text: currentText.trim() });
      }
      currentSpeaker = speaker;
      currentText = word.text;
    } else {
      currentText += word.text;
    }
  }

  if (currentText.trim()) {
    segments.push({ speaker: currentSpeaker, text: currentText.trim() });
  }

  return segments.map((s) => `[${s.speaker}]: ${s.text}`).join("\n\n");
}
