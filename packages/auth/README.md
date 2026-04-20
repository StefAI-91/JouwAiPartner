# @repo/auth

Gedeelde authenticatie- en autorisatie-helpers voor alle apps (cockpit, devhub, portal). Eén plek voor "ben je ingelogd", "ben je admin", "mag je dit project zien", plus de middleware-factory die routes bewaakt.

## Wanneer gebruiken

- Nieuwe Server Action die alleen admins mogen uitvoeren → `requireAdmin()` of `requireAdminInAction()` aan de bovenkant.
- Route die auth vereist → middleware via `createAuthMiddleware({ loginPath, ... })`.
- Project-scope check in DevHub/Portal → `assertProjectAccess(userId, projectId)`.
- Dev-omgeving zonder Supabase-user → zie bypass via `isAuthBypassed()`.

**Niet hierin:** UI-componenten voor login (hoort in app/cockpit + app/devhub), Server Actions zelf, RLS policies (staan in Supabase migrations).

## Publieke exports

### `@repo/auth/access`

- `NotAuthorizedError` — gooien wanneer toegang geweigerd moet worden.
- `ProfileRole` = `"admin" | "member" | "client"`.
- `isAdmin(userId, client?)` — default-deny; dev-bypass-user is admin in dev.
- `getCurrentProfile(client?)` — haalt `{ id, role, email }` van de ingelogde gebruiker.
- `requireAdmin({ redirectTo? })` — throws/redirects als niet admin; voor Server Components.
- `requireAdminInAction()` — Server Action-variant, retourneert `{ error }` in plaats van te throwen.
- `assertProjectAccess(userId, projectId)` — controleert `portal_project_access` of project-member.
- `listAccessibleProjectIds(userId)` — gescopede lijst voor DevHub/Portal filtering.

### `@repo/auth/helpers`

- `isAuthBypassed()` — `true` als `VERCEL_ENV !== "production"` én bypass-env-var gezet.
- `getAuthenticatedUser()` / `getAuthenticatedUserId()` — huidige Supabase-user, of null.
- `createPageClient()` — Supabase server-client voor Server Components.

### `@repo/auth/middleware`

- `createAuthMiddleware({ loginPath, publicPaths?, onSignedIn? })` — factory voor `middleware.ts` in elke app. Bevat open-redirect protection (origin allowlist uit `NEXT_PUBLIC_*_URL` + Vercel-fallbacks).

## Regels

- **Default-deny.** Lege userId, onbekende role, of niet-bestaande profile → geen toegang. Dit is security-laag 3 (zie CLAUDE.md "Security drie lagen").
- **Dev-bypass alleen buiten productie.** `VERCEL_ENV === "production"` zet bypass hard uit.
- **Geen frontend-checks voor security.** Client-side `isAdmin`-checks zijn UX, niet security. De server-action moet altijd `requireAdmin()` doen.
- **Middleware is laag 1, action is laag 2, RLS is laag 3.** Altijd alle drie, nooit vertrouwen op één laag.

## Ontwikkeling

```bash
npm test --workspace=@repo/auth         # alle tests
npm run type-check --workspace=@repo/auth
```

Tests staan in `packages/auth/__tests__/`. Mock-beleid: mock Supabase clients + `next/navigation` via boundary-mocks. Zie `docs/specs/test-strategy.md §3`.

## Afhankelijkheden

- Intern: `@repo/database`
- Extern: `@supabase/supabase-js`, `@supabase/ssr`, `next` (middleware + redirect)

## Gerelateerde sprints

- DH-013..016 (access control tranche, backlog)
- DH-017 (RLS project access, done)
- DH-018/019/020 (magic link, invite, admin-team UI, done)
