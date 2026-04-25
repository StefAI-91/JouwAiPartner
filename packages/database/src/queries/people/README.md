# queries/people

Read-helpers voor het people-domein. Reden voor cluster: 360 regels en 20
exports in de oude `people.ts` — boven de drempel uit CLAUDE.md (>300 regels).
46 consumers app-breed, dus stabiele barrel-API is belangrijk.

## Sub-files

| File          | Rol                                                                                 |
| ------------- | ----------------------------------------------------------------------------------- |
| `lookup.ts`   | Find-by-X helpers voor speaker-map, gatekeeper en email-pipeline.                   |
| `lists.ts`    | Lijst-views voor UI: selectors, dropdowns, organisatie-detailpagina.                |
| `detail.ts`   | Single-person + stale-detectie: `getPersonById`, `getStalePeople`.                  |
| `pipeline.ts` | Pipeline-context: `getAllKnownPeople`, `getPeopleForContext`, `getAdminEmails`.     |
| `index.ts`    | Publieke deur — re-exporteert alles. Importeer via `@repo/database/queries/people`. |

## Import-patterns

```ts
// Default — barrel
import { listPeople, getPersonById } from "@repo/database/queries/people";

// Fine-grained (in pipelines en MCP-tools om bundle klein te houden)
import { findPeopleByEmails } from "@repo/database/queries/people/lookup";
```

## `getAdminEmails` woont in pipeline

Hoewel de query technisch tegen `profiles` draait (niet `people`), wordt
hij alleen gebruikt door `getAllKnownPeople` om `is_admin` te vullen.
Pragmatisch hier laten — verhuizen naar een eigen `queries/profiles.ts`
zou een single-function file opleveren.

## Mutations

Schrijf-helpers staan in `@repo/database/mutations/people.ts` (nog flat).
