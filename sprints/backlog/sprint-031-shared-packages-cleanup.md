# Sprint 031: Shared Packages Cleanup

**Goal:** Eliminate code duplication across apps by moving constants, validations, and utilities to their correct shared packages. After this sprint, any new app (portal, status page) gets all domain logic for free.

**Principle:** No new features. Only move existing code to the right place and update imports.

---

## Tasks

### Task 1: Move domain constants to @repo/database/constants/

Move app-specific constants from `apps/cockpit/src/lib/constants/` to `packages/database/src/constants/`.

| Source (cockpit)                | Destination (@repo/database) | Contains                                      |
| ------------------------------- | ---------------------------- | --------------------------------------------- |
| `lib/constants/project.ts`      | `constants/projects.ts`      | PROJECT_STATUSES, SALES_STEPS, DELIVERY_STEPS |
| `lib/constants/meeting.ts`      | `constants/meetings.ts`      | MEETING_TYPES, PARTY_TYPES                    |
| `lib/constants/organization.ts` | `constants/organizations.ts` | ORG_TYPES, ORG_STATUSES                       |

**Steps:**

1. Copy each file to `packages/database/src/constants/`
2. Verify exports in `packages/database/package.json` — `./constants/*` pattern should already cover new files
3. Update all imports in `apps/cockpit/` to use `@repo/database/constants/*`
4. Update any imports in `apps/devhub/` if applicable
5. Delete the original files from `apps/cockpit/src/lib/constants/`
6. Run `npm run type-check` to verify no broken imports

### Task 2: Delete duplicate UUID validation

`apps/cockpit/src/validations/uuid.ts` is an exact copy of `packages/database/src/validations/uuid.ts`.

**Steps:**

1. Find all imports of `@/validations/uuid` in cockpit
2. Replace with `@repo/database/validations/uuid`
3. Delete `apps/cockpit/src/validations/uuid.ts`
4. Run `npm run type-check`

### Task 3: Consolidate date/format utilities into @repo/ui

Cockpit has two overlapping format files:

- `apps/cockpit/src/lib/format.ts` (formatDate, formatDateShort, formatDateLong, timeAgo, truncate)
- `apps/cockpit/src/lib/date-utils.ts` (formatDate, formatDateShort, daysUntil, timeAgo)

**Steps:**

1. Create `packages/ui/src/format.ts` with the combined, deduplicated set of functions:
   - `formatDate()`, `formatDateShort()`, `formatDateLong()`
   - `timeAgo()`, `daysUntil()`
   - `truncate()`
2. Add export to `packages/ui/package.json`: `"./format": "./src/format.ts"`
3. Update all imports in `apps/cockpit/` from `@/lib/format` and `@/lib/date-utils` to `@repo/ui/format`
4. Update any format utilities in `apps/devhub/` if they exist
5. Delete `apps/cockpit/src/lib/format.ts` and `apps/cockpit/src/lib/date-utils.ts`
6. Run `npm run type-check`

### Task 4: Move reusable Zod schemas to @repo/database/validations/

Move validation schemas from `apps/cockpit/src/validations/` to `packages/database/src/validations/` when they validate shared domain entities.

| Source (cockpit)          | Destination (@repo/database) | Used by                             |
| ------------------------- | ---------------------------- | ----------------------------------- |
| `validations/meetings.ts` | `validations/meetings.ts`    | cockpit (review, meeting actions)   |
| `validations/tasks.ts`    | `validations/tasks.ts`       | cockpit (task actions)              |
| `validations/entities.ts` | `validations/entities.ts`    | cockpit (org, project, people CRUD) |

**Keep in cockpit (app-specific):**

- `validations/review.ts` — cockpit-only review flow
- `validations/email-review.ts` — cockpit-only email review

**Steps:**

1. Move the three schema files to `packages/database/src/validations/`
2. Verify exports pattern covers them (`./validations/*`)
3. Update imports in `apps/cockpit/` from `@/validations/*` to `@repo/database/validations/*`
4. Update imports in `apps/devhub/` if any of these schemas are used there
5. For schemas that remain in cockpit, update their imports to use shared UUID from `@repo/database/validations/uuid`
6. Run `npm run type-check`

### Task 5: Verify and run full test suite

**Steps:**

1. Run `npm run type-check` — zero errors
2. Run `npm run lint` — zero new warnings
3. Run `npm run build` — all apps build
4. Run `npm test` — all tests pass (191 tests across 4 packages)

---

## What NOT to do

- Do NOT move Server Actions to shared packages — actions are app-specific (they call `revalidatePath` for app routes)
- Do NOT create a `@repo/utils` catch-all package — every function has a natural home in an existing package
- Do NOT create barrel exports (index.ts) — the current `@repo/database/queries/meetings` pattern is cleaner
- Do NOT change any functionality — this is a pure reorganization sprint
- Do NOT touch `packages/ai/` — AI validations are agent-specific and correctly placed
- Do NOT touch `packages/auth/` — already minimal and correct

---

## Expected result

```
packages/database/src/constants/
├── issues.ts          # (exists) issue types, statuses, priorities, components, severities
├── projects.ts        # (moved from cockpit) project statuses, sales/delivery steps
├── meetings.ts        # (moved from cockpit) meeting types, party types
└── organizations.ts   # (moved from cockpit) org types, statuses

packages/database/src/validations/
├── uuid.ts            # (exists) zUuid schema
├── issues.ts          # (exists) issue create/update schemas
├── meetings.ts        # (moved from cockpit) meeting validation schemas
├── tasks.ts           # (moved from cockpit) task validation schemas
└── entities.ts        # (moved from cockpit) org, project, people schemas

packages/ui/src/
├── [13 components]    # (exists) shadcn/ui components
├── utils.ts           # (exists) cn() helper
└── format.ts          # (new) consolidated date/string formatting
```

After this sprint:

- Zero code duplication between apps for domain constants and validations
- Any new app (portal) gets all shared logic via `@repo/*` imports
- cockpit retains only app-specific validations (review flows)
