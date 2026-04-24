/**
 * Publieke deur voor het themes-domein. Consumers importeren via
 * `@repo/database/queries/themes` en krijgen alles uit core/dashboard/
 * detail/review. `internals.ts` blijft privé (gedeelde column-lijst,
 * window-helpers, fetchWindowAggregation-implementatie).
 *
 * Voor fine-grained imports kan ook direct uit een sub-file:
 * `@repo/database/queries/themes/review` etc.
 */

export {
  listVerifiedThemes,
  getThemeBySlug,
  type ThemeRow,
  type ThemeRejectionExample,
  type ThemeWithNegativeExamples,
  type ListVerifiedThemesOptions,
} from "./core";

export {
  listTopActiveThemes,
  getThemeShareDistribution,
  fetchWindowAggregation,
  type TopActiveTheme,
  type ThemeShareSlice,
  type ThemeShareDistribution,
  type WindowAggregation,
} from "./dashboard";

export {
  getThemeRecentActivity,
  getThemeMeetings,
  getThemeDecisions,
  getThemeParticipants,
  type ThemeRecentActivity,
  type ThemeMeetingEntry,
  type ThemeMeetingExtraction,
  type ThemeDecisionEntry,
  type ThemeParticipantEntry,
} from "./detail";

export {
  listEmergingThemes,
  listProposedThemesForMeeting,
  listRejectedThemePairsForMeeting,
  type EmergingThemeRow,
  type EmergingThemeProposalMeeting,
} from "./review";
