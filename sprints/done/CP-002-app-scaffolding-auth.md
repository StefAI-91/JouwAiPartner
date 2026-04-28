# Micro Sprint CP-002: App Scaffolding & Auth

## Doel

De Next.js portal app opzetten in `apps/portal/` met werkende authenticatie. Na deze sprint kan een client user inloggen via magic link en ziet een lege dashboard-shell met sidebar. Admin/member users worden doorgestuurd naar cockpit/devhub. De app draait lokaal op port 3002 en is geintegreerd in Turborepo.

## Requirements

| ID       | Beschrijving                                                     |
| -------- | ---------------------------------------------------------------- |
| APP-P01  | Next.js app in apps/portal/ (port 3002)                          |
| APP-P02  | Turborepo integratie (dev, build, lint, type-check)              |
| APP-P03  | Shared packages: @repo/database, @repo/auth, @repo/ui            |
| APP-P04  | Tailwind CSS v4 setup (zelfde als cockpit/devhub)                |
| APP-P05  | Auth callback route (/auth/callback)                             |
| APP-P06  | Middleware met requireRole: 'client'                             |
| AUTH-P02 | Magic link login (zelfde Supabase auth, shouldCreateUser: false) |
| AUTH-P04 | Middleware: portal vereist client role, redirect naar login      |
| AUTH-P05 | Client users worden geblokkeerd op cockpit en devhub             |
| UI-P01   | Zelfde shadcn/ui component library als cockpit/devhub            |
| UI-P02   | Eigen sidebar layout, aangepast voor klantnavigatie              |
| UI-P03   | Workspace switcher toont portal als actief                       |
| UI-P05   | Loading states en error states per route                         |

## Afhankelijkheden

- CP-001 (database foundation) moet af zijn: client role moet bestaan in profiles

## Taken

### 1. Next.js app scaffolding

- Verwijder `apps/portal/.gitkeep`
- Maak `apps/portal/` aan met dezelfde structuur als devhub:
  - `package.json` (port 3002, dependencies op @repo/database, @repo/auth, @repo/ui)
  - `next.config.ts` (transpilePackages voor @repo/\*)
  - `tsconfig.json` (path alias @/_ → ./src/_)
  - `postcss.config.mjs` (Tailwind v4)
  - `src/app/globals.css` (Tailwind v4, zelfde theme tokens als cockpit/devhub)
  - `src/app/layout.tsx` (root layout met fonts, metadata)
  - `src/lib/utils.ts` (cn() helper)

### 2. Auth middleware

- `src/middleware.ts` — gebruik `createAuthMiddleware` met:
  - `requireRole: 'client'` (alleen client users mogen in de portal)
  - `publicPaths: ['/auth/callback']`
  - `forbiddenRedirect` naar cockpit URL (als admin/member per ongeluk op portal komt)
- **Let op:** `createAuthMiddleware` moet uitgebreid worden om 'client' als role te accepteren. De `requireRole` parameter accepteert nu alleen 'admin' | 'member'. Pas het type aan naar `'admin' | 'member' | 'client'`.

### 3. Auth callback route

- `src/app/auth/callback/route.ts` — zelfde patroon als cockpit/devhub auth callback
- Na succesvolle auth: redirect naar `/`

### 4. Login pagina

- `src/app/login/page.tsx` — split-screen layout (zelfde stijl als cockpit/devhub)
- `src/app/login/login-form.tsx` — magic link OTP flow met `shouldCreateUser: false`
- Aangepaste teksten voor klantportaal (welkomsttekst, branding)

### 5. App layout met sidebar

- `src/app/(app)/layout.tsx` — authenticated layout wrapper
- `src/components/layout/app-sidebar.tsx` — klant-sidebar met navigatie:
  - Projecten (overzicht)
  - Workspace switcher (bestaand component uit @repo/ui)
- `src/components/layout/top-bar.tsx` — top bar met user info

### 6. Placeholder dashboard

- `src/app/(app)/page.tsx` — placeholder pagina ("Welkom bij het portaal") zodat de app na login iets toont
- `src/app/(app)/loading.tsx` en `src/app/(app)/error.tsx`

### 7. Cockpit/DevHub middleware update

- Pas cockpit middleware aan: als user role === 'client', redirect naar portal URL
- Pas devhub middleware aan: als user role === 'client', redirect naar portal URL
- Dit voorkomt dat klanten per ongeluk in de interne tools terechtkomen

### 8. Auth middleware factory uitbreiden

- `packages/auth/src/middleware.ts`: wijzig `requireRole` type van `'admin' | 'member'` naar `'admin' | 'member' | 'client'`

## Bronverwijzingen

- PRD: `docs/archive/portal-mvp.md` sectie 3 (AUTH, APP, UI) en sectie 7 (Routes)
- DevHub app als referentie: `apps/devhub/` (package.json, next.config.ts, middleware.ts, layout)
- Auth middleware factory: `packages/auth/src/middleware.ts`
- Workspace switcher: `packages/ui/src/workspace-switcher.tsx`
- Login referentie: `apps/cockpit/src/app/login/`

## Verificatie

- [ ] `npm run dev` start portal op port 3002
- [ ] `npm run build` slaagt voor portal
- [ ] `npm run type-check` slaagt voor portal
- [ ] Client user kan inloggen via magic link en ziet dashboard-shell
- [ ] Admin/member user wordt doorgestuurd naar cockpit/devhub bij portal login
- [ ] Client user wordt doorgestuurd naar portal bij cockpit/devhub login
- [ ] Sidebar toont correcte navigatie met workspace switcher
