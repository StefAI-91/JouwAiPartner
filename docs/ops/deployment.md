# Deployment

Operationele config voor cockpit + devhub (+ portal, wanneer gedeployed).

## Environment Variables

- `NEXT_PUBLIC_USERBACK_TOKEN` — Userback feedback widget token (required for deployment).
- `NEXT_PUBLIC_COCKPIT_URL` — Full URL naar de cockpit app (productie: `https://jouw-ai-partner.vercel.app`, dev fallback: `http://localhost:3000`). Gebruikt door:
  - workspace-switcher in beide apps voor cross-app navigatie
  - devhub `/auth/callback` om admins na magic-link login naar cockpit te redirecten
  - cockpit middleware voor member-forbidden-redirect
- `NEXT_PUBLIC_DEVHUB_URL` — Full URL naar de devhub app (productie: `https://jouw-ai-partner-devhub.vercel.app`, dev fallback: `http://localhost:3001`). Gebruikt door cockpit callback + middleware om members naar devhub te redirecten + door de workspace-switcher.
- `NEXT_PUBLIC_PORTAL_URL` — Full URL naar de portal app (nog niet gedeployed).

Beide apps (cockpit + devhub) hebben de 3 NEXT*PUBLIC*\* URL vars nodig zodat de workspace-switcher in de sidebar naar de andere quadranten kan linken.

## JAIP Feedback Widget (WG-003)

De JAIP-eigen feedback-widget (`apps/widget`) wordt op elke quadrant
geïnstalleerd door één `<script>`-tag in de root layout te zetten. Op
cockpit gebeurt dat al via `JaipWidgetScript` in `apps/cockpit/src/app/layout.tsx`.

**Per app waar je de widget aanzet (cockpit eerst, klant-apps later via WG-004):**

- `NEXT_PUBLIC_JAIP_PLATFORM_PROJECT_ID` — UUID van het project waarop
  feedback uit deze app moet binnenkomen. Voor cockpit: het "JAIP Platform"-
  project (zie WG-001-migratie). Zonder deze var rendert de loader-tag
  niet — handig voor preview-deploys waar je de widget wil uitschakelen.
- `NEXT_PUBLIC_JAIP_WIDGET_LOADER_URL` _(optioneel)_ — override voor de
  loader-URL. Default: `https://widget.jouw-ai-partner.nl/loader.js`. Zet
  alleen op staging (`https://widget-staging.jouw-ai-partner.nl/loader.js`)
  of bij lokaal testen tegen je eigen `apps/widget/public/loader.js`.

**Origin-whitelist (eenmalig per app):** voeg de productie- + preview-
domeinen van de app toe aan `widget_project_origins` in Supabase. Zonder
matchende origin krijgt de POST 403. Zie WG-001 §1 voor de query.

**Installatie op een nieuwe JAIP-app (handmatig):**

1. UUID kiezen of nieuw project aanmaken in `widget_projects` (Supabase).
2. App-domeinen toevoegen aan `widget_project_origins`.
3. Env-var `NEXT_PUBLIC_JAIP_PLATFORM_PROJECT_ID=<uuid>` zetten op het
   Vercel-project (production + preview).
4. Loader-script in de root layout van de app — voor Next.js Server
   Component pattern, kopieer `JaipWidgetScript` uit cockpit en pas het
   `getUser()`-gedeelte aan op de auth-helper van die app. Voor klant-
   apps zonder login: laat het `data-user-email`-attribuut weg.
5. Smoke-test: klik op de feedback-knop, stuur "Test bug — dit is een
   test", verifieer dat de issue in DevHub triage verschijnt met label
   `'test'`.

## Supabase dashboard (handmatig, DH-018)

- **Redirect URLs whitelist** (Authentication → URL Configuration) moet beide productie-URL's `${cockpit}/auth/callback` en `${devhub}/auth/callback` bevatten, plus de preview/localhost varianten.
- **JWT / refresh-token**: zet de session refresh duration op **30 dagen** (AUTH-175).
