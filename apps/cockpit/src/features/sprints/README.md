# features/sprints/

Cockpit-side beheer van project-sprints (zie
`sprints/done/CP-012-project-sprints-and-portal-comms.md`). Sprints zijn
eerste-klasse entiteit per klantproject voor portal-communicatie.

## Bestanden

| Pad                                   | Wat                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `actions/sprints.ts`                  | Server Actions: create / update / delete / reorder. Auth + Zod-validatie + revalidate      |
| `components/project-sprints-card.tsx` | Server component op de project-pagina; rendert de lijst en de "+"-knop                     |
| `components/sprint-row-editor.tsx`    | Client component; inline-edit per sprint met save/delete/up/down                           |
| `components/add-sprint-button.tsx`    | Client component; maakt nieuwe sprint met sensible defaults (Sprint N+1, volgende maandag) |

## Imports

```ts
import { ProjectSprintsCard } from "@/features/sprints/components/project-sprints-card";
```

## Conditionele rendering

`ProjectSprintsCard` zelf checkt **niet** of het project in dev-fase zit.
De caller (project-detailpagina) checkt `project.status` ∈
`['kickoff','in_progress','review']` en rendert deze card alleen dan.
Op die manier blijft de card zelf herbruikbaar als we later een
"alle-sprints"-overview willen op een andere pagina.

## Gerelateerd

- DB queries: `@repo/database/queries/sprints`
- DB mutations: `@repo/database/mutations/sprints`
- Validations: `@repo/database/validations/sprints`
- Portal-tegenhanger: SprintBanner op briefing-page, SprintTimeline op roadmap (in `apps/portal/src/components/`)
