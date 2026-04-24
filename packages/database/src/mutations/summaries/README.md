# mutations/summaries/

Write-operaties rond de `summaries` tabel. Deur via `export *`.

## Bestanden

| File                     | Wat                                                                           | Hoofdexports                               |
| ------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------ |
| `index.ts`               | Deur — re-export van core + management-insights                               | —                                          |
| `core.ts`                | Generic `createSummaryVersion()` voor elk `summary_type`                      | `createSummaryVersion`                     |
| `management-insights.ts` | Management-insights save + dismissInsight (wrapper rond createSummaryVersion) | `saveManagementInsights`, `dismissInsight` |

## Imports

```ts
import { createSummaryVersion } from "@repo/database/mutations/summaries";
import { saveManagementInsights } from "@repo/database/mutations/summaries/management-insights";
```

## Mirror

Queries-tegenhanger: `packages/database/src/queries/summaries/`.
