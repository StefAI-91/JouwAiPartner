import { emptyResult, fetchLinkThemesInput, isEmptyInput } from "./fetch-input";
import { resolveProposals } from "./resolve-proposals";
import { buildExtractionThemes, buildMeetingThemes } from "./build-meeting-themes";
import { persistResults } from "./persist";
import type { LinkThemesResult, LinkThemesStepInput } from "./types";

export type {
  LinkThemesStepInput,
  LinkThemesResult,
  MeetingThemeToWrite,
  ProposalToCreate,
  SkippedDueToRejection,
  PreviewResult,
} from "./types";

/**
 * TH-011 (FUNC-270..276, FUNC-281) — orchestreert de fases van link-themes.
 *
 * Never-throws. Een crash hier mag de rest van de pipeline niet breken
 * (analoog aan `runTagThemesStep` — theme-linking is niet-kritiek).
 */
export async function runLinkThemesStep(input: LinkThemesStepInput): Promise<LinkThemesResult> {
  const persist = input.persist ?? true;

  try {
    const { extractionRows, rejectedThemeIds, verifiedThemes } = await fetchLinkThemesInput(input);

    if (isEmptyInput(input, verifiedThemes)) {
      return emptyResult(persist, 0, "empty_input");
    }

    const proposalsToCreate = resolveProposals(input.detectorOutput, verifiedThemes);
    const { meetingThemesToWrite, skippedDueToRejection } = buildMeetingThemes(
      input,
      verifiedThemes,
      rejectedThemeIds,
    );
    const extractionThemesToWrite = buildExtractionThemes(
      input.detectorOutput,
      verifiedThemes,
      extractionRows,
      rejectedThemeIds,
    );
    const themesConsidered = verifiedThemes.length;

    if (!persist) {
      return {
        success: true,
        matches_saved: 0,
        proposals_saved: 0,
        extraction_matches_saved: 0,
        themes_considered: themesConsidered,
        error: null,
        preview: {
          meetingThemesToWrite,
          extractionThemesToWrite,
          proposalsToCreate,
          skippedDueToRejection,
          themesConsidered,
        },
      };
    }

    return persistResults({
      meetingId: input.meetingId,
      replace: input.replace ?? false,
      themesConsidered,
      proposalsToCreate,
      meetingThemesToWrite,
      extractionThemesToWrite,
      skippedDueToRejection,
      rejectedThemeIds,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[link-themes] non-blocking failure:", msg);
    return {
      success: false,
      matches_saved: 0,
      proposals_saved: 0,
      extraction_matches_saved: 0,
      themes_considered: 0,
      error: msg,
    };
  }
}
