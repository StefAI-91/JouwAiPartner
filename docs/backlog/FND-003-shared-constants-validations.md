# Micro Sprint FND-003: Shared Constants & Validations

## Doel

Alle gedupliceerde constanten (issue types, statuses, priorities) en herbruikbare Zod-schemas centraliseren in `packages/database/`. Na deze sprint is er één bron van waarheid voor deze waarden, gedeeld door alle apps.

## Waarom

### Constanten-duplicatie (issues)

Dezelfde waarden staan op 4+ plekken gedefinieerd:

| Constante        | Locatie 1                    | Locatie 2                                   | Locatie 3                                   |
| ---------------- | ---------------------------- | ------------------------------------------- | ------------------------------------------- |
| ISSUE_TYPES      | `devhub/actions/issues.ts`   | `devhub/components/issues/issue-form.tsx`   | `devhub/components/issues/issue-detail.tsx` |
| ISSUE_STATUSES   | `devhub/actions/issues.ts`   | `devhub/components/issues/issue-detail.tsx` | `devhub/components/layout/app-sidebar.tsx`  |
| ISSUE_PRIORITIES | `devhub/actions/issues.ts`   | `devhub/components/issues/issue-form.tsx`   | `devhub/components/issues/issue-detail.tsx` |
| COMPONENTS       | `devhub/actions/issues.ts`   | `devhub/components/issues/issue-form.tsx`   | —                                           |
| SEVERITIES       | `devhub/actions/issues.ts`   | `devhub/components/issues/issue-form.tsx`   | —                                           |
| ISSUE_SELECT     | `database/queries/issues.ts` | `devhub/app/(app)/issues/page.tsx`          | —                                           |
| PRIORITY_ORDER   | `database/queries/issues.ts` | `devhub/app/(app)/issues/page.tsx`          | —                                           |

### Cockpit heeft hetzelfde probleem

Cockpit heeft ook constanten die hardcoded in validaties staan:

- `validations/meetings.ts` — meeting types als strings in `z.enum()`
- `validations/entities.ts` — organization types, project statuses hardcoded
- `lib/constants/meeting.ts` — aparte constanten die niet door validaties gebruikt worden

### zUuid validator

`apps/cockpit/src/validations/uuid.ts` bevat een herbruikbare `zUuid` regex validator die in beide apps nuttig is.

## Prerequisites

Geen — onafhankelijk van FND-001 en FND-002.

## Taken

### Taak 1: Issue-constanten centraliseren

Maak `packages/database/src/constants/issues.ts`:

```typescript
// ── Raw values (voor Zod schemas en database checks) ──

export const ISSUE_TYPES = ["bug", "feature", "improvement", "task", "question"] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

export const ISSUE_STATUSES = [
  "triage",
  "backlog",
  "todo",
  "in_progress",
  "done",
  "cancelled",
] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_PRIORITIES = ["urgent", "high", "medium", "low"] as const;
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export const ISSUE_COMPONENTS = [
  "frontend",
  "backend",
  "api",
  "database",
  "prompt_ai",
  "unknown",
] as const;
export type IssueComponent = (typeof ISSUE_COMPONENTS)[number];

export const ISSUE_SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export const CLOSED_STATUSES = new Set<IssueStatus>(["done", "cancelled"]);

// ── Labels voor UI (voor dropdowns en badges) ──

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  bug: "Bug",
  feature: "Feature",
  improvement: "Improvement",
  task: "Task",
  question: "Question",
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  triage: "Triage",
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

export const ISSUE_PRIORITY_LABELS: Record<IssuePriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const ISSUE_COMPONENT_LABELS: Record<IssueComponent, string> = {
  frontend: "Frontend",
  backend: "Backend",
  api: "API",
  database: "Database",
  prompt_ai: "Prompt / AI",
  unknown: "Onbekend",
};

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

// ── Priority sort order (voor queries en client-side sorting) ──

export const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};
```

### Taak 2: Issue Zod-schemas centraliseren

Maak `packages/database/src/validations/issues.ts`:

