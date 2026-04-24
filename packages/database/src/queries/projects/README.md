# queries/projects/

Read-queries voor het projects-domein. Eén deur (`index.ts`) die via
`export *` alles uit core / access / reviews exporteert.

## Bestanden

| File         | Wat                                                              | Hoofdexports                                                                            |
| ------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `index.ts`   | Deur — re-export van alle sub-files                              | —                                                                                       |
| `core.ts`    | Project-rij + detail-queries voor cockpit project-pages          | `ProjectDetail`, `getProjectById`, `listProjects`, `listProjectsLite` (en gerelateerde) |
| `access.ts`  | Wie mag welk project zien (per profile, via `@repo/auth/access`) | `AccessibleProject`, `listAccessibleProjects`                                           |
| `reviews.ts` | Project-reviews (health-trend, latest review)                    | `ProjectReviewRow`, `getLatestProjectReview`, `getHealthTrend`                          |

## Imports

```ts
// Standaard — via de deur
import { getProjectById, type ProjectDetail } from "@repo/database/queries/projects";

// Fine-grained
import { listAccessibleProjects } from "@repo/database/queries/projects/access";
import { getLatestProjectReview } from "@repo/database/queries/projects/reviews";
```

## Cross-package

Mutations in `packages/database/src/mutations/projects.ts` en
`project-reviews.ts`. Auth-helpers (`listAccessibleProjectIds`) in
`@repo/auth/access`.
