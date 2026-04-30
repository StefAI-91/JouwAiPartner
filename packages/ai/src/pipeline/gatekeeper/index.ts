import { runClassifyPhase } from "./classify";
import { runPersistPhase } from "./persist-meeting";
import { runTranscribePhase } from "./transcribe";
import { runDetectThemesPhase } from "./detect-themes";
import { runExtractPhase } from "./extract";
import { runFinalizePhase } from "./finalize";
import type { MeetingInput, PipelineResult } from "./types";

export type { MeetingInput, PipelineResult } from "./types";

/**
 * Full meeting processing pipeline:
 *  1. classify       — participants + speaker-map + Gatekeeper-agent + party type
 *  2. persist        — organisatie-resolutie + insert meeting + match participants
 *  3. transcribe     — ElevenLabs Scribe + speaker-mapping (non-blocking)
 *  4. detect-themes  — Theme-Detector (skip <relevance 0.4)
 *  5. extract        — Summarizer + Risk-/ActionItem-Specialist (parallel)
 *  6. finalize       — title + tag-and-segment + link-themes (parallel met embed) + embed
 *
 * Skip-paden:
 * - **Insert failure** in fase 2 → early-return met lege metrics + 1 error.
 *   Volgende fases hebben de meetingId nodig en kunnen zonder niet draaien.
 * - **Lage relevance-score** (`< 0.4`) → fase 4 detector + fase 6 link-themes
 *   slaan beide over. Symmetrisch: één skipt zonder de ander zou link-themes
 *   over lege detector-output looped, of de detector zou onnodig draaien.
 */
export async function processMeeting(input: MeetingInput): Promise<PipelineResult> {
  const errors: string[] = [];

  // Fase 1
  const classify = await runClassifyPhase(input);

  // Fase 2 — early-return bij insert-failure
  const persist = await runPersistPhase(input, classify);
  if (!persist.ok) {
    return {
      gatekeeper: classify.gatekeeperResult,
      partyType: classify.partyType,
      identifiedProjects: classify.identifiedProjects,
      meetingId: null,
      extractions_saved: 0,
      segments_saved: 0,
      embedded: false,
      elevenlabs_transcribed: false,
      summarized: false,
      themes_tagged: 0,
      themes_proposals: 0,
      errors: [`Meeting insert: ${persist.error}`],
    };
  }
  const { meetingId } = persist.result;

  // Fase 3
  const transcribe = await runTranscribePhase(input, meetingId);
  errors.push(...transcribe.errors);

  // Fase 4
  const detectThemes = await runDetectThemesPhase(input, classify, meetingId);
  errors.push(...detectThemes.errors);

  // Fase 5
  const extract = await runExtractPhase(input, classify, transcribe, detectThemes, meetingId);
  errors.push(...extract.errors);

  // Fase 6
  const finalize = await runFinalizePhase(input, classify, persist.result, detectThemes, extract);
  errors.push(...finalize.errors);

  return {
    gatekeeper: classify.gatekeeperResult,
    partyType: classify.partyType,
    identifiedProjects: classify.identifiedProjects,
    meetingId,
    extractions_saved: 0,
    segments_saved: finalize.segmentsSaved,
    embedded: finalize.embedded,
    elevenlabs_transcribed: transcribe.elevenLabsTranscribed,
    summarized: extract.summarized,
    themes_tagged: finalize.themesTagged,
    themes_proposals: finalize.themesProposals,
    errors,
  };
}
