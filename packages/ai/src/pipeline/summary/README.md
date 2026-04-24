# pipeline/summary/

AI-summarization pipelines rond de `summaries` tabel. Deur via `export *`.

## Bestanden

| File                     | Wat                                                                        | Hoofdexports                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `index.ts`               | Deur                                                                       | —                                                                                                            |
| `core.ts`                | Project- en org-summaries + trigger-helpers na approve (per meeting/email) | `generateProjectSummaries`, `generateOrgSummaries`, `triggerSummariesForMeeting`, `triggerSummariesForEmail` |
| `weekly.ts`              | Wekelijkse summary over alle actieve projecten                             | `generateWeeklySummary`                                                                                      |
| `management-insights.ts` | Management dashboard insights generator                                    | `generateManagementInsights`                                                                                 |

## Imports

```ts
import { triggerSummariesForMeeting } from "@repo/ai/pipeline/summary/core";
import { generateWeeklySummary } from "@repo/ai/pipeline/summary/weekly";
import { generateManagementInsights } from "@repo/ai/pipeline/summary/management-insights";
```

## Cross-package

Roept `@repo/ai/agents/{project-summarizer,weekly-summarizer,management-insights}`
aan voor de feitelijke LLM-prompts. Schrijft via
`@repo/database/mutations/summaries/` en leest context via
`@repo/database/queries/summaries/`.
