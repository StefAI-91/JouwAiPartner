# queries/themes/

Alle read-queries voor het themes-domein. Eén deur (`index.ts`), vier
content-files, één privé helper-file.

## Bestanden

| File           | Wat                                                                                                                             | Publieke API                                                                                                                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`     | Deur — re-exporteert alles uit core/dashboard/detail/review                                                                     | (zie de andere files)                                                                                                                                                                                          |
| `core.ts`      | Base types + queries                                                                                                            | `ThemeRow`, `ThemeRejectionExample`, `ThemeWithNegativeExamples`, `ListVerifiedThemesOptions`, `listVerifiedThemes`, `getThemeBySlug`                                                                          |
| `dashboard.ts` | Pills + donut op het dashboard                                                                                                  | `listTopActiveThemes`, `getThemeShareDistribution`, `fetchWindowAggregation`, `TopActiveTheme`, `ThemeShareSlice`, `ThemeShareDistribution`, `WindowAggregation`                                               |
| `detail.ts`    | Theme detail-page tabs (overview, meetings, decisions, participants)                                                            | `getThemeRecentActivity`, `getThemeMeetings`, `getThemeDecisions`, `getThemeParticipants`, `ThemeRecentActivity`, `ThemeMeetingEntry`, `ThemeMeetingExtraction`, `ThemeDecisionEntry`, `ThemeParticipantEntry` |
| `review.ts`    | Review-flow (emerging themes, proposals, rejections)                                                                            | `listEmergingThemes`, `listProposedThemesForMeeting`, `listRejectedThemePairsForMeeting`, `EmergingThemeRow`, `EmergingThemeProposalMeeting`                                                                   |
| `internals.ts` | **Privé** — gedeelde column-lijst, window-helpers, `fetchWindowAggregation`-implementatie. Niet via `index.ts` re-geëxporteerd. | `THEME_COLUMNS_BASIC`, `THEME_COLUMNS_FULL`, `THEME_COLUMNS`, `NEGATIVE_EXAMPLES_PER_THEME`, `DEFAULT_WINDOW_DAYS`, `windowStartIso`, `ThemeBasicRow`, `WindowAggregation`, `fetchWindowAggregation`           |

## Imports

```ts
// Standaard — via de deur
import { listVerifiedThemes, type ThemeRow } from "@repo/database/queries/themes";

// Fine-grained — alleen als je wilt afdwingen welke sub-file je raakt
// (bv. een test die alleen review-queries mockt)
import { listRejectedThemePairsForMeeting } from "@repo/database/queries/themes/review";
```

## Mutations + cross-package

Mutations staan in `packages/database/src/mutations/themes.ts`,
`meeting-themes.ts`, `extraction-themes.ts`. AI-pipeline + agents in
`packages/ai/src/pipeline/steps/theme-detector.ts`, `link-themes.ts` en
`packages/ai/src/agents/theme-detector.ts`.