```typescript
import { z } from "zod";
import {
  ISSUE_TYPES,
  ISSUE_STATUSES,
  ISSUE_PRIORITIES,
  ISSUE_COMPONENTS,
  ISSUE_SEVERITIES,
} from "../constants/issues";

export const createIssueSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1, "Titel is verplicht").max(500),
  description: z.string().max(10000).nullish(),
  type: z.enum(ISSUE_TYPES).default("bug"),
  status: z.enum(ISSUE_STATUSES).default("triage"),
  priority: z.enum(ISSUE_PRIORITIES).default("medium"),
  component: z.enum(ISSUE_COMPONENTS).nullish(),
  severity: z.enum(ISSUE_SEVERITIES).nullish(),
  labels: z.array(z.string()).default([]),
  assigned_to: z.string().uuid().nullish(),
  reporter_name: z.string().max(200).nullish(),
  reporter_email: z.string().email().nullish(),
});

export const updateIssueSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).nullish(),
  type: z.enum(ISSUE_TYPES).optional(),
  status: z.enum(ISSUE_STATUSES).optional(),
  priority: z.enum(ISSUE_PRIORITIES).optional(),
  component: z.enum(ISSUE_COMPONENTS).nullish(),
  severity: z.enum(ISSUE_SEVERITIES).nullish(),
  labels: z.array(z.string()).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});

export const deleteIssueSchema = z.object({
  id: z.string().uuid(),
});

export const createCommentSchema = z.object({
  issue_id: z.string().uuid(),
  body: z.string().min(1, "Reactie mag niet leeg zijn").max(10000),
});

export const updateCommentSchema = z.object({
  id: z.string().uuid(),
  issue_id: z.string().uuid(),
  body: z.string().min(1, "Reactie mag niet leeg zijn").max(10000),
});

export const deleteCommentSchema = z.object({
  id: z.string().uuid(),
  issue_id: z.string().uuid(),
});
```

### Taak 3: zUuid verplaatsen

Verplaats `apps/cockpit/src/validations/uuid.ts` naar `packages/database/src/validations/uuid.ts`.

Update imports in cockpit:

```typescript
// OUD
import { zUuid } from "@/validations/uuid";
// NIEUW
import { zUuid } from "@repo/database/validations/uuid";
```

### Taak 4: Exports registreren

Voeg de nieuwe paden toe aan `packages/database/package.json` exports:

```json
{
  "exports": {
    "./constants/issues": "./src/constants/issues.ts",
    "./validations/issues": "./src/validations/issues.ts",
    "./validations/uuid": "./src/validations/uuid.ts"
  }
}
```

### Taak 5: DevHub actions updaten

Update `apps/devhub/src/actions/issues.ts`:

1. Verwijder lokale constanten (ISSUE_TYPES, ISSUE_STATUSES, etc.)
2. Verwijder lokale Zod-schemas (createIssueSchema, updateIssueSchema, etc.)
3. Importeer uit packages:

```typescript
import { CLOSED_STATUSES } from "@repo/database/constants/issues";
import {
  createIssueSchema,
  updateIssueSchema,
  deleteIssueSchema,
  createCommentSchema,
} from "@repo/database/validations/issues";

// Re-export voor client components die ze nodig hebben
export { createIssueSchema, updateIssueSchema };
```

Update `apps/devhub/src/actions/comments.ts`:

1. Verwijder lokale schemas
2. Importeer uit packages

### Taak 6: DevHub components updaten

Update componenten die lokale constanten gebruiken:

**`issue-form.tsx`:**

```typescript
// OUD: lokale TYPES, PRIORITIES, COMPONENTS, SEVERITIES arrays
// NIEUW:
import {
  ISSUE_TYPES,
  ISSUE_TYPE_LABELS,
  ISSUE_PRIORITIES,
  ISSUE_PRIORITY_LABELS,
  ISSUE_COMPONENTS,
  ISSUE_COMPONENT_LABELS,
  ISSUE_SEVERITIES,
  ISSUE_SEVERITY_LABELS,
} from "@repo/database/constants/issues";
```

**`issue-detail.tsx`:**

```typescript
import {
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  ISSUE_PRIORITIES,
  ISSUE_PRIORITY_LABELS,
} from "@repo/database/constants/issues";
```

**`app-sidebar.tsx`:** Gebruik `ISSUE_STATUS_LABELS` voor navigatie-items.

### Taak 7: Duplicaties in queries opruimen

Update `packages/database/src/queries/issues.ts`:

```typescript
// Verwijder lokale PRIORITY_ORDER
import { PRIORITY_ORDER } from "../constants/issues";
```

Verwijder de gedupliceerde `ISSUE_SELECT` en `PRIORITY_ORDER` uit `apps/devhub/src/app/(app)/issues/page.tsx` (wordt opgelost in FND-004).

### Taak 8: Verify

1. `npm install`
2. `npm run type-check`
3. `npm run build`
4. Grep naar hardcoded issue-constanten — er mogen geen lokale kopieën meer zijn

## Acceptatiecriteria

- [ ] `packages/database/src/constants/issues.ts` is de enige bron voor issue-constanten
- [ ] `packages/database/src/validations/issues.ts` bevat alle issue Zod-schemas
- [ ] `zUuid` zit in `packages/database/src/validations/uuid.ts`
- [ ] Geen lokale constanten meer in devhub action/component bestanden
- [ ] Geen gedupliceerde `PRIORITY_ORDER` of `ISSUE_SELECT` meer
- [ ] `npm run build` slaagt

## Risico's

- Cockpit gebruikt issue-constanten nog niet (issues worden alleen in devhub getoond). Maar als cockpit straks DevHub-data toont (fase 5), zijn de imports al klaar.
- Labels (UI strings) in het database-pakket voelt misschien vreemd. Maar ze zijn gekoppeld aan het datamodel en veranderen als het model verandert. Ze horen bij de bron van waarheid.
