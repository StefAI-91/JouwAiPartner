import type { ThemeRow } from "@repo/database/queries/themes";
import type { ThemeDetectorOutput } from "../../../validations/theme-detector";
import { normalizeName } from "./shared";
import type { ProposalToCreate } from "./types";

/**
 * Step 1 — proposals resolven.
 *
 * EDGE-232: proposal-naam matcht bestaande verified theme (case-insensitive)
 * → geen nieuwe theme, merge naar bestaand. `mergesIntoThemeId` is null
 * voor verse proposals; gevuld met de bestaande theme-id voor merges.
 */
export function resolveProposals(
  detectorOutput: ThemeDetectorOutput,
  verifiedThemes: ThemeRow[],
): ProposalToCreate[] {
  const verifiedThemesByNormalized = new Map<string, ThemeRow>();
  for (const t of verifiedThemes) {
    verifiedThemesByNormalized.set(normalizeName(t.name), t);
  }

  const proposalsToCreate: ProposalToCreate[] = [];
  for (const p of detectorOutput.proposed_themes) {
    const existing = verifiedThemesByNormalized.get(normalizeName(p.name));
    proposalsToCreate.push({
      name: p.name,
      description: p.description,
      matching_guide: p.matching_guide,
      emoji: p.emoji,
      evidence_quote: p.evidence_quote,
      mergesIntoThemeId: existing?.id ?? null,
    });
  }
  return proposalsToCreate;
}
