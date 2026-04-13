# Micro Sprint DH-014: Auth helpers — role + project-access assertions

## Doel

Centraliseer alle role- en project-access checks in `packages/auth/` zodat iedere Server Action, query of page dezelfde helpers gebruikt. Dit is het applicatie-laag fundament waarop DH-015 (cockpit afscherming), DH-016 (DevHub action hardening), DH-017 (RLS), DH-019 (invite flow) en DH-020 (admin UI) bouwen. Na deze sprint bestaat er een duidelijke API:

- `isAdmin(userId)` — pure check
- `requireAdmin()` — gooit of redirect als user geen admin is
- `assertProjectAccess(userId, projectId)` — slaagt voor admins zonder row-check; slaagt voor members alleen bij bestaande `devhub_project_access` row; faalt anders
- `listAccessibleProjectIds(userId)` — admins → alle projecten, members → alleen geautoriseerde projecten

De helpers worden in deze sprint ook unit-getest tegen Supabase (lokale test DB of gemockt).

## Requirements

> Nieuwe requirements (SEC-_, AUTH-_) — toevoegen aan `docs/specs/requirements-devhub.md` sectie "Rollen en permissies" en sectie "Security eisen".

| ID       | Beschrijving                                                                                                                                                                                  |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-155 | Helper `isAdmin(userId)` retourneert `true` desda `profiles.role = 'admin'` voor gegeven userId.                                                                                              |
| AUTH-156 | Helper `requireAdmin()` haalt de huidig ingelogde user op via `getAuthenticatedUser()` en gooit of redirect wanneer de user geen admin is.                                                    |
| AUTH-157 | Helper `assertProjectAccess(userId, projectId)` slaagt zonder DB-hit op `devhub_project_access` wanneer user admin is; voor members wordt bestaan van een row gecontroleerd.                  |
| AUTH-158 | Helper `listAccessibleProjectIds(userId)` retourneert voor admins alle `projects.id`s en voor members alleen project IDs waarvoor een row in `devhub_project_access` bestaat (geen fallback). |
| SEC-150  | Access-check functies zijn de enige plek waar rol-logica leeft. App code doet nooit `profile.role === 'admin'` inline.                                                                        |
| SEC-151  | Alle helpers zijn server-only (staan onder `packages/auth/src/` en importeren `@repo/database/supabase/server` of admin client). Worden nooit in Client Components geïmporteerd.              |
| SEC-152  | Bij ontbreken van een user-sessie faalt `assertProjectAccess` default-deny (niet silent true).                                                                                                |

## Bronverwijzingen

- Scope-afspraken: prompt scope-beslissingen 1, 3, 11, 14
- Bestaand helper-bestand: `packages/auth/src/helpers.ts` (bevat `getAuthenticatedUser`, `getAuthenticatedUserId`, `createPageClient`)
- Bestaande bootstrap fallback die verwijderd moet worden: `packages/database/src/queries/project-access.ts` → functie `listAccessibleProjects` regels 32-40 ("If no access rows, return all projects")
- Vorige sprint: `docs/backlog/DH-013-access-control-db-foundation.md` (DB-fundament)

## Context

### API-ontwerp

```typescript
// packages/auth/src/access.ts (nieuw)
import type { SupabaseClient } from "@supabase/supabase-js";

export async function isAdmin(userId: string, client?: SupabaseClient): Promise<boolean>;

export async function getCurrentProfile(
  client?: SupabaseClient,
): Promise<{ id: string; role: "admin" | "member"; email: string } | null>;

/**
 * Gooit een Error of redirect naar /login wanneer user geen admin is.
 * Bedoeld voor gebruik in Server Components / pages.
 * Voor Server Actions retourneer liever { error } na een isAdmin() check.
 */
export async function requireAdmin(options?: {
  redirectTo?: string;
}): Promise<{ id: string; email: string }>;

/**
 * Slaagt voor admins zonder extra query. Voor members check row in devhub_project_access.
 * Gooit NotAuthorizedError als geen toegang. Callers vangen dit om 404 te renderen.
 */
export async function assertProjectAccess(
  userId: string,
  projectId: string,
  client?: SupabaseClient,
): Promise<void>;

export class NotAuthorizedError extends Error {
  constructor(message?: string);
}

/**
 * Lijst accessible project IDs.
 * Admins: alle projects.id. Members: enkel IDs in devhub_project_access.
 * Geen bootstrap-fallback.
 */
export async function listAccessibleProjectIds(
  userId: string,
  client?: SupabaseClient,
): Promise<string[]>;
```

### Hoe `listAccessibleProjects` verandert

