# Micro Sprint WG-002: Widget App Scaffold + Loader

## Doel

Een nieuwe Next.js-app `apps/widget/` toevoegen aan de monorepo, gedeployed op Vercel onder subdomein **widget.jouw-ai-partner.nl**. De app serveert twee statische assets: een tiny `loader.js` (vanilla JS, < 5KB gzip) en een lazy-laadbare `widget.js` bundle (< 50KB gzip) die de UI bevat. Dit sprint levert nog géén UI-features — alleen de hosting, de bundle-pipeline, de bundle-budget-CI-check en een dummy-modal die "Hello widget" toont. UI komt in WG-003.

## Requirements

| ID         | Beschrijving                                                                                                                                                                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| WG-REQ-020 | Nieuwe app `apps/widget/` met `package.json`, `tsconfig.json`, Turborepo-integratie (`turbo.json` pipelines blijven werken)                                                                                                                                                                      |
| WG-REQ-021 | Build-pipeline: esbuild bundelt `src/loader/index.ts` → `public/loader.js` en `src/widget/index.tsx` → `public/widget.js`                                                                                                                                                                        |
| WG-REQ-022 | Loader.js: vanilla JS, geen React, leest `data-project` uit eigen script-tag, injecteert floating button als Shadow Host, lazy-load `widget.js` bij eerste klik                                                                                                                                  |
| WG-REQ-023 | Widget.js: React bundle, mount in Shadow DOM van de host-element, exporteert globale `window.__JAIPWidget.mount(shadowRoot, config)`                                                                                                                                                             |
| WG-REQ-024 | Bundle-budgets als CI-check: `loader.js` < 5KB gzip, `widget.js` < 50KB gzip. Faalt de build bij overschrijding                                                                                                                                                                                  |
| WG-REQ-025 | Cache-headers: `loader.js` met content-hash in filename (`loader.<hash>.js`) + immutable cache; `loader.js` zelf is een tiny pointer dat naar de hashed file fetcht. Of: `loader.js` zonder hash met `max-age=300` zodat updates binnen 5 min uitrollen — **kies optie B voor V0** (eenvoudiger) |
| WG-REQ-026 | Vercel-config: `vercel.json` of Next.js `headers()` voor de cache-headers, en deploy-target subdomein `widget.jouw-ai-partner.nl`                                                                                                                                                                |
| WG-REQ-027 | DNS-record `widget.jouw-ai-partner.nl` → Vercel CNAME (handmatig, gedocumenteerd in `docs/ops/deployment.md`)                                                                                                                                                                                    |
| WG-REQ-028 | Health-check route `/health` retourneert `200 OK { status: "ok", version: <git-sha> }` voor monitoring                                                                                                                                                                                           |
| WG-REQ-029 | README in `apps/widget/README.md` met dev-commands en bundle-overzicht                                                                                                                                                                                                                           |

## Afhankelijkheden

- WG-001 (endpoint moet bestaan, anders heeft de widget nergens om naartoe te POSTen — maar deze sprint POST nog niet écht, dat is WG-003)
- Bestaand: monorepo Turborepo-config (`turbo.json`, `apps/cockpit`-pattern als referentie)

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- **Q1: Next.js of pure esbuild + statische serving?** Aanbeveling: **pure esbuild + statische `public/` map**, geen Next.js runtime nodig — de widget is "drop one script tag, serve assets." Een hele Next.js-app voor één bundle is overkill, en je krijgt zonder Next.js veel kleinere bundles. Alternatief is Next.js voor consistency-met-de-rest-van-de-monorepo. Bevestigen vóór scaffold.
- **Q2: Loader vs. widget — apart laden of één bundle?** Aanbeveling: **apart**. Loader is de tiny boostrapper die altijd op pageload draait; widget-bundle wordt pas gefetcht bij klik. Voorkomt dat elke klant-pagina 50KB extra laadt zonder reden.
- **Q3: Bundle-budget enforcement — soft warning of hard fail?** Aanbeveling: **hard fail** in CI. Drift is anders binnen 3 sprints terug op 200KB.

