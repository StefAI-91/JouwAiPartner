# queries/portal/

Read-queries voor het client-portal domein. Eén deur (`index.ts`) die
via `export *` core + access exporteert.

## Bestanden

| File        | Wat                                                                          | Hoofdexports                                                                            |
| ----------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `index.ts`  | Deur — re-export van core + access                                           | —                                                                                       |
| `core.ts`   | Issues + projects view voor de klant. Filter op `PORTAL_STATUS_GROUPS`.      | `PortalStatusFilter`, `listPortalProjects`, `getPortalProject`, `listPortalIssues`, ... |
| `access.ts` | Heeft deze profile-id toegang tot dit project? Gebruikt door layout/actions. | `PortalProject`, `hasPortalProjectAccess`                                               |

## Imports

```ts
// Standaard — via de deur
import { listPortalProjects } from "@repo/database/queries/portal";

// Fine-grained
import { hasPortalProjectAccess } from "@repo/database/queries/portal/access";
```

## Cross-package

Filter-constants in `packages/database/src/constants/issues.ts`
(`PORTAL_KEY_TO_INTERNAL_STATUSES`, `PORTAL_STATUS_GROUPS`). Auth-helpers
(`isAdmin`) in `@repo/auth/access`.
