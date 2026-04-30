import { runThemeDetectorStep } from "../steps/theme-detector";
import { THEME_DETECTOR_MIN_RELEVANCE } from "./constants";
import type { ClassifyResult, DetectThemesResult, MeetingInput } from "./types";

export interface DetectThemesPhaseOutcome extends DetectThemesResult {
  errors: string[];
}

/**
 * Fase 4 — Theme-Detector: blokkerend, draait NA Gatekeeper en VÓÓR Summarizer
 * + RiskSpecialist (TH-011 FUNC-276).
 *
 * Skip-pad: meetings met `relevance_score < THEME_DETECTOR_MIN_RELEVANCE` slaan
 * de detector over en geven lege output terug. Dezelfde drempel triggert later
 * in `finalize` ook de skip van link-themes — beide takken horen synchroon te
 * blijven anders schrijft link-themes voor niets, of mist de detector een run.
 */
export async function runDetectThemesPhase(
  input: MeetingInput,
  classify: ClassifyResult,
  meetingId: string,
): Promise<DetectThemesPhaseOutcome> {
  const errors: string[] = [];
  const shouldDetectThemes =
    classify.gatekeeperResult.relevance_score >= THEME_DETECTOR_MIN_RELEVANCE;

  const themeDetectorResult = shouldDetectThemes
    ? await runThemeDetectorStep({
        meeting: {
          meetingId,
          title: input.title,
          meeting_type: classify.finalMeetingType,
          party_type: classify.partyType,
          participants: input.participants,
          summary: input.summary,
          identifiedProjects: classify.identifiedProjects.map((p) => ({
            project_name: p.project_name,
            project_id: p.project_id,
          })),
        },
      })
    : {
        success: true,
        output: { identified_themes: [], proposed_themes: [] },
        themes_considered: 0,
        verifiedThemes: [],
        error: null,
      };
  if (themeDetectorResult.error) errors.push(`ThemeDetector: ${themeDetectorResult.error}`);

  // MB-1: hergebruik de verifiedThemes uit de detector-step zodat we
  // geen tweede DB-call hoeven voor het name/description-mapping.
  const detectorIdentifiedThemeIds = new Set(
    themeDetectorResult.output.identified_themes.map((t) => t.themeId),
  );
  // TH-013 — Summarizer krijgt ook `themeId` (UUID) mee zodat hij die in
  // `theme_summaries[i].themeId` kan terugteruggeven. RiskSpecialist heeft
  // die niet nodig (werkt alleen met namen voor risk-annotaties).
  const identifiedThemesForSummarizer: { themeId: string; name: string; description: string }[] =
    detectorIdentifiedThemeIds.size > 0
      ? themeDetectorResult.verifiedThemes
          .filter((t) => detectorIdentifiedThemeIds.has(t.id))
          .map((t) => ({ themeId: t.id, name: t.name, description: t.description }))
      : [];

  const identifiedThemesForRisk: { name: string; description: string }[] =
    identifiedThemesForSummarizer.map((t) => ({ name: t.name, description: t.description }));

  return {
    detectorOutput: themeDetectorResult.output,
    verifiedThemes: themeDetectorResult.verifiedThemes,
    identifiedThemesForSummarizer,
    identifiedThemesForRisk,
    shouldDetectThemes,
    errors,
  };
}