## Taken

### 1. Scaffold app

```
apps/widget/
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── public/
│   ├── loader.js          (build-output)
│   └── widget.js          (build-output)
├── src/
│   ├── loader/
│   │   └── index.ts
│   ├── widget/
│   │   ├── index.tsx       (entry — exposes window.__JAIPWidget)
│   │   ├── modal.tsx       (dummy V0 — "Hello widget")
│   │   └── styles.css      (Shadow DOM scoped)
│   └── shared/
│       └── types.ts
├── server.ts               (tiny Node.js static server, of vercel.json static config)
├── vercel.json
└── README.md
```

### 2. `package.json`

```json
{
  "name": "@jouw-ai-partner/widget",
  "private": true,
  "scripts": {
    "dev": "node esbuild.config.mjs --watch",
    "build": "node esbuild.config.mjs && node scripts/check-bundle-size.mjs",
    "start": "node server.js",
    "type-check": "tsc --noEmit",
    "lint": "eslint src"
  }
}
```

### 3. Esbuild-config

```js
// esbuild.config.mjs
import * as esbuild from "esbuild";
import { gzipSync } from "zlib";
import { readFileSync, statSync } from "fs";

const watch = process.argv.includes("--watch");

const common = { bundle: true, minify: true, sourcemap: true, target: "es2020" };

await esbuild.build({
  ...common,
  entryPoints: ["src/loader/index.ts"],
  outfile: "public/loader.js",
  format: "iife",
});

await esbuild.build({
  ...common,
  entryPoints: ["src/widget/index.tsx"],
  outfile: "public/widget.js",
  format: "iife",
  globalName: "__JAIPWidget",
  jsx: "automatic",
});

if (watch) {
  // start watch mode...
}
```

### 4. Loader.js

`src/loader/index.ts` (vanilla, geen React):

```ts
(function () {
  const script = document.currentScript as HTMLScriptElement;
  const projectId = script?.dataset.project;
  if (!projectId) return console.warn("[JAIP Widget] data-project attribuut ontbreekt");

  const host = document.createElement("div");
  host.id = "__jaip-widget-host";
  host.style.cssText = "position:fixed;bottom:0;right:0;z-index:2147483647;";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  const button = document.createElement("button");
  button.textContent = "Feedback";
  button.style.cssText =
    "position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:24px;background:#0f172a;color:#fff;border:0;cursor:pointer;font:500 14px system-ui;";
  shadow.appendChild(button);

  let widgetLoaded = false;
  button.addEventListener("click", async () => {
    if (!widgetLoaded) {
      await import(/* @vite-ignore */ `${script.src.replace("loader.js", "widget.js")}`);
      widgetLoaded = true;
    }
    (window as any).__JAIPWidget.mount(shadow, {
      projectId,
      apiUrl: "https://devhub.jouw-ai-partner.nl/api/ingest/widget",
    });
  });
})();
```

Bewust geen import-syntax — wordt IIFE-gebundled. Cross-origin script-load via `<script>` injection is robuuster dan dynamic import voor V0.

### 5. Widget.js (V0 dummy)

`src/widget/index.tsx`:

```tsx
import { createRoot } from "react-dom/client";

declare global {
  interface Window {
    __JAIPWidget: {
      mount: (root: ShadowRoot, config: { projectId: string; apiUrl: string }) => void;
    };
  }
}

window.__JAIPWidget = {
  mount(root, config) {
    const container = document.createElement("div");
    root.appendChild(container);
    createRoot(container).render(
      <div style={{ padding: 24, background: "white" }}>
        Hello widget — project {config.projectId}
      </div>,
    );
  },
};
```

In WG-003 wordt dit een echte modal.

### 6. Bundle-size CI-check

`scripts/check-bundle-size.mjs`:

```js
import { gzipSync } from "zlib";
import { readFileSync } from "fs";

const checks = [
  { file: "public/loader.js", maxKB: 5 },
  { file: "public/widget.js", maxKB: 50 },
];

let failed = false;
for (const { file, maxKB } of checks) {
  const gz = gzipSync(readFileSync(file)).length / 1024;
  if (gz > maxKB) {
    console.error(`✗ ${file} is ${gz.toFixed(1)}KB gzip, max ${maxKB}KB`);
    failed = true;
  } else {
    console.log(`✓ ${file} = ${gz.toFixed(1)}KB gzip (max ${maxKB})`);
  }
}
if (failed) process.exit(1);
```

### 7. Vercel-config

`vercel.json`:

```json
{
  "headers": [
    {
      "source": "/loader.js",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=300" }]
    },
    {
      "source": "/widget.js",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=300" }]
    },
    {
      "source": "/(.*)",
      "headers": [{ "key": "Access-Control-Allow-Origin", "value": "*" }]
    }
  ]
}
```

### 8. DNS + Vercel project

- Nieuw Vercel-project gekoppeld aan `apps/widget/` met root `apps/widget`
- Custom domain: `widget.jouw-ai-partner.nl`
- DNS-record bij domein-provider: CNAME → `cname.vercel-dns.com`
- Documenteer in `docs/ops/deployment.md`

### 9. Turborepo-pipeline

Update `turbo.json` zodat `apps/widget` in `build` en `type-check` pipelines meedraait. Geen aanpassingen aan andere apps.

## Acceptatiecriteria

- [ ] WG-REQ-020: `apps/widget/` bestaat, `npm run build` slaagt vanaf root
- [ ] WG-REQ-021: na build staan `public/loader.js` en `public/widget.js` op disk
- [ ] WG-REQ-022: `<script src="…/loader.js" data-project="xxx" async>` op een test-pagina injecteert een button rechtsonder
- [ ] WG-REQ-023: klik op button laadt widget.js en toont dummy-content in Shadow DOM
- [ ] WG-REQ-024: bundle-size script faalt bouw als limiet overschreden (test door tijdelijk een 100KB lib te importeren)
- [ ] WG-REQ-026: deploy naar Vercel werkt, `https://widget.jouw-ai-partner.nl/loader.js` retourneert 200
- [ ] WG-REQ-027: DNS gepropageerd, certificaat actief
- [ ] WG-REQ-028: `https://widget.jouw-ai-partner.nl/health` retourneert `{ status: "ok" }`
- [ ] Type-check + lint slagen
- [ ] README in `apps/widget/` aanwezig

## Risico's

| Risico                                                         | Mitigatie                                                                                            |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Esbuild + Turborepo plays niet zoals Next.js — caching-issues  | Voeg expliciete `outputs` toe aan `turbo.json` voor `apps/widget`; test cache-warm-build             |
| React + ReactDOM in widget-bundle = 40KB+ baseline             | Gebruik Preact-compat alias als budget eraan komt; voor V0 acceptabel binnen 50KB                    |
| Shadow DOM-styling werkt anders in Safari < 16 voor `:host`    | V0 = modern browsers; documenteer browser-matrix in README; legacy als V1                            |
| Loader fetcht widget.js van eigen origin → cross-origin issues | Werkt: `<script src>` is altijd cross-origin-toegestaan; CORS alleen relevant voor de POST in WG-003 |
| Cache-busting: oude loader.js blijft hangen na deploy          | `max-age=300` is V0-trade-off; klanten zien max 5min stale; acceptabel                               |

## Bronverwijzingen

- Vercel deploy: `docs/ops/deployment.md`
- Esbuild: https://esbuild.github.io/api/
- Shadow DOM: https://developer.mozilla.org/docs/Web/API/Web_components/Using_shadow_DOM

## Vision-alignment

Vision §Delivery — eigen feedback-widget bouwen geeft volledige controle over UX en data-stroom. Distributie via script-tag (niet als NPM-package) maakt 'm bruikbaar op JAIP-eigen apps én later op klant-apps zonder build-stap.
