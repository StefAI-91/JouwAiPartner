# Micro Sprint DH-015: Cockpit afschermen op admin-rol

## Doel

De Cockpit-app is strategie/PM-tooling voor interne owners en mag nooit door externe teamleden (rol `member`) gezien worden. Vandaag checkt de cockpit-middleware alleen "ingelogd ja/nee". In deze sprint wordt die check uitgebreid met een role-check: enkel `profiles.role = 'admin'` mag cockpit benaderen. Members worden geredirect naar DevHub, zodat ze niet per ongeluk op een 404 of "geen toegang" muur knallen.

Tegelijkertijd wordt een "no-cockpit-access" landings-pagina toegevoegd voor het geval een member toch op de cockpit-host landt zonder in te kunnen loggen of zonder devhub-toegang (zeldzaam, maar voorkomt dead-ends).

Deze sprint raakt **alleen cockpit**, niet devhub. DevHub-afscherming volgt in DH-016.

## Requirements

| ID       | Beschrijving                                                                                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-160 | Cockpit middleware staat toegang alleen toe voor ingelogde users met `profiles.role = 'admin'`. Members worden 302-redirected naar de DevHub login-URL.                     |
| AUTH-161 | Ingelogde members die de Cockpit bezoeken, belanden niet op een lege pagina of 500, maar op een duidelijke redirect.                                                        |
| AUTH-162 | Cockpit Server Actions in `apps/cockpit/src/actions/` roepen `requireAdmin()` aan of retourneren `{ error }` als de user geen admin is (defense-in-depth naast middleware). |
| SEC-153  | Middleware-redirect gebeurt vóór data-ophalen (geen query-leak naar members tijdens de redirect-flow).                                                                      |
| UI-150   | DevHub login-URL is configureerbaar via env var `NEXT_PUBLIC_DEVHUB_URL` (fallback `"/"` voor lokaal).                                                                      |

## Bronverwijzingen

- Scope-afspraken: prompt scope-beslissingen 1, 5, 6
- Bestaande middleware factory: `packages/auth/src/middleware.ts` (factory `createAuthMiddleware` — regels 1-86)
- Cockpit middleware: `apps/cockpit/src/middleware.ts` (gebruikt factory)
- Actions die admin-only moeten worden: `apps/cockpit/src/actions/{meetings,tasks,entities,review,email-review,email-links,segments,summaries,scan-needs,weekly-summary,action-items}.ts`

## Context

### Middleware uitbreiden

De bestaande factory in `packages/auth/src/middleware.ts` accepteert `loginPath` + `defaultRedirect`. Breid uit met een optionele `requireRole: "admin" | "member"` parameter én een `forbiddenRedirect` URL. De cockpit gebruikt dan:

```typescript
// apps/cockpit/src/middleware.ts
import { createAuthMiddleware } from "@repo/auth/middleware";

export default createAuthMiddleware({
  loginPath: "/login",
  defaultRedirect: "/",
  requireRole: "admin",
  forbiddenRedirect: process.env.NEXT_PUBLIC_DEVHUB_URL ?? "/",
});
```

Belangrijk: de middleware moet `profiles.role` ophalen zonder de user-sessie te breken. Dit vereist een extra Supabase call binnen de middleware. Het bestaande patroon (gebruik van `createServerClient` met cookie handling) blijft — voeg alleen een `from('profiles').select('role').eq('id', user.id).single()` toe.

### DEV bypass interactie

Huidige `isAuthBypassed()` in `helpers.ts` en `middleware.ts` laat alles door. Dit moet zo blijven: in dev bypass is er geen rol-check (de fake user is impliciet admin). Dit is consistent met DH-014 waar `isAdmin()` voor bypass-UUID `true` teruggeeft.

### Server Action hardening

Cockpit actions roepen allemaal `getAuthenticatedUser()` aan. Wijzig ze naar:

```typescript
import { isAdmin } from "@repo/auth/access";

export async function doSomething(...) {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };
  // ...
}
```

Alternatief: wrapper `withAdminGuard(action)` in `packages/auth/src/access.ts`. Agent kiest — consistency over elegantie.

### Risico's

