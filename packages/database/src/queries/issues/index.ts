/**
 * Publieke deur voor het issues-domein. Consumers importeren via
 * `@repo/database/queries/issues` en krijgen alles uit core/activity/
 * attachments/comments. Voor fine-grained imports kan ook direct uit
 * een sub-file: `@repo/database/queries/issues/comments` etc.
 */

export {
  ISSUE_SORTS,
  ISSUE_SELECT,
  listIssues,
  countFilteredIssues,
  getIssueById,
  getIssueCounts,
  getWeeklyIssueIntake,
  countCriticalUnassigned,
  parseSearchQuery,
  UNASSIGNED_SENTINEL,
  type IssueSort,
  type IssueRow,
  type StatusCountKey,
  type StatusCounts,
  type WeeklyIssueIntake,
} from "./core";

export { listIssueActivity, type IssueActivityRow } from "./activity";

export {
  getIssueThumbnails,
  listIssueAttachments,
  getIssueIdsWithAttachments,
  type IssueAttachmentRow,
} from "./attachments";

export { getCommentById, listIssueComments, type IssueCommentRow } from "./comments";