Bestaande functie in `packages/database/src/queries/project-access.ts`:

```typescript
// OUD (regels 32-40): als geen rows → alle projecten teruggeven
if (!accessRows || accessRows.length === 0) {
  const { data } = await db.from("projects").select("id, name, project_key").order("name");
  return (data ?? []) as AccessibleProject[];
}
```

Moet worden:

```typescript
// NIEUW: admin → alle projecten; member zonder rows → lege lijst
const admin = await isAdmin(userId, db);
if (admin) {
  return allProjects(db);
}
// bestaande rows-filter path blijft
```

`listAccessibleProjects` (die `{id, name, project_key}` retourneert) blijft bestaan maar delegeert de "wat mag deze user zien" vraag aan `listAccessibleProjectIds`.

### Dev bypass gedrag

`getAuthenticatedUser()` retourneert in bypass-modus een fake user ID. `isAdmin()` moet voor die UUID óók `true` teruggeven (anders werkt lokale dev niet na deze sprint). Oplossing:

- Bypass-userId is `00000000-0000-0000-0000-000000000000` (constant in `helpers.ts`)
- `isAdmin()` controleert eerst op bypass-id → `true`
- Alternatief: seed een admin-profile met deze UUID

Agent kiest — documenteer de gekozen aanpak in comments.

### Tests

- Unit tests in `packages/auth/__tests__/access.test.ts` (zelfde stijl als `packages/auth/src/middleware.ts` patroon)
- Scenario's:
  - `isAdmin()` true voor admin profile
  - `isAdmin()` false voor member profile
  - `isAdmin()` false voor onbekend userId
  - `assertProjectAccess` slaagt voor admin zonder row
  - `assertProjectAccess` slaagt voor member met row
  - `assertProjectAccess` gooit `NotAuthorizedError` voor member zonder row
  - `assertProjectAccess` gooit default-deny voor `userId = null` of `undefined`
  - `listAccessibleProjectIds` geeft volledige lijst voor admin
  - `listAccessibleProjectIds` geeft alleen toegewezen IDs voor member (niet: alle projecten)

Test-framework: zie `sprints/done/sprint-015-test-framework-setup.md` en `packages/database/src/__tests__/` voor conventie.

## Prerequisites

- [x] DH-013: Access control DB fundering (migratie gedraaid)

## Taken

- [ ] Nieuw bestand: `packages/auth/src/access.ts` met alle bovenstaande helpers
- [ ] Export vanuit `packages/auth/package.json` → voeg `"./access": "./src/access.ts"` toe aan exports (check bestaand patroon met `./helpers`)
- [ ] Refactor `packages/database/src/queries/project-access.ts` → `listAccessibleProjects` gebruikt nieuwe `listAccessibleProjectIds`; bootstrap-fallback (regels 32-40) verwijderen
- [ ] Unit tests: `packages/auth/__tests__/access.test.ts`
- [ ] Documenteer dev-bypass-gedrag in JSDoc op `isAdmin`
- [ ] Update `docs/specs/requirements-devhub.md` met AUTH-155..158, SEC-150..152

## Acceptatiecriteria

- [ ] [AUTH-155] Unit test: admin user → `isAdmin` true; member → false; onbekend → false
- [ ] [AUTH-156] Unit test: `requireAdmin()` gooit wanneer niet-admin en slaagt met `{id,email}` voor admin
- [ ] [AUTH-157] Unit test: admin → `assertProjectAccess` slaagt zonder lookup op `devhub_project_access`
- [ ] [AUTH-157] Unit test: member met row → slaagt; member zonder row → gooit `NotAuthorizedError`
- [ ] [AUTH-158] Unit test: admin krijgt N project IDs (alle); member met 2 rows krijgt precies die 2 IDs; member zonder rows krijgt `[]`
- [ ] [SEC-152] Unit test: `assertProjectAccess(null, projectId)` en `assertProjectAccess(undefined, projectId)` gooien (default-deny)
- [ ] `listAccessibleProjects` heeft geen bootstrap-fallback meer; grep op "bootstrap" in het bestand levert geen hits
- [ ] `npm run type-check` en `npm run lint` slagen
- [ ] `packages/auth/__tests__/access.test.ts` draait groen

## Geraakt door deze sprint

- `packages/auth/src/access.ts` (nieuw)
- `packages/auth/package.json` (bijgewerkt — exports)
- `packages/auth/__tests__/access.test.ts` (nieuw)
- `packages/database/src/queries/project-access.ts` (bijgewerkt — fallback weg)
- `docs/specs/requirements-devhub.md` (bijgewerkt)
