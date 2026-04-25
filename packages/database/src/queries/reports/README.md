# queries/reports

Read-only data-laag voor project-rapportages. Primair geconsumeerd door de
MCP tools in `packages/mcp/src/tools/` zodat Claude Desktop een rapport kan
genereren. De functies zijn bewust generiek zodat een toekomstige UI-route
ze zonder refactor kan hergebruiken.

Reden voor cluster: 503 regels in de oude `reports.ts`, en twee duidelijke
sub-domeinen (issues vs project) die elk genoeg vlees hebben om eigen file
te krijgen.

## Sub-files

| File           | Rol                                                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `issues.ts`    | Issue-rapportage: `getProjectIssuesForReport`, `getIssueDetailForReport`.                                                                                              |
| `project.ts`   | Project-rapportage: `getProjectContextForReport`, `getProjectActivityForReport`.                                                                                       |
| `internals.ts` | Gedeelde helpers + types: `cutoffIsoFromDaysBack`, `mapIssueRow`, `IssueReportRow`, `PaginatedResult<T>`. Privé — niet via barrel re-exporteerd behalve de twee types. |
| `index.ts`     | Publieke deur — re-exporteert publieke API.                                                                                                                            |

## Import-patterns

```ts
// Default — barrel
import {
  getProjectIssuesForReport,
  getIssueDetailForReport,
  type IssueReportRow,
} from "@repo/database/queries/reports";

// Fine-grained
import { getProjectContextForReport } from "@repo/database/queries/reports/project";
```

## Consumers

- `packages/mcp/src/tools/issues.ts` — `get_project_issues`, `get_issue_detail` MCP tools
- `packages/mcp/src/tools/project-report.ts` — `get_project_context`, `get_project_activity` MCP tools
- `packages/mcp/__tests__/tools/report-tools.test.ts` — integratietests
