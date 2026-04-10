# Micro Sprint DH-003: DevHub app setup, auth en layout

## Doel

De Next.js app `apps/devhub/` opzetten als nieuwe app in de monorepo. Inclusief Supabase Auth (login pagina, middleware route guard), root layout met sidebar en top bar, en de basisroutes. Na deze sprint kun je inloggen op DevHub en zie je een lege shell met navigatie en project switcher.

## Requirements

| ID       | Beschrijving                                                            |
| -------- | ----------------------------------------------------------------------- |
| AUTH-101 | Rol admin: CRUD issues, importeren, projecten beheren — alle projecten  |
| AUTH-102 | Rol member: issues bekijken, status wijzigen, comments — alle projecten |
| AUTH-104 | Fase 1 simplificatie: admin en member zien alles                        |
| AUTH-105 | Supabase Auth — zelfde instance als cockpit, email/password login       |
| AUTH-106 | Middleware route guard op alle routes behalve /login                    |
| UI-119   | Layout: sidebar + main content area                                     |
| UI-120   | Top bar met JAIP DevHub logo, project switcher, "+ Issue" knop          |
| UI-121   | Login pagina op /login                                                  |
| UI-122   | Route / redirect naar /issues                                           |

## Bronverwijzingen

- PRD: `docs/specs/prd-devhub.md` -> sectie "5.6 Auth & Permissions (Fase 1)" (regels 801-807)
- PRD: `docs/specs/prd-devhub.md` -> sectie "5.7 Technische Architectuur — App structuur" (regels 809-866)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Layout" (regels 691-715)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Pagina's" (regels 717-727)
- Referentie: `apps/cockpit/` als voorbeeld voor monorepo app setup

## Context

### App structuur

```
apps/devhub/
├── src/
│   ├── app/
│   │   ├── layout.tsx           -- Root layout met sidebar, project switcher
│   │   ├── page.tsx             -- Redirect naar /issues
│   │   ├── login/
│   │   │   └── page.tsx         -- Login pagina
│   │   └── issues/
│   │       └── page.tsx         -- Placeholder (wordt in DH-004 gevuld)
│   ├── components/
│   │   └── layout/
│   │       ├── app-sidebar.tsx  -- Hoofd sidebar navigatie
│   │       ├── project-switcher.tsx -- Project dropdown
│   │       └── top-bar.tsx
│   ├── lib/
│   │   └── utils.ts             -- cn() helper
│   └── middleware.ts            -- Auth route guard
├── next.config.ts               -- transpilePackages voor @repo/*
├── tailwind.css                 -- Tailwind v4 CSS-first config
├── tsconfig.json
└── package.json
```

### Auth setup

- Gebruik dezelfde Supabase instance als cockpit (zelfde env vars)
- Login via email/password met `@repo/database/supabase/server` client
- Middleware beschermt alle routes behalve `/login`
- Referentiepatroon: bekijk `apps/cockpit/src/middleware.ts` en `apps/cockpit/src/app/login/page.tsx`

### Layout beschrijving

De UI is geinspireerd door Linear: minimalistisch, snel.

**Sidebar:**

- Logo: "JAIP DevHub"
- Navigatie items met status counts (Backlog, Todo, In Progress, Done) — counts worden in DH-004 gevuld, nu placeholders
- Settings link onderaan

**Top bar:**

- Project switcher dropdown (links)
- "+ Issue" knop (rechts) — linkt naar /issues/new

**Project switcher:**

- Dropdown die alle projecten toont
- Selectie opgeslagen in localStorage
- URL bevat geen project — het is een app-level filter
- Haal projecten op via een query naar de `projects` tabel

### Rollen

Fase 1 kent geen role-based restricties in de UI. Alle authenticated users zien alles. De rol-infrastructuur wordt voorbereid in de `devhub_project_access` tabel (DH-001) maar niet actief gebruikt.

### Monorepo setup

- Voeg `apps/devhub` toe aan de root `package.json` workspaces
- `turbo.json` hoeft waarschijnlijk niet aangepast (het detecteert workspaces automatisch)
- `next.config.ts` moet `transpilePackages: ['@repo/database', '@repo/ai']` bevatten
- Kopieer de basis `tsconfig.json` en `tailwind.css` setup van cockpit als startpunt

## Prerequisites

- [ ] Micro Sprint DH-001: Database issues tabellen (voor de projects tabel queries)

## Taken

- [ ] Initialiseer `apps/devhub/` als Next.js 16 app (package.json, tsconfig.json, next.config.ts, tailwind.css)
- [ ] Maak `src/middleware.ts` met auth route guard (bescherm alles behalve /login)
- [ ] Maak `src/app/login/page.tsx` met email/password login formulier
- [ ] Maak `src/app/layout.tsx` met root layout, sidebar en top bar
- [ ] Maak `src/components/layout/app-sidebar.tsx`, `project-switcher.tsx`, `top-bar.tsx`
- [ ] Maak `src/app/page.tsx` die redirect naar `/issues` en `src/app/issues/page.tsx` als lege placeholder

## Acceptatiecriteria

- [ ] [AUTH-105] Login pagina werkt met email/password via Supabase Auth
- [ ] [AUTH-106] Niet-ingelogde gebruikers worden geredirect naar /login
- [ ] [AUTH-106] Ingelogde gebruikers kunnen /issues bereiken
- [ ] [UI-119] Layout toont sidebar links en main content rechts
- [ ] [UI-120] Top bar bevat project switcher en "+ Issue" knop
- [ ] [UI-121] Login pagina is bereikbaar op /login
- [ ] [UI-122] Route / redirect naar /issues
- [ ] [UI-106..109] Project switcher toont projecten en slaat selectie op in localStorage
- [ ] `npm run dev` start DevHub app zonder fouten
- [ ] `npm run build` slaagt voor de devhub app

## Geraakt door deze sprint

- `apps/devhub/package.json` (nieuw)
- `apps/devhub/tsconfig.json` (nieuw)
- `apps/devhub/next.config.ts` (nieuw)
- `apps/devhub/tailwind.css` (nieuw)
- `apps/devhub/src/middleware.ts` (nieuw)
- `apps/devhub/src/lib/utils.ts` (nieuw)
- `apps/devhub/src/app/layout.tsx` (nieuw)
- `apps/devhub/src/app/page.tsx` (nieuw)
- `apps/devhub/src/app/login/page.tsx` (nieuw)
- `apps/devhub/src/app/issues/page.tsx` (nieuw placeholder)
- `apps/devhub/src/components/layout/app-sidebar.tsx` (nieuw)
- `apps/devhub/src/components/layout/project-switcher.tsx` (nieuw)
- `apps/devhub/src/components/layout/top-bar.tsx` (nieuw)
- `package.json` (root — workspaces bijwerken)
