import { transcribeWithElevenLabs, formatScribeTranscript } from "../../transcribe-elevenlabs";
import { updateMeetingElevenLabs } from "@repo/database/mutations/meetings";

export interface TranscribeResult {
  success: boolean;
  transcript: string | null;
  error: string | null;
}

/**
 * Run ElevenLabs Scribe v2 transcription and persist to database.
 * Non-blocking: returns error info instead of throwing.
 */
export async function runTranscribeStep(
  meetingId: string,
  audioUrl: string | undefined,
): Promise<TranscribeResult> {
  if (!audioUrl) {
    return { success: false, transcript: null, error: null };
  }

  try {
    console.info("Starting ElevenLabs Scribe v2 transcription...");
    const scribeResult = await transcribeWithElevenLabs(audioUrl);
    const transcript = formatScribeTranscript(scribeResult.words);

    const updateResult = await updateMeetingElevenLabs(meetingId, {
      transcript_elevenlabs: transcript,
      raw_elevenlabs: scribeResult.raw as unknown as Record<string, unknown>,
      audio_url: audioUrl,
    });

    if ("error" in updateResult) {
      console.error("Failed to save ElevenLabs transcript:", updateResult.error);
      return { success: false, transcript, error: updateResult.error };
    }

    console.info(
      `ElevenLabs Scribe v2: transcribed ${scribeResult.words.length} words, ` +
        `language: ${scribeResult.languageCode} (${(scribeResult.languageProbability * 100).toFixed(1)}% confidence)`,
    );
    return { success: true, transcript, error: null };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("ElevenLabs transcription failed (non-blocking):", errMsg);
    return { success: false, transcript: null, error: errMsg };
  }
}
