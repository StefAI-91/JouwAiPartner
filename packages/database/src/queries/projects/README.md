# queries/projects/

Read-queries voor het projects-domein. Eén deur (`index.ts`) die via
`export *` alles uit core / detail / lookup / context / embedding /
access / reviews exporteert.

## Bestanden

| File           | Wat                                                              | Hoofdexports                                                                                                      |
| -------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `index.ts`     | Deur — re-export van alle sub-files                              | —                                                                                                                 |
| `core.ts`      | Lijst- en focus-queries voor cockpit project-pages + sidebar     | `ProjectListItem`, `listProjects`, `FocusProject`, `listFocusProjects`                                            |
| `detail.ts`    | Project-detail page (joins met meetings, emails, extractions)    | `ProjectDetail`, `getProjectById`                                                                                 |
| `lookup.ts`    | Identifier-lookups (aliases, name, userback-id)                  | `getProjectAliases`, `getProjectByNameIlike`, `getAllProjects`, `getProjectName`, `getProjectByUserbackProjectId` |
| `context.ts`   | AI-pipeline context-injection (Gatekeeper)                       | `ActiveProjectForContext`, `getActiveProjectsForContext`                                                          |
| `embedding.ts` | Vector match via `match_projects` RPC                            | `matchProjectsByEmbedding`                                                                                        |
| `access.ts`    | Wie mag welk project zien (per profile, via `@repo/auth/access`) | `AccessibleProject`, `listAccessibleProjects`                                                                     |
| `reviews.ts`   | Project-reviews (health-trend, latest review)                    | `ProjectReviewRow`, `getLatestProjectReview`, `getHealthTrend`                                                    |

## Imports

```ts
// Standaard — via de deur
import { getProjectById, type ProjectDetail } from "@repo/database/queries/projects";

// Fine-grained
import { listAccessibleProjects } from "@repo/database/queries/projects/access";
import { getLatestProjectReview } from "@repo/database/queries/projects/reviews";
import { matchProjectsByEmbedding } from "@repo/database/queries/projects/embedding";
```

## Cross-package

Mutations in `packages/database/src/mutations/projects.ts` en
`project-reviews.ts`. Auth-helpers (`listAccessibleProjectIds`) in
`@repo/auth/access`.
