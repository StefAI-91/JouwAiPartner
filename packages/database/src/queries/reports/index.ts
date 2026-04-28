/**
 * Publieke deur voor het reports-domein. Read-only data-laag voor
 * project-rapportages — primair geconsumeerd door de MCP tools in
 * `packages/mcp/src/tools/`. Splits in twee sub-domeinen: issue-rapportage
 * (lijst + detail) en project-rapportage (context + activity-tijdlijn).
 *
 * Voor fine-grained imports kan ook direct uit een sub-file:
 * `@repo/database/queries/reports/project` etc.
 */

export {
  getProjectIssuesForReport,
  getIssueDetailForReport,
  type IssueCommentReport,
  type IssueActivityReport,
  type IssueDetailReport,
} from "./issues";

export {
  getProjectActivityForReport,
  getProjectContextForReport,
  type ProjectActivityEvent,
  type ProjectContextReport,
} from "./project";

export type { IssueReportRow, PaginatedResult } from "./internals";
