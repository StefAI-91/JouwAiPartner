# mutations/topics/

Write-laag voor topics. Eén deur (`index.ts`), drie content-files. Cluster-
keuze volgt criterium 3 uit CLAUDE.md (eigen `features/topics/` in DevHub).

## Bestanden

| File         | Wat                                       | Publieke API                                                                                           |
| ------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `index.ts`   | Deur — re-exporteert alles                | (zie de andere files)                                                                                  |
| `crud.ts`    | Insert / update / delete                  | `insertTopic`, `updateTopic`, `deleteTopic`, `InsertTopicData`, `UpdateTopicData`, `MutationResult<T>` |
| `status.ts`  | Lifecycle-overgangen incl. closed_at-sync | `updateTopicStatus`, `UpdateTopicStatusOpts`                                                           |
| `linking.ts` | Topic ↔ issue-koppelingen                 | `linkIssueToTopic`, `unlinkIssueFromTopic`, `LinkVia`, `LinkIssueResult`                               |

## Imports

```ts
// Standaard
import { insertTopic, linkIssueToTopic } from "@repo/database/mutations/topics";

// Fine-grained
import { updateTopicStatus } from "@repo/database/mutations/topics/status";
```

## Conventies

- Alle helpers retourneren `MutationResult<T>` (`{ success: true, data } |
{ error }`). De Server Actions bovenop deze laag mappen dat naar het
  formulier-protocol uit CLAUDE.md.
- `created_by` (insert) en `linkedBy` (link) zijn verplichte parameters —
  deze laag leest geen `auth.uid()` zelf, de Server Action doet dat en geeft
  hem hier door. Houdt de mutation pure DB en testbaar.
- `updateTopic` raakt **geen** status; gebruik `updateTopicStatus` zodat
  `closed_at` automatisch in sync blijft (set bij done/wont_do, leeg bij
  niet-terminaal).
- `linkIssueToTopic` herkent SQLSTATE `23505` (UNIQUE-violation op
  `topic_issues.issue_id`) en geeft een leesbare error in plaats van de
  ruwe Postgres-tekst — dat dekt de PR-RULE-001-regel "max 1 topic per
  issue" af zonder dat callers zelf hoeven te pre-checken.
- `deleteTopic` faalt expliciet als er linked issues zijn. Bewust geen
  silent cascade: de user moet kiezen waar issues heen gaan vóór delete.

## Gerelateerd

- Queries: `packages/database/src/queries/topics/`
- Validations: `packages/database/src/validations/topics.ts`
- Constants: `packages/database/src/constants/topics.ts`
