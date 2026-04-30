# pipeline/summary/

AI-summarization pipelines rond de `summaries` tabel. Deur via `export *`.

## Bestanden

| File                     | Wat                                                                       | Hoofdexports                                                                         |
| ------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `index.ts`               | Deur                                                                      | —                                                                                    |
| `core.ts`                | Shared types + pure helpers (geen DB/AI calls)                            | `formatMeetingForSummary`, `formatEmailForSummary`, `buildTimelineStructuredContent` |
| `project.ts`             | Project-summary generator (context + briefing)                            | `generateProjectSummaries`                                                           |
| `org.ts`                 | Org-summary generator (context + briefing + timeline)                     | `generateOrgSummaries`                                                               |
| `triggers.ts`            | Post-verification triggers per meeting/email — fan-out naar project + org | `triggerSummariesForMeeting`, `triggerSummariesForEmail`                             |
| `weekly.ts`              | Wekelijkse summary over alle actieve projecten                            | `generateWeeklySummary`                                                              |
| `management-insights.ts` | Management dashboard insights generator                                   | `generateManagementInsights`                                                         |

## Imports

```ts
import { generateProjectSummaries } from "@repo/ai/pipeline/summary/project";
import { generateOrgSummaries } from "@repo/ai/pipeline/summary/org";
import {
  triggerSummariesForMeeting,
  triggerSummariesForEmail,
} from "@repo/ai/pipeline/summary/triggers";
import { generateWeeklySummary } from "@repo/ai/pipeline/summary/weekly";
import { generateManagementInsights } from "@repo/ai/pipeline/summary/management-insights";
```

## Cross-package

Roept `@repo/ai/agents/{project-summarizer,weekly-summarizer,management-insights}`
aan voor de feitelijke LLM-prompts. Schrijft via
`@repo/database/mutations/summaries/` en leest context via
`@repo/database/queries/summaries/`.
