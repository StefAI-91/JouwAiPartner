import { runSummarizeStep } from "../steps/summarize";
import { runRiskSpecialistStep } from "../steps/risk-specialist";
import {
  runActionItemSpecialistStep,
  buildActionItemParticipants,
} from "../steps/action-item-specialist";
import type {
  ClassifyResult,
  DetectThemesResult,
  ExtractResult,
  MeetingInput,
  TranscribePhaseResult,
} from "./types";

export interface ExtractPhaseOutcome extends ExtractResult {
  errors: string[];
}

/**
 * Fase 5 — Extract: Summarizer (await), RiskSpecialist + ActionItemSpecialist
 * (parallel-launched, awaited in finalize). De specialists worden hier al
 * gestart zodat ze parallel aan Summarizer + tagger kunnen lopen.
 *
 * **Transcript-keuze.** ActionItemSpecialist krijgt expliciet `input.transcript`
 * (Fireflies) — NIET `bestTranscript`. Reden: de specialist matcht op letterlijke
 * `source_quote` en speaker-mapping introduceert drift in named-transcripts.
 * Zie sprint 041 + `docs/stand-van-zaken.md` regels 95 + 159 + 165. Heroverwegen
 * wanneer speaker-mapping ≥95% naam-attributie haalt over een grotere batch.
 */
export async function runExtractPhase(
  input: MeetingInput,
  classify: ClassifyResult,
  transcribe: TranscribePhaseResult,
  detectThemes: DetectThemesResult,
  meetingId: string,
): Promise<ExtractPhaseOutcome> {
  const errors: string[] = [];

  const summarizeContext = {
    title: input.title,
    meeting_type: classify.finalMeetingType,
    party_type: classify.partyType,
    participants: input.participants,
    speakerContext: classify.speakerContext,
    entityContext: classify.entityContext.contextString,
    identified_themes: detectThemes.identifiedThemesForSummarizer,
  };

  // RiskSpecialist parallel-launch — schrijft naar `extractions` (UI) +
  // `experimental_risk_extractions` (audit). Awaited in finalize-fase.
  const riskSpecialistPromise = runRiskSpecialistStep(
    meetingId,
    transcribe.bestTranscript,
    {
      title: input.title,
      meeting_type: classify.finalMeetingType,
      party_type: classify.partyType,
      participants: input.participants,
      speakerContext: classify.speakerContext,
      entityContext: classify.entityContext.contextString,
      meeting_date: input.date,
      identified_projects: classify.identifiedProjects.map((p) => ({
        project_name: p.project_name,
        project_id: p.project_id,
      })),
      identified_themes: detectThemes.identifiedThemesForRisk,
    },
    classify.identifiedProjects,
  );

  // ActionItemSpecialist parallel-launch — bewust op input.transcript (zie
  // doc-comment hierboven).
  const actionItemMeetingDate = new Date(Number(input.date)).toISOString().slice(0, 10);
  const actionItemSpecialistPromise = runActionItemSpecialistStep(
    meetingId,
    input.transcript,
    {
      title: input.title,
      meeting_type: classify.finalMeetingType,
      party_type: classify.partyType,
      meeting_date: actionItemMeetingDate,
      participants: buildActionItemParticipants(input.participants, classify.knownPeople),
    },
    classify.identifiedProjects,
  );

  console.info(`Summarizer using ${transcribe.transcriptSource} transcript`);
  const summarizeResult = await runSummarizeStep(
    meetingId,
    transcribe.bestTranscript,
    summarizeContext,
  );
  if (summarizeResult.error) errors.push(`Summarizer: ${summarizeResult.error}`);

  return {
    summarized: summarizeResult.success,
    richSummary: summarizeResult.richSummary,
    kernpunten: summarizeResult.kernpunten,
    vervolgstappen: summarizeResult.vervolgstappen,
    themeSummaries: summarizeResult.themeSummaries,
    riskSpecialistPromise,
    actionItemSpecialistPromise,
    errors,
  };
}