- **Live productie**: zodra deze middleware live gaat, verliest Ege cockpit-toegang (accepted — scope-beslissing 5). Communicatie vooraf nodig.
- **Session caching**: als profiles.role in een recent opgeslagen cookie zit, kan stale data voor verwarring zorgen. Geen risico als we live de DB queryen in middleware.
- **Middleware perf**: extra DB-call per request. Mitigeren met short-TTL cache (in-memory per instance) — optioneel, buiten scope tenzij meetbaar traag.

## Prerequisites

- [x] DH-013: DB fundering (profiles.role CHECK constraint bestaat)
- [x] DH-014: Auth helpers (`isAdmin`, `requireAdmin`, middleware factory signature)

## Taken

- [ ] Breid `packages/auth/src/middleware.ts` uit: nieuwe opties `requireRole` en `forbiddenRedirect`. Implementeer rol-check via een korte query op `profiles.role`.
- [ ] Update `apps/cockpit/src/middleware.ts` met `requireRole: "admin"` en `forbiddenRedirect: process.env.NEXT_PUBLIC_DEVHUB_URL ?? "/"`
- [ ] Voeg `NEXT_PUBLIC_DEVHUB_URL` toe aan `.env.local.example` (als dat bestaat) en in `apps/cockpit/.env.example` (indien aanwezig)
- [ ] Hard-guard alle Server Actions in `apps/cockpit/src/actions/*.ts` met `isAdmin(user.id)` → retourneer `{ error: "Geen toegang" }` voor non-admins (of introduceer `withAdminGuard()` helper)
- [ ] Maak `apps/cockpit/src/app/no-access/page.tsx` als fallback voor edge cases (optioneel maar aanbevolen)
- [ ] Update README / developer notes: "Cockpit is admin-only. Members worden naar DevHub gestuurd."

## Acceptatiecriteria

- [ ] [AUTH-160] Integratietest of handmatige test: member login → bezoek cockpit `/` → 302 redirect naar DevHub URL
- [ ] [AUTH-160] Admin login → bezoek cockpit `/` → rendert normaal
- [ ] [AUTH-161] Member landt op een werkende pagina (geen 500, geen blanco) bij cockpit bezoek
- [ ] [AUTH-162] Willekeurige Server Action aangeroepen door member user-id (via test) retourneert `{ error: "Geen toegang" }` in plaats van succes
- [ ] [SEC-153] Middleware redirect gebeurt vóór dat server components draaien (verifieer in Network tab: 302 op HTML-response)
- [ ] [UI-150] Ontbrekende `NEXT_PUBLIC_DEVHUB_URL` laat de app niet crashen — fallback naar `"/"` werkt
- [ ] DEV-bypass modus laat cockpit nog steeds werken zonder login
- [ ] `npm run type-check` en `npm run lint` slagen

## Geraakt door deze sprint

- `packages/auth/src/middleware.ts` (bijgewerkt — `requireRole` + `forbiddenRedirect`)
- `apps/cockpit/src/middleware.ts` (bijgewerkt — rol-check aangezet)
- `apps/cockpit/src/actions/meetings.ts` (bijgewerkt)
- `apps/cockpit/src/actions/tasks.ts` (bijgewerkt)
- `apps/cockpit/src/actions/entities.ts` (bijgewerkt)
- `apps/cockpit/src/actions/review.ts` (bijgewerkt)
- `apps/cockpit/src/actions/email-review.ts` (bijgewerkt)
- `apps/cockpit/src/actions/email-links.ts` (bijgewerkt)
- `apps/cockpit/src/actions/segments.ts` (bijgewerkt)
- `apps/cockpit/src/actions/summaries.ts` (bijgewerkt)
- `apps/cockpit/src/actions/scan-needs.ts` (bijgewerkt)
- `apps/cockpit/src/actions/weekly-summary.ts` (bijgewerkt)
- `apps/cockpit/src/actions/action-items.ts` (bijgewerkt)
- `apps/cockpit/src/app/no-access/page.tsx` (nieuw, optioneel)
- `.env.example` / env docs (bijgewerkt)
- `docs/specs/requirements-devhub.md` (bijgewerkt — AUTH-160..162, SEC-153, UI-150)
