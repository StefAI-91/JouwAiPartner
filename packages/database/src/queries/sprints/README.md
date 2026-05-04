# queries/sprints/

Read-laag voor sprints — eerste-klasse planning-entiteit per klantproject
(zie `sprints/done/CP-012-project-sprints-and-portal-comms.md`). Eén deur
(`index.ts`), twee content-files. Cluster-keuze volgt criterium 3 uit
CLAUDE.md: sprints heeft een eigen `features/sprints/` in cockpit.

## Bestanden

| File        | Wat                                         | Publieke API                                                                              |
| ----------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `index.ts`  | Deur — re-exporteert alles                  | (zie de andere files)                                                                     |
| `list.ts`   | Lijsten en "huidige sprint"-lookup          | `SPRINT_STATUSES`, `SPRINT_COLS`, `SprintRow`, `listSprintsByProject`, `getCurrentSprint` |
| `detail.ts` | Eén sprint + sprints-met-topics voor portal | `SprintTopicRow`, `SprintWithTopics`, `getSprintById`, `listSprintsWithTopics`            |

## Imports

```ts
// Standaard — via de deur
import { listSprintsByProject, type SprintRow } from "@repo/database/queries/sprints";

// Fine-grained
import { getCurrentSprint } from "@repo/database/queries/sprints/list";
```

## Gerelateerd

- Mutations: `packages/database/src/mutations/sprints/`
- Validations: `packages/database/src/validations/sprints.ts`
- FK vanuit topics: `topics.target_sprint_id` (uuid, ON DELETE SET NULL)

## Performance-aannames

- `listSprintsByProject`: 1 query, gebruikt `idx_sprints_project_order`.
  Verwacht <20 sprints per project — geen pagination.
- `getCurrentSprint`: 1 query met `.eq('status', 'in_progress')`,
  gebruikt `idx_sprints_project_status`. Returns NULL als geen actieve.
- `listSprintsWithTopics`: 1 PostgREST-embed call (sprints → topics via
  FK target_sprint_id). Geen N+1.
