import { getMeetingExtractions } from "@repo/database/queries/meetings";
import { listVerifiedThemes, type ThemeRow } from "@repo/database/queries/themes";
import { listRejectedThemePairsForMeeting } from "@repo/database/queries/themes/review";
import type { LinkThemesStepInput, LinkThemesResult } from "./types";

export interface FetchedInput {
  extractionRows: Awaited<ReturnType<typeof getMeetingExtractions>>;
  rejectedThemeIds: Set<string>;
  verifiedThemes: ThemeRow[];
}

/**
 * MB-1 — hergebruik caller's themes-lijst waar mogelijk. Alleen fetchen
 * als de caller geen cache meegaf (bv. tijdens regenerate of de
 * batch-script die niet via de main pipeline draait).
 */
export async function fetchLinkThemesInput(input: LinkThemesStepInput): Promise<FetchedInput> {
  const [extractionRows, rejectedThemeIds, fetchedThemes] = await Promise.all([
    getMeetingExtractions(input.meetingId),
    listRejectedThemePairsForMeeting(input.meetingId),
    input.verifiedThemes ? Promise.resolve(input.verifiedThemes) : listVerifiedThemes(),
  ]);
  return {
    extractionRows,
    rejectedThemeIds,
    verifiedThemes: fetchedThemes,
  };
}

/**
 * Lege catalogus + geen detector-output → niks te doen. Consistent met
 * de oude `empty_themes_catalog` skip.
 */
export function isEmptyInput(input: LinkThemesStepInput, verifiedThemes: ThemeRow[]): boolean {
  return (
    verifiedThemes.length === 0 &&
    input.detectorOutput.identified_themes.length === 0 &&
    input.detectorOutput.proposed_themes.length === 0
  );
}

export function emptyResult(
  persist: boolean,
  themesConsidered: number,
  skipped: string,
): LinkThemesResult {
  const base = {
    success: true as const,
    matches_saved: 0,
    proposals_saved: 0,
    extraction_matches_saved: 0,
    themes_considered: themesConsidered,
    error: null,
    skipped,
  };
  if (!persist) {
    return {
      ...base,
      preview: {
        meetingThemesToWrite: [],
        extractionThemesToWrite: [],
        proposalsToCreate: [],
        skippedDueToRejection: [],
        themesConsidered,
      },
    };
  }
  return base;
}
