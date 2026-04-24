# mutations/issues/

Write-operaties voor het issues-domein (devhub + portal). Deur via
`export *`.

## Bestanden

| File             | Wat                                                        | Hoofdexports                                                                   |
| ---------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `index.ts`       | Deur — re-export van core + attachments                    | —                                                                              |
| `core.ts`        | Issue insert/update/delete + comments + activity-log       | `insertIssue`, `updateIssue`, `insertComment`, `insertActivity`, `deleteIssue` |
| `attachments.ts` | Upload screenshots/video/files naar storage + DB-koppeling | `storeIssueMedia`                                                              |

## Imports

```ts
import { insertIssue, updateIssue } from "@repo/database/mutations/issues";
import { storeIssueMedia } from "@repo/database/mutations/issues/attachments";
```

## Mirror

Queries-tegenhanger: `packages/database/src/queries/issues/`.
