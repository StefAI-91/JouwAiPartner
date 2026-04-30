# Micro Sprint PR-000: Portal Mobile Drawer

## Doel

De productie-Portal mist een mobile drawer voor sidebar-navigatie. Bij viewports `<lg` (1024px) is de sidebar nu volledig verborgen en is er geen alternatieve navigatie. Voordat we de roadmap-pagina lanceren (PR-001 t/m PR-004) bouwen we eerst een drawer die werkt op álle Portal-routes — niet alleen roadmap. De preview-implementatie onder `apps/portal/src/components/roadmap-preview/preview-mobile-nav.tsx` is de blauwdruk en bevat al de twee productie-bugs die zijn opgelost (zie §14.7 valkuilen 1 en 2).

Na deze sprint heeft de Portal een hamburger-icon in de topbar onder `lg`, een slide-in drawer met dezelfde sidebar-content als desktop, en is de drawer veilig voor productie-builds (geen `Event handlers cannot be passed to Client Component props`-crash, geen `backdrop-filter`-quirk die de drawer opsluit in de topbar).

## Requirements

| ID            | Beschrijving                                                                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-REQ-001    | Topbar toont hamburger-trigger onder `lg` (≥sm = 640px ook); op `lg+` is hamburger verborgen                                                                    |
| PR-REQ-002    | Klik op hamburger opent drawer; klik op overlay of close-knop sluit drawer; navigatie via een `<a>` sluit drawer automatisch                                    |
| PR-REQ-003    | Drawer rendert dezelfde inhoud als desktop-sidebar (brand-blok, projecten-lijst, project-subnav, uitlog-knop)                                                   |
| PR-REQ-004    | Drawer is gerenderd via `React.createPortal(node, document.body)` om `backdrop-filter`-containing-block-quirk te omzeilen                                       |
| PR-REQ-005    | Bestand met event-handlers heeft `"use client"`-directive bovenaan om Vercel-build-crash te voorkomen                                                           |
| PR-REQ-006    | `mounted`-flag in `useEffect` voorkomt SSR-mismatch tijdens hydration                                                                                           |
| PR-REQ-007    | Sober animatie: 200ms slide-in vanaf links; geen scale, geen lift, geen confetti                                                                                |
| PR-DESIGN-001 | Breakpoint-strategie volgt §14.6: `<sm` hamburger + drawer + minimale breadcrumb, `sm` breadcrumb met "CAI Studio › Pagina", `lg+` sidebar                      |
| PR-DESIGN-002 | Preview portal-fix wordt 1:1 gemigreerd: zie [`preview-mobile-nav.tsx`](../../apps/portal/src/components/roadmap-preview/preview-mobile-nav.tsx) als referentie |

## Afhankelijkheden

- Bestaande `apps/portal/src/components/layout/app-sidebar-client.tsx` (desktop-sidebar, blijft bestaan)
- Bestaande `apps/portal/src/components/layout/top-bar.tsx` (hamburger-trigger landt hier)
- Geen open vragen blokkeren deze sprint — drawer is product-onafhankelijk

## Visuele referentie

- Live preview: `/design-preview/roadmap` op de Vercel-deploy van `apps/portal` (sidebar + drawer chrome)
- Design-spec: [`docs/specs/prd-portal-roadmap/14-design-keuzes.md`](../../docs/specs/prd-portal-roadmap/14-design-keuzes.md) §14.4 Drawer + sidebar (chrome), §14.6 Mobile-strategie, §14.7 Valkuilen

## Migreren vanuit preview

