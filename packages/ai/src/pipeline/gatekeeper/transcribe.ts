import { runTranscribeStep } from "../steps/transcribe";
import { runSpeakerMappingStep } from "../steps/speaker-mapping";
import type { MeetingInput, TranscribePhaseResult } from "./types";

export interface TranscribePhaseOutcome extends TranscribePhaseResult {
  errors: string[];
}

/**
 * Fase 3 — Transcribe: ElevenLabs Scribe v2 transcriptie + speaker-mapping.
 * Beide stappen never-throw; bij falen valt de pijplijn terug op de raw
 * Fireflies-transcript zodat downstream agents door kunnen draaien.
 */
export async function runTranscribePhase(
  input: MeetingInput,
  meetingId: string,
): Promise<TranscribePhaseOutcome> {
  const errors: string[] = [];

  const transcribeResult = await runTranscribeStep(meetingId, input.audio_url);
  if (transcribeResult.error) errors.push(`ElevenLabs: ${transcribeResult.error}`);

  let namedTranscript: string | null = null;
  if (transcribeResult.transcript) {
    const speakerMappingResult = await runSpeakerMappingStep({
      meetingId,
      elevenLabsTranscript: transcribeResult.transcript,
      firefliesTranscript: input.transcript,
    });
    if (speakerMappingResult.error) errors.push(`Speaker-mapping: ${speakerMappingResult.error}`);
    namedTranscript = speakerMappingResult.named_transcript;
  }

  const bestTranscript = namedTranscript ?? transcribeResult.transcript ?? input.transcript;
  const transcriptSource: TranscribePhaseResult["transcriptSource"] = namedTranscript
    ? "elevenlabs_named"
    : transcribeResult.transcript
      ? "elevenlabs"
      : "fireflies";

  return {
    bestTranscript,
    transcriptSource,
    elevenLabsTranscribed: transcribeResult.success,
    errors,
  };
}
