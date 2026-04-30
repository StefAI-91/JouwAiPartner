# queries/issues/

Alle read-queries voor het issues-domein (devhub). Eén deur (`index.ts`),
vier content-files.

## Bestanden

| File             | Wat                                                               | Publieke API                                                                                                                                                                                                                            |
| ---------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`       | Deur — re-exporteert alles uit core/activity/attachments/comments | (zie de andere files)                                                                                                                                                                                                                   |
| `core.ts`        | Issue-rij + lijst- en count-queries                               | `IssueRow`, `IssueSort`, `ISSUE_SORTS`, `ISSUE_SELECT`, `StatusCountKey`, `StatusCounts`, `WeeklyIssueIntake`, `listIssues`, `countFilteredIssues`, `getIssueById`, `getIssueCounts`, `getWeeklyIssueIntake`, `countCriticalUnassigned` |
| `activity.ts`    | Activity-feed (status-changes, assigns, etc.)                     | `IssueActivityRow`, `listIssueActivity`                                                                                                                                                                                                 |
| `attachments.ts` | Screenshots, video, files                                         | `IssueAttachmentRow`, `getIssueThumbnails`, `listIssueAttachments`, `getIssueIdsWithAttachments`                                                                                                                                        |
| `comments.ts`    | Discussion-thread per issue                                       | `IssueCommentRow`, `getCommentById`, `listIssueComments`                                                                                                                                                                                |

## Imports

```ts
// Standaard — via de deur
import { listIssues, type IssueRow } from "@repo/database/queries/issues";

// Fine-grained — alleen als je wilt afdwingen welke sub-file je raakt
import { listIssueComments } from "@repo/database/queries/issues/comments";
```

## Mutations + cross-package

Mutations staan in `packages/database/src/mutations/issues.ts` en
`issue-attachments.ts`. Constants (priority-order) in
`packages/database/src/constants/issues.ts`.
