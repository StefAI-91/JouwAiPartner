import { runGenerateTitleStep } from "../steps/generate-title";
import { runTagAndSegmentStep } from "../steps/tag-and-segment";
import { runEmbedStep } from "../steps/embed";
import { runLinkThemesStep } from "../steps/link-themes";
import type {
  ClassifyResult,
  DetectThemesResult,
  ExtractResult,
  MeetingInput,
  PersistResult,
} from "./types";

export interface FinalizeResult {
  segmentsSaved: number;
  themesTagged: number;
  themesProposals: number;
  embedded: boolean;
  errors: string[];
}

/**
 * Fase 6 — Finalize: title-generation, tag-and-segment, await specialists,
 * link-themes (parallel met embed) en embed.
 *
 * Skip-pad: bij `detectThemes.shouldDetectThemes === false` wordt link-themes
 * overgeslagen — zelfde drempel als de detector zelf in fase 4. Dit voorkomt
 * dat link-themes over een lege detector-output looped voor niets.
 */
export async function runFinalizePhase(
  input: MeetingInput,
  classify: ClassifyResult,
  persist: PersistResult,
  detectThemes: DetectThemesResult,
  extract: ExtractResult,
): Promise<FinalizeResult> {
  const errors: string[] = [];

  const titleResult = await runGenerateTitleStep({
    meetingId: persist.meetingId,
    richSummary: extract.richSummary,
    fallbackSummary: input.summary,
    meetingType: classify.finalMeetingType,
    partyType: classify.partyType,
    organizationName: persist.organizationMatched
      ? (persist.knownOrgName ?? classify.gatekeeperResult.organization_name)
      : (classify.gatekeeperResult.organization_name ?? null),
    projects: classify.entityContext.projects.map((p) => ({ id: p.id, name: p.name })),
    identifiedProjects: classify.identifiedProjects,
  });
  if (titleResult.error) errors.push(`Title generation: ${titleResult.error}`);

  const tagResult = await runTagAndSegmentStep({
    meetingId: persist.meetingId,
    organizationId: persist.organizationId,
    kernpunten: extract.kernpunten,
    vervolgstappen: extract.vervolgstappen,
    identifiedProjects: classify.identifiedProjects,
    knownProjects: classify.entityContext.projects.map((p) => ({
      id: p.id,
      name: p.name,
      aliases: p.aliases,
    })),
  });
  errors.push(...tagResult.errors);

  // TH-011 FUNC-284 + sprint 041: await beide specialists zodat alle
  // extractions — risks + action_items — zijn weggeschreven voordat
  // link-themes de extraction.content parset op [Themes:] annotaties en
  // voordat embed (hieronder) ze oppikt. Beide steps zijn never-throws.
  await Promise.all([extract.riskSpecialistPromise, extract.actionItemSpecialistPromise]);

  // link-themes parallel met embed-save. Skip bij lage relevance_score
  // (FUNC-276) — detector is in fase 4 ook overgeslagen, dus output is
  // leeg en link zou niks doen. Never-throws.
  const linkThemesPromise = detectThemes.shouldDetectThemes
    ? runLinkThemesStep({
        meetingId: persist.meetingId,
        detectorOutput: detectThemes.detectorOutput,
        kernpunten: extract.kernpunten,
        vervolgstappen: extract.vervolgstappen,
        // MB-1: verified-themes-lijst die de Detector al ophaalde.
        verifiedThemes: detectThemes.verifiedThemes,
        // TH-013 (FUNC-292): Summarizer's per-theme markdown wint boven
        // Detector's 1-2 zins summary. Leeg bij Summarizer-failure → link-
        // themes fallt automatisch terug op Detector-output.
        summarizerThemeSummaries: extract.themeSummaries,
      })
    : Promise.resolve({
        success: true,
        matches_saved: 0,
        proposals_saved: 0,
        extraction_matches_saved: 0,
        themes_considered: 0,
        error: null,
        skipped: "low_relevance",
      } as const);

  const embedResult = await runEmbedStep(persist.meetingId);
  if (embedResult.error) errors.push(`Embedding: ${embedResult.error}`);

  const linkThemesResult = await linkThemesPromise;
  if (linkThemesResult.error) errors.push(`LinkThemes: ${linkThemesResult.error}`);

  return {
    segmentsSaved: tagResult.segmentsSaved,
    themesTagged: linkThemesResult.matches_saved,
    themesProposals: linkThemesResult.proposals_saved,
    embedded: embedResult.success,
    errors,
  };
}
