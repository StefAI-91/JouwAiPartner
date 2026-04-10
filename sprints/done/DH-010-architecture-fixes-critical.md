# Micro Sprint DH-010: Architectuur fixes - kritieke problemen

## Doel

De kritieke architectuurproblemen in DevHub oplossen die de principes uit CLAUDE.md schenden en de onderhoudbaarheid blokkeren. Na deze sprint: sidebar data fetching volgt het server component patroon, alle server actions zijn beveiligd, en de issues lijst schaalt met pagination. Dit zijn de blokkerende issues die opgelost moeten zijn voordat nieuwe features gebouwd worden.

## Bevindingen uit architectuurreview

Deze sprint adresseert de volgende bevindingen uit de DevHub architectuurreview (10 april 2026):

| #   | Bevinding                                                            | Ernst   | Locatie                                 |
| --- | -------------------------------------------------------------------- | ------- | --------------------------------------- |
| 1   | Client-side data fetching in sidebars via useEffect + createClient() | KRITIEK | `app-sidebar.tsx`, `mobile-sidebar.tsx` |
| 2   | Gedupliceerde sidebar logica (100% code duplicatie)                  | KRITIEK | `app-sidebar.tsx`, `mobile-sidebar.tsx` |
| 3   | Ontbrekende auth check op `getSyncStatus()`                          | KRITIEK | `actions/import.ts:90`                  |
| 4   | Geen pagination op issues lijst pagina                               | KRITIEK | `issues/page.tsx`, `issue-list.tsx`     |
| 5   | `getUserbackSyncCursor()` laadt alle userback issues in geheugen     | HOOG    | `queries/issues.ts:240-256`             |

## Taken

### Taak 1: Sidebar data fetching naar server component

**Probleem:** `AppSidebar` en `MobileSidebar` fetchen issue counts via `useEffect` + `createClient()` + `supabase.from("issues").select("status")`. Dit schendt de regel: _"Data ophalen in Server Components. Geen useEffect voor data fetching."_

**Oplossing:**

- [ ] Haal `getIssueCounts()` aan in `(app)/layout.tsx` (server component) — deze query bestaat al in `packages/database/src/queries/issues.ts:156-192`
- [ ] Geef counts als prop door aan `AppSidebar` en `MobileSidebar`
- [ ] Verwijder alle `useEffect`, `useState`, `createClient()`, en `fetchCounts()` logica uit beide sidebar componenten
- [ ] Verwijder de `window.addEventListener("issues-changed")` pattern — na een mutation zorgt `revalidatePath` ervoor dat de layout opnieuw rendert met verse counts

**Geraakt:**

- `apps/devhub/src/app/(app)/layout.tsx` — counts ophalen en doorgeven
- `apps/devhub/src/components/layout/app-sidebar.tsx` — client fetch logica verwijderen, counts via props
- `apps/devhub/src/components/layout/mobile-sidebar.tsx` — idem

**Let op:** De `searchParams` (projectId) is nodig om counts op te halen. De layout heeft geen toegang tot searchParams. Oplossingsrichtingen:

1. ProjectId doorgeven als prop vanuit pages die het kennen
2. Of: een `SidebarCountsProvider` server component die searchParams leest en counts fetcht
3. Of: counts ophalen in de issues page en doorgeven via een shared context

Kies de aanpak die het minste prop drilling veroorzaakt.

### Taak 2: Sidebar code duplicatie oplossen

**Probleem:** `app-sidebar.tsx` (157 regels) en `mobile-sidebar.tsx` (182 regels) bevatten identieke `NAV_ITEMS`, `issueHref()`, status navigatie rendering, en bottom nav links.

**Oplossing:**

- [ ] Maak `apps/devhub/src/components/layout/sidebar-nav.tsx` — gedeelde navigatie component die `NAV_ITEMS`, `issueHref()`, en de status navigatie links bevat
- [ ] Maak `apps/devhub/src/components/layout/sidebar-constants.ts` — `NAV_ITEMS` array en eventuele gedeelde types
- [ ] Refactor `app-sidebar.tsx` — gebruikt `SidebarNav` als child, behoudt alleen desktop wrapper (`<aside className="hidden lg:flex ...">`)
- [ ] Refactor `mobile-sidebar.tsx` — gebruikt `SidebarNav` als child, behoudt alleen mobile drawer/sheet logica

**Geraakt:**

- `apps/devhub/src/components/layout/sidebar-constants.ts` (nieuw)
- `apps/devhub/src/components/layout/sidebar-nav.tsx` (nieuw)
- `apps/devhub/src/components/layout/app-sidebar.tsx` (refactor)
- `apps/devhub/src/components/layout/mobile-sidebar.tsx` (refactor)

### Taak 3: Auth en validatie op getSyncStatus()

**Probleem:** `getSyncStatus()` in `actions/import.ts:90` heeft geen `getAuthenticatedUser()` check en geen Zod validatie op de `projectId` parameter. Alle andere server actions hebben dit wel.

