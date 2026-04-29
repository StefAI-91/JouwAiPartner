# @repo/widget

JAIP-eigen feedback-widget. Gedeployed als pure-static bundle op
`widget.jouw-ai-partner.nl`. Geen Next.js — esbuild + statische
`public/`-map zodat de bundles tiny blijven.

## Architectuur

Twee bundles, bewust gesplitst:

| Bundle      | Inhoud                                       | Budget (gzip) | Wanneer geladen      |
| ----------- | -------------------------------------------- | ------------- | -------------------- |
| `loader.js` | Vanilla JS, Shadow-DOM-host + knop           | < 5 KB        | Elke pageload (sync) |
| `widget.js` | Preact-modal (UI) + Shadow-scoped CSS inline | < 30 KB       | Lazy bij eerste klik |

`widget.js` bundelt de CSS uit `src/widget/styles.css` als string en
injecteert 'm via een `<style>`-tag in de Shadow Root. Geen aparte
`widget.css` — host-styling kan nooit binnen de shadow boundary lekken.

Loader injecteert een floating button in een Shadow Host. Pas zodra de
gebruiker klikt wordt `widget.js` opgehaald (cross-origin script-tag) en
mountt de modal in dezelfde shadow root.

**Preact-compat alias** vervangt React + ReactDOM (~30 KB winst gzip).
Code blijft `import { useState } from "react"` schrijven — esbuild
aliassed naar `preact/compat`.

## Commands

```bash
npm run dev        # esbuild watch-mode
npm run build      # esbuild + generate-health + bundle-size check (hard fail)
npm run type-check # tsc --noEmit
```

## Lokaal testen

```bash
npm run build
npx serve apps/widget/public  # of een andere static server
# open http://localhost:3000/test-host.html
```

`test-host.html` zet `window.__JAIPWidgetApiUrl` zodat de widget naar de
lokale DevHub op poort 3001 POST in plaats van naar productie.

## Bundle-size check

`scripts/check-bundle-size.mjs` faalt de build bij overschrijding van het
budget. Past op drift: voeg een 100KB-lib toe en de build stopt.

## Deploy

- Vercel-project gekoppeld aan deze map (root = `apps/widget`)
- Custom domain: `widget.jouw-ai-partner.nl` (CNAME → `cname.vercel-dns.com`)
- `vercel.json` zet cache-headers (5 min op de bundles) + CORS (`*`) +
  `/health` rewrite naar `/health.json`

## Browser-matrix

- Chrome / Edge / Firefox / Safari laatste 2 versies
- iOS Safari 16+
- Geen IE11 (Shadow DOM + ES2020 features)

## E2E test

`tests/e2e/submit.spec.ts` — Playwright test die tegen staging draait:
loader.js inladen, knop klikken, modal invullen, submit, succes-toast
asserten. Geen DB-mocks; resulterende DevHub-issue draagt label `'test'`
zodat triage 'm kan filteren.

```bash
npm run test:e2e          # tegen staging-API
```

CI moet eerst `npx playwright install --with-deps chromium` runnen voor
een schone runner. Lokaal: idem als je 'm voor het eerst draait.

## Volgende sprints

- **WG-004** rolt de widget uit op de eerste klant-app.
- **WG-005** voegt rate-limit toe aan het ingest-endpoint vóór klant-rollout.
- **WG-006** (gepland) voegt annotated screenshots toe — zie
  `docs/ops/widget-migration.md` voor de gap-analyse.

## Installatie op een JAIP-app

```html
<script
  src="https://widget.jouw-ai-partner.nl/loader.js"
  data-project="<project-uuid>"
  data-user-email="optional@example.com"
  async
></script>
```

`data-user-email` is optioneel — laat 'm weg voor anonieme submissions
(klant-apps zonder login). Voor SPA's na auth: `window.__JAIPWidgetIdentify({ email })`
runtime call (komt in WG-004).

Voor cockpit / Next.js Server Component-installatie: gebruik het
`JaipWidgetScript`-component uit
`apps/cockpit/src/components/shared/jaip-widget-script.tsx` als
referentie. Het haalt het ingelogde user-email server-side op zodat dit
nooit in een client bundle terechtkomt.
