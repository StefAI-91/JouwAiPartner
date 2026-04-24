# mutations/projects/

Write-operaties voor het projects-domein. Eén deur (`index.ts`) via
`export *`.

## Bestanden

| File         | Wat                                                         | Hoofdexports                                                              |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| `index.ts`   | Deur — re-export van core + reviews                         | —                                                                         |
| `core.ts`    | Project CRUD + aliases-updater (entity-resolution pipeline) | `createProject`, `updateProject`, `deleteProject`, `updateProjectAliases` |
| `reviews.ts` | Project-reviews insert (door devhub review-flow)            | `InsertProjectReviewData`, `saveProjectReview`                            |

## Imports

```ts
import { createProject } from "@repo/database/mutations/projects";
import { saveProjectReview } from "@repo/database/mutations/projects/reviews";
```

## Mirror

Queries-tegenhanger: `packages/database/src/queries/projects/`.