**Oplossing:**

- [ ] Voeg `getAuthenticatedUser()` check toe aan `getSyncStatus()`
- [ ] Voeg Zod validatie toe: `z.object({ projectId: z.string().uuid() })`
- [ ] Wijzig return type naar `{ success: true; data: { itemCount, lastSyncCursor } } | { error: string }` voor consistentie met andere actions
- [ ] Update de consumer in `settings/import/sync-card.tsx` om het nieuwe return format te gebruiken

**Geraakt:**

- `apps/devhub/src/actions/import.ts` — auth + validatie toevoegen, return type aanpassen
- `apps/devhub/src/app/(app)/settings/import/sync-card.tsx` — consumer updaten

### Taak 4: Pagination op issues lijst

**Probleem:** De issues pagina laadt alle issues voor een project zonder pagination UI. `listIssues()` ondersteunt al `limit`/`offset` parameters, maar de UI gebruikt ze niet. Bij >100 issues wordt dit een UX en performance probleem.

**Oplossing:**

- [ ] Voeg `page` searchParam toe aan `issues/page.tsx` (default: 1)
- [ ] Bereken offset: `(page - 1) * PAGE_SIZE` (PAGE_SIZE = 25 of 50)
- [ ] Vraag ook het totaal aantal issues op via een count query (of voeg count toe aan `listIssues` return)
- [ ] Maak een `PaginationControls` component (Vorige/Volgende knoppen, of nummers)
- [ ] Render `PaginationControls` onder de issues lijst met huidige pagina en totaal
- [ ] Zorg dat pagination searchParams (`page`) samenleven met bestaande filter params (`status`, `priority`, etc.)

**Geraakt:**

- `apps/devhub/src/app/(app)/issues/page.tsx` — pagination params en count query
- `apps/devhub/src/components/issues/pagination-controls.tsx` (nieuw)
- `apps/devhub/src/components/issues/issue-list.tsx` — pagination props doorgeven
- `packages/database/src/queries/issues.ts` — optioneel: `listIssues` ook total count retourneren

### Taak 5: getUserbackSyncCursor() optimaliseren

**Probleem:** `getUserbackSyncCursor()` in `queries/issues.ts:240-256` haalt ALLE userback issues op met `select("source_metadata")` en loopt er dan in JS doorheen om `max(userback_modified_at)` te vinden. Dit schaalt niet.

**Oplossing:**

- [ ] Vervang de twee queries door een enkele query die sorteert op het juiste veld en `LIMIT 1` gebruikt
- [ ] Als `source_metadata->userback_modified_at` niet sorteerbaar is via Supabase, gebruik dan `updated_at` als proxy (issues worden bijgewerkt bij sync)
- [ ] Verwijder de JS loop die door alle items itereert

**Geraakt:**

- `packages/database/src/queries/issues.ts` — `getUserbackSyncCursor()` herschrijven

## Acceptatiecriteria

- [ ] Sidebar issue counts worden opgehaald in een server component, niet via useEffect
- [ ] `app-sidebar.tsx` en `mobile-sidebar.tsx` bevatten geen gedupliceerde logica meer
- [ ] `app-sidebar.tsx` en `mobile-sidebar.tsx` importeren niet meer van `@repo/database/supabase/client`
- [ ] `getSyncStatus()` heeft auth check en Zod validatie
- [ ] `getSyncStatus()` retourneert `{ success, data }` of `{ error }` format
- [ ] Issues lijst toont pagination controls (Vorige/Volgende)
- [ ] Bij >50 issues worden niet alle issues in een keer geladen
- [ ] `getUserbackSyncCursor()` doet maximaal 1 database query (niet 2)
- [ ] `getUserbackSyncCursor()` laadt niet alle userback issues in geheugen
- [ ] `npm run build` slaagt
- [ ] `npm run type-check` slaagt
- [ ] Geen `window.addEventListener("issues-changed")` meer in sidebar componenten

## Geraakt door deze sprint

- `apps/devhub/src/app/(app)/layout.tsx` (wijziging)
- `apps/devhub/src/components/layout/app-sidebar.tsx` (refactor)
- `apps/devhub/src/components/layout/mobile-sidebar.tsx` (refactor)
- `apps/devhub/src/components/layout/sidebar-nav.tsx` (nieuw)
- `apps/devhub/src/components/layout/sidebar-constants.ts` (nieuw)
- `apps/devhub/src/actions/import.ts` (wijziging)
- `apps/devhub/src/app/(app)/settings/import/sync-card.tsx` (wijziging)
- `apps/devhub/src/app/(app)/issues/page.tsx` (wijziging)
- `apps/devhub/src/components/issues/pagination-controls.tsx` (nieuw)
- `apps/devhub/src/components/issues/issue-list.tsx` (wijziging)
- `packages/database/src/queries/issues.ts` (wijziging)
