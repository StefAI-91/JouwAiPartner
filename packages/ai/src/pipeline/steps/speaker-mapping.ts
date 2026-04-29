import { applyMappingToTranscript, runSpeakerIdentifier } from "../../agents/speaker-identifier";
import { updateMeetingNamedTranscript } from "@repo/database/mutations/meetings";
import {
  getMeetingParticipantsForSpeakerMapping,
  type SpeakerMappingParticipant,
} from "@repo/database/queries/meetings/speaker-mapping";

export interface SpeakerMappingStepResult {
  /** True wanneer een named-versie is opgeslagen, ook als sommige speakers
   *  onder de drempel bleven (de overgebleven labels zijn dan letterlijk
   *  bewaard). */
  success: boolean;
  /** Aantal speakers in het ElevenLabs-transcript. */
  speaker_count: number;
  /** Aantal speakers waarvoor we een naam hebben kunnen toepassen
   *  (confidence ≥ drempel). */
  mapped_count: number;
  /** Eventuele fout-melding (DB, AI, parsing). Stap is niet-blokkerend; bij
   *  fout blijft `transcript_elevenlabs_named` leeg en valt iedereen terug
   *  op de raw `transcript_elevenlabs`. */
  error: string | null;
  /** De named-versie zelf — null bij fout. Pipeline kan deze direct
   *  doorgeven aan de Summarizer zodat we geen extra DB-roundtrip hoeven. */
  named_transcript: string | null;
}

/**
 * Run de speaker-identifier op een ElevenLabs-transcript en sla de named-
 * versie op in `meetings.transcript_elevenlabs_named`. Niet-blokkerend: een
 * fout (Anthropic 5xx, DB-error) wordt geretourneerd maar throwt niet,
 * zodat de gatekeeper-pipeline doorrolt op de raw versie.
 */
export async function runSpeakerMappingStep(input: {
  meetingId: string;
  elevenLabsTranscript: string | null;
  firefliesTranscript: string | null;
  /** Optioneel — als niet meegegeven, wordt 'm uit DB opgehaald. Pipeline
   *  geeft hem direct mee om een extra round-trip te besparen. */
  participants?: SpeakerMappingParticipant[];
}): Promise<SpeakerMappingStepResult> {
  if (!input.elevenLabsTranscript || input.elevenLabsTranscript.trim().length === 0) {
    return {
      success: false,
      speaker_count: 0,
      mapped_count: 0,
      error: null,
      named_transcript: null,
    };
  }

  try {
    const participants =
      input.participants ?? (await getMeetingParticipantsForSpeakerMapping(input.meetingId));

    if (participants.length === 0) {
      return {
        success: false,
        speaker_count: 0,
        mapped_count: 0,
        error: "no participants — speaker-mapping vereist deelnemers met name",
        named_transcript: null,
      };
    }

    const result = await runSpeakerIdentifier({
      transcript: input.elevenLabsTranscript,
      firefliesTranscript: input.firefliesTranscript,
      participants,
    });

    const named = applyMappingToTranscript(input.elevenLabsTranscript, result.mapping.mappings);
    const mappedCount = result.mapping.mappings.filter(
      (m) => m.person_name && m.confidence >= 0.6,
    ).length;

    const update = await updateMeetingNamedTranscript(input.meetingId, named);
    if ("error" in update) {
      return {
        success: false,
        speaker_count: result.debug.speaker_ids.length,
        mapped_count: mappedCount,
        error: `db: ${update.error}`,
        named_transcript: null,
      };
    }

    console.info(
      `Speaker-mapping: ${mappedCount}/${result.debug.speaker_ids.length} speakers gemapped`,
    );
    return {
      success: true,
      speaker_count: result.debug.speaker_ids.length,
      mapped_count: mappedCount,
      error: null,
      named_transcript: named,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Speaker-mapping failed (non-blocking):", msg);
    return {
      success: false,
      speaker_count: 0,
      mapped_count: 0,
      error: msg,
      named_transcript: null,
    };
  }
}