| Preview-bestand                                                     | Productie-doel                                     | Wat doen                                                                                                                                                    |
| ------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/portal/src/components/roadmap-preview/preview-mobile-nav.tsx` | `apps/portal/src/components/layout/mobile-nav.tsx` | Patroon overnemen (portal + mounted-flag + 200ms animatie); inhoud van drawer wordt productie-sidebar-content                                               |
| `apps/portal/src/components/roadmap-preview/preview-sidebar.tsx`    | _(referentie)_                                     | Bestaande `app-sidebar-client.tsx` blijft canon — alleen het pattern voor `SidebarContent`-extractie kopiëren zodat dezelfde JSX in desktop én drawer leeft |
| `apps/portal/src/components/roadmap-preview/preview-topbar.tsx`     | _(referentie)_                                     | Hamburger-trigger-pattern (icon + button, klik → drawer.open)                                                                                               |

## Taken

### 1. SidebarContent extraheren

- `apps/portal/src/components/layout/sidebar-content.tsx` (NIEUW, `"use client"`):
  - Verplaats de JSX-body van `app-sidebar-client.tsx` naar deze component
  - Props: `onNavigate?: () => void` (optioneel callback om drawer te sluiten bij link-klik)
  - Elke `<a>` of `<Link>` krijgt `onClick={onNavigate}` als prop is gezet
  - **Hard-regel**: omdat dit bestand `onClick` op DOM-elementen zet, MOET het `"use client"` bovenaan hebben — anders crasht Vercel-build (zie §14.7 valkuil 1)

### 2. Desktop sidebar refactor

- `apps/portal/src/components/layout/app-sidebar-client.tsx`:
  - Vervang body door `<SidebarContent />` (geen `onNavigate`-prop op desktop — sidebar is altijd zichtbaar)
  - Houd de wrapper-aside met `hidden lg:flex` zoals nu

### 3. Mobile drawer component

- `apps/portal/src/components/layout/mobile-nav.tsx` (NIEUW, `"use client"`):
  - Twee exports: `MobileNavTrigger` (hamburger-icon button) en `MobileNavDrawer` (de drawer zelf)
  - State via `useState` + context óf shared `useMobileNav` hook (kies kortste pad — context als drawer ergens anders moet kunnen openen)
  - `useEffect` met `mounted`-flag voor SSR-mismatch-prevent
  - Drawer gerenderd via `createPortal(<DrawerPanel />, document.body)` — voorkomt backdrop-filter-bug
  - `<DrawerPanel>` bevat: backdrop (klik → close), panel (slide-in 200ms, max-w-280px), `<SidebarContent onNavigate={close} />`, close-button (X-icon)
  - `aria-label="Sluit menu"` op close-button
  - `body.style.overflow = 'hidden'` zolang drawer open is (cleanup in unmount)

### 4. Topbar: hamburger-trigger toevoegen

- `apps/portal/src/components/layout/top-bar.tsx`:
  - Importeer `MobileNavTrigger`, render hem aan de linkerkant **alleen onder `lg`** (`<lg:flex lg:hidden`)
  - Breadcrumb-component (rechts ervan) volgt §14.6 breakpoint-tabel:
    - `<sm`: alleen huidige pagina ("Roadmap")
    - `sm`: "CAI Studio › Roadmap"
    - `md+`: "Projecten › CAI Studio › Roadmap"
  - Uitlog-knop: `<sm` alleen icon (LogOut), `sm+` icon + label

### 5. Layout integratie

- `apps/portal/src/app/(app)/layout.tsx`:
  - Render `<MobileNavDrawer />` ergens in de root van de layout (nodig zodat portal-target `document.body` bestaat)
  - Check dat `<TopBar>` en `<AppSidebar>` zoals voorheen gerenderd blijven

### 6. CSS-tokens & animatie

- `apps/portal/src/app/globals.css`:
  - Drawer-animatie: `@keyframes drawer-slide-in { from { transform: translateX(-100%) } to { transform: translateX(0) } }`
  - Backdrop fade-in via simple opacity-transition
  - Geen scale, geen lift, geen scroll-trigger — sober per §14.9
  - Als de drawer-tree CSS-variabelen nodig heeft die alleen op een wrapper-class staan, hang die class ook op de portal-root (in onze preview: bv. `editorial`-class — voor productie waarschijnlijk niet nodig, controleren)

### 7. Snelle visuele test

- Open Portal in viewport 375px (iPhone SE-breedte)
- Klik hamburger → drawer opent met smooth slide-in vanaf links
- Klik op een project-link in drawer → drawer sluit én navigatie gaat door
- Klik op backdrop → drawer sluit zonder navigatie
- Resize naar `lg` (≥1024px) → hamburger verdwijnt, sidebar verschijnt, drawer zou onzichtbaar moeten zijn

## Acceptatiecriteria

- [ ] PR-REQ-001: Hamburger-trigger zichtbaar onder `lg`, verborgen op `lg+`
- [ ] PR-REQ-002: Drawer opent/sluit via hamburger, overlay-klik, close-knop én navigatie
- [ ] PR-REQ-003: Drawer-content matcht desktop-sidebar 1:1 (via gedeelde `SidebarContent`)
- [ ] PR-REQ-004: Drawer rendert via `createPortal(node, document.body)`; inspectie in DevTools toont drawer als direct child van `<body>`, niet als child van topbar
- [ ] PR-REQ-005: `sidebar-content.tsx` en `mobile-nav.tsx` hebben `"use client"` bovenaan; Vercel-build-test slaagt
- [ ] PR-REQ-006: Geen SSR-mismatch in console bij eerste render (mounted-flag werkt)
- [ ] PR-REQ-007: Slide-in animatie is 200ms, geen scale of lift
- [ ] PR-DESIGN-001: Breadcrumb-gedrag matcht §14.6 op viewports 375px / 640px / 768px / 1024px
- [ ] Type-check + lint slagen
- [ ] Vitest: bestaande Portal-tests blijven groen; nieuwe smoke-test voor `MobileNavDrawer` (render + open/close)
- [ ] Geen regressie op andere Portal-routes (`/`, `/projects/[id]/issues`, etc.)

## Risico's

| Risico                                                        | Mitigatie                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Vercel-build crasht met "Event handlers cannot be passed..."  | `"use client"` bovenaan elk bestand met event-handlers (§14.7 valkuil 1)  |
| Drawer wordt opgesloten in topbar (backdrop-filter-bug)       | `createPortal` naar `document.body` (§14.7 valkuil 2)                     |
| SSR-mismatch tijdens hydration                                | `mounted`-flag in `useEffect`                                             |
| Drawer scrolt body achter zich aan                            | `body.style.overflow = 'hidden'` zolang drawer open                       |
| Toekomstige sidebar-wijziging breekt zowel desktop als mobile | Gedeelde `SidebarContent` is bewuste keuze — één bron, tweemaal gerenderd |

## Bronverwijzingen

- PRD: `docs/specs/prd-portal-roadmap/14-design-keuzes.md` §14.4 (component-systeem), §14.6 (mobile-strategie), §14.7 (valkuilen)
- Preview: `apps/portal/src/components/roadmap-preview/preview-mobile-nav.tsx`
- Bestaand: `apps/portal/src/components/layout/app-sidebar-client.tsx`, `top-bar.tsx`

## Vision-alignment

Past binnen vision §2.4 (Portal als trust layer): klanten op mobiele apparaten kunnen niet inloggen en navigeren als de Portal alleen op desktop werkt. Een drawer is geen feature, maar de minimumvereiste voor klant-toegankelijkheid op smartphones — zonder is de Portal voor mobile gebruikers gebroken.
