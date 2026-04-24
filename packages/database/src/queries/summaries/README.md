# queries/summaries/

Alle read-queries rond de `summaries` tabel. Eén tabel, meerdere
`summary_type` waarden (context, briefing, weekly, management_insights).
Deur via `export *` van alle sub-files.

## Bestanden

| File                     | Wat                                                                          | Hoofdexports                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `index.ts`               | Deur — re-export van alle sub-files                                          | —                                                                                            |
| `core.ts`                | Generic summary-lookup (elk `summary_type`). Basis voor de andere sub-files. | `SummaryRow`, `getLatestSummary`, `getSummaryHistory`                                        |
| `weekly.ts`              | Wekelijkse project-data + weekly summaries. Haalt via `getLatestSummary`.    | `WeeklyProjectData`, `getWeeklyProjectData`, `getLatestWeeklySummary`, `listWeeklySummaries` |
| `management-insights.ts` | Management dashboard insights + dismissed-keys per user.                     | `getManagementInsights`, `getDismissedInsightKeys`                                           |

## Imports

```ts
// Standaard — via de deur (compat met oude paden)
import { getLatestSummary } from "@repo/database/queries/summaries";

// Fine-grained
import { getWeeklyProjectData } from "@repo/database/queries/summaries/weekly";
import { getManagementInsights } from "@repo/database/queries/summaries/management-insights";
```

## Cross-package

Mutations in `packages/database/src/mutations/summaries.ts` en
`management-insights.ts`. Constants (bv. `MANAGEMENT_INSIGHTS_ENTITY_ID`)
in `packages/database/src/constants/summaries.ts`. AI-pipelines in
`packages/ai/src/pipeline/summary-pipeline.ts` en
`weekly-summary-pipeline.ts`.
