# Feature: Review (DevHub)

Project-review — genereert een AI-analyse over alle issues van één project en
slaat het resultaat op (`project_reviews`-tabel). De output bevat health-score,
patronen, risico's en concrete actiepunten die op het dashboard verschijnen.

De feature is single-action: één Server Action triggert de pipeline, één
component rendert de actiepunten. AI-flow zelf (`runIssueReviewer`) leeft in
`@repo/ai/agents/issue-reviewer` en is buiten scope van deze feature.

## Menu per laag

### `actions/`

| File        | Exports                 | Gebruikt door                             |
| ----------- | ----------------------- | ----------------------------------------- |
| `review.ts` | `generateProjectReview` | `components/dashboard/` → DashboardHeader |

`generateProjectReview` (Zod-validate `projectId` → `assertProjectAccess` →
`listIssues` → `runIssueReviewer` → metrics-snapshot → `saveProjectReview` →
`revalidatePath('/review')` + `revalidatePath('/')`).

### `components/`

| File                    | Rol                                                                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `action-items-list.tsx` | Server-renderable lijst met actiepunten (priority + effort + linked issues). Wordt vanuit de dashboard-page gevoed met de `action_items`-array van de laatste review. |

## Gerelateerde packages (NIET in deze feature)

| Pad                                         | Rol                                                     |
| ------------------------------------------- | ------------------------------------------------------- |
| `@repo/ai/agents/issue-reviewer`            | AI-flow `runIssueReviewer` + `IssueForReview`-type.     |
| `@repo/database/queries/issues`             | `listIssues` (input voor de review).                    |
| `@repo/database/queries/projects`           | `getProjectById` (project-naam).                        |
| `@repo/database/mutations/projects/reviews` | `saveProjectReview` (insert review-row).                |
| `@repo/database/queries/projects/reviews`   | `getLatestProjectReview`, `getHealthTrend` (read-side). |
| `@repo/auth/access`                         | `assertProjectAccess` (per-project access guard).       |

## Design decisions

- **Eén action, geen split per stap.** De pipeline (issues ophalen → AI-call →
  metrics → save) is volgordelijk en single-purpose; opsplitsen in meerdere
  actions zou alleen extra round-trips opleveren zonder hergebruik.
- **`runIssueReviewer` blijft in `@repo/ai`.** AI-flows zijn cross-app
  herbruikbaar; de feature-action is enkel de DevHub-specifieke triggering +
  persistence-laag.
- **Read-helpers (`getLatestProjectReview`, `getHealthTrend`) leven in
  `@repo/database/queries/projects/reviews`, niet in deze feature.** Ze
  worden zowel door de DevHub-dashboard als (later) Portal gebruikt.
- **`ActionItemsList` weet niets van de generatie-flow.** Het component krijgt
  een platte array door en is daarmee herbruikbaar in andere review-views.
