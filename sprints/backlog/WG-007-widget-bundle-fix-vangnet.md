# Micro Sprint WG-007: Widget Bundle Binding Fix + Regression-Vangnet

## Doel

Fix de stille bug waardoor `window.__JAIPWidget` na bundle-load `undefined` blijft, zodat klikken op de feedback-knop de modal opent. Plus twee vangnetten (build-time + jsdom) zodat deze klasse regression niet opnieuw silent in productie kan landen. E2E-runtime herstellen valt buiten scope (geparkeerd als WG-008).

## Probleem

WG-003 markeerde de widget als af, maar de productie-bundle op `widget.jouw-ai-partner.nl/widget.js` bindt `window.__JAIPWidget` niet — klikken op de knop doet niets, geen console-error, geen netwerk-fout. Bundle wordt 200/304 gefetched maar `__JAIPWidget` blijft `undefined`.

**Root cause:** combinatie van twee `__JAIPWidget`-bindings die elkaar ongelukkig kruisen.

1. `apps/widget/esbuild.config.mjs` heeft `globalName: "__JAIPWidget"` — esbuild wraps de output als `var __JAIPWidget = (() => { ... })()`.
2. `apps/widget/src/widget/index.tsx:24` doet zelf in source `window.__JAIPWidget = { mount }`.
3. De source heeft geen `export`, dus de IIFE returnt `undefined`.
4. Top-level `var __JAIPWidget` in een non-module script is gelijk aan `window.__JAIPWidget`. De assignment van de IIFE-return (= `undefined`) overschrijft de inner toewijzing die net daarvoor was gezet.

Effect: `window.__JAIPWidget` is `undefined` na bundle-load. Loader heeft `window.__JAIPWidget?.mount(...)` — optional chaining slikt dit op zonder error. Klik = stille no-op.

## Waarom miste de bestaande e2e dit

`apps/widget/tests/e2e/submit.spec.ts` zou de bug vangen (assert `dialog.toBeVisible()` zou falen). Maar drie infra-issues maken dat hij nooit draait:

1. Geen `.github/workflows/` — geen CI run.
2. `playwright.config.ts:5` wijst naar `widget-staging.jouw-ai-partner.nl/test-host.html` → 404.
3. Geen lokaal alternatief voor de staging-host.

Die drie problemen zijn een grotere klus — afgesplitst naar **WG-008 (e2e runtime herstellen)**.

## Requirements

| ID         | Beschrijving                                                                                                                                                                                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WG-REQ-130 | `apps/widget/esbuild.config.mjs`: verwijder `globalName: "__JAIPWidget"` uit de widget-build. Source zet `window.__JAIPWidget` zelf, esbuild's globalName veroorzaakt de var-shadow.                                                                                                    |
| WG-REQ-131 | Build-guard `apps/widget/scripts/check-bundle-globals.mjs`: faalt build als `public/widget.js` (a) GEEN `window.__JAIPWidget=` bevat, OF (b) een `var __JAIPWidget=` shadow op top-level bevat. Wordt aangeroepen vanuit `npm run build` na esbuild en vóór `check-bundle-size.mjs`.    |
| WG-REQ-132 | Vitest unit-test `apps/widget/tests/unit/bundle-binding.test.ts`: laadt `public/widget.js`, evalueert hem in jsdom met een echte `window`+`document`, asserteert na evaluatie dat `globalThis.__JAIPWidget?.mount` een `function` is. Test verwijst naar WG-007 in een leading comment. |
| WG-REQ-133 | `apps/widget/package.json` krijgt een `test` script (`vitest run`) — momenteel staat er een echo-stub. Aangroep bij `npm test` op repo-niveau (Turborepo `turbo.json` `test`-pipeline pakt dit automatisch op).                                                                         |
| WG-REQ-134 | Bewijs rood→groen lokaal: oude bundle (vóór WG-REQ-130) moet de unit-test ROOD geven, nieuwe bundle GROEN. Bewijs in PR-beschrijving (kopie van vitest-output beide kanten).                                                                                                            |
| WG-REQ-135 | Productie-deploy van `apps/widget` via Vercel zodra PR gemerged is. Smoke-test vanaf productie-cockpit (`https://[cockpit-prod-domain]`): klik feedback-knop, modal opent, submit `"WG-007 prod smoke test"`, verifieer issue verschijnt in DevHub-triage met label `test`.             |
| WG-REQ-136 | `docs/ops/widget-migration.md`: voeg sectie "Bundle-bindings" toe waarin de fout en het build-guard-patroon staan beschreven, zodat een toekomstige refactor niet weer per ongeluk `globalName` zet.                                                                                    |

## Afhankelijkheden

- **WG-003** is de bron van de bug (geen blocker — de fix raakt alleen `apps/widget`).
- WG-006 (screenshot-feature) wacht op deze sprint omdat hij hetzelfde bundle-format raakt en we niet willen dat een nieuwe globalName-shape het opnieuw breekt.

## Taken

### 1. Fix de esbuild config (WG-REQ-130)

Status: **al gepatcht lokaal** tijdens diagnose. `apps/widget/esbuild.config.mjs` regel 39 verwijderd, comment toegevoegd waarom.

### 2. Build-guard (WG-REQ-131)

`apps/widget/scripts/check-bundle-globals.mjs`:

```js
import { readFile } from "node:fs/promises";

const path = "public/widget.js";
const src = await readFile(path, "utf8");

const hasInnerBind = /window\.__JAIPWidget\s*=/.test(src);
const hasOuterShadow = /^("use strict";)?var\s+__JAIPWidget\s*=/.test(src);

const errors = [];
if (!hasInnerBind) errors.push(`${path}: missing 'window.__JAIPWidget=' assignment`);
if (hasOuterShadow)
  errors.push(`${path}: outer 'var __JAIPWidget=' shadow re-introduced (zie WG-007)`);

if (errors.length) {
  for (const e of errors) console.error("✗", e);
  process.exit(1);
}
console.log("✓ widget.js: window.__JAIPWidget binding intact, no var shadow");
```

`package.json` `build`-script: ketenen na esbuild, vóór bundle-size check.

### 3. Jsdom unit-test (WG-REQ-132)

`apps/widget/tests/unit/bundle-binding.test.ts`:

```ts
/**
 * WG-007 regression: widget.js moet `window.__JAIPWidget.mount` als
 * function exposen na evaluatie. Vangt het var-shadow probleem dat
 * in WG-003 silently door productie kwam.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("widget bundle binding", () => {
  beforeAll(() => {
    const src = readFileSync(resolve(__dirname, "../../public/widget.js"), "utf8");
    // Eval in dezelfde realm als jsdom's window
    new Function(src)();
  });

  it("exposes window.__JAIPWidget.mount as a function", () => {
    expect(typeof (globalThis as any).__JAIPWidget?.mount).toBe("function");
  });
});
```

Vitest-config: jsdom environment toevoegen (volg `apps/cockpit/vitest.config.ts` als template).

### 4. Test-runner aanzetten (WG-REQ-133)

`apps/widget/package.json`: `"test": "vitest run"`. Vitest installeren als dev-dep als nog niet aanwezig in de workspace.

### 5. Bewijs rood→groen (WG-REQ-134)

- Checkout het stuk waar `globalName: "__JAIPWidget"` nog erin staat (revert lokaal de fix), `npm run build`, `npm test --workspace=apps/widget` → moet falen.
- Re-apply de fix, rebuild, herhaal test → moet slagen.
- Twee outputs als bewijs in de PR.

### 6. Productie-deploy + smoke (WG-REQ-135)

- PR mergen naar `main`.
- Vercel-project `apps/widget` deployt automatisch (Vercel watchpath = `apps/widget/**`).
- Verifieer post-deploy: `curl -s https://widget.jouw-ai-partner.nl/widget.js | head -c 50` mag GEEN `var __JAIPWidget=` bevatten.
- Klik feedback-knop op productie-cockpit, submit, verifieer in DevHub-triage.

### 7. Doc-update (WG-REQ-136)

`docs/ops/widget-migration.md` — sectie "Bundle-bindings (WG-007 lessen)" met:

- Symptoom: 304 fetch + geen error + klik dood.
- Oorzaak: var-shadow door esbuild globalName + manuele window-assign.
- Wat we nooit weer doen: `globalName` op een entry die zelf naar `window` schrijft.
- Welke guard ervoor zorgt: `check-bundle-globals.mjs`.

## Acceptatiecriteria

- [ ] WG-REQ-130: `apps/widget/esbuild.config.mjs` heeft geen `globalName` meer voor de widget-build, met inline comment waarom.
- [ ] WG-REQ-131: `npm run build --workspace=apps/widget` faalt fast als de var-shadow weer opduikt (geverifieerd door tijdelijk de fix te reverten).
- [ ] WG-REQ-132 + 133: `npm test --workspace=apps/widget` runt en is groen op de gefixte bundle.
- [ ] WG-REQ-134: PR-beschrijving bevat beide test-outputs (rood + groen) als bewijs.
- [ ] WG-REQ-135: productie-bundle `widget.jouw-ai-partner.nl/widget.js` heeft geen var-shadow meer; smoke test op productie-cockpit slaagt; resulterende issue in DevHub-triage met label `test`.
- [ ] WG-REQ-136: `docs/ops/widget-migration.md` bijgewerkt.
- [ ] Sprint-file verplaatst naar `sprints/done/`, master-index in `sprints/backlog/README.md` bijgewerkt.

## Risico's

| Risico                                                                          | Mitigatie                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest jsdom kan widget.js niet evalueren omdat hij Preact runtime-imports doet | `new Function(src)()` runt 'm in dezelfde realm als jsdom's window. Test bewijst zichzelf via WG-REQ-134; valt het hier dan switchen naar `vm.runInThisContext` of een lichter assertion-only check op `globalThis.__JAIPWidget` na een raw `eval`. |
| Build-guard regex te strikt, faalt na een legitime refactor                     | Pattern is bewust simpel. Faalt hij ten onrechte, dan past de developer 'm aan in dezelfde PR — zichtbaar omdat de check letterlijk de regel met WG-007 noemt in z'n foutmelding.                                                                   |
| Productie-deploy faalt of bundle wordt ge-cached door Vercel                    | Cache-control = 5 min (eerder gezien). Smoke test wacht 5 min na deploy, of force-refresh via `?cb=`. Acceptatiecriterium expliciet: ook de productie-curl checken.                                                                                 |

## Follow-up sprint

**WG-008 (e2e runtime herstellen):** CI workflow voor `npm run test:e2e`, lokaal alternatief voor de staging-host (Playwright start eigen static server + cockpit-route mock), of een echte staging-deploy van `widget-staging.jouw-ai-partner.nl`. Buiten WG-007 scope om de blast-radius klein te houden.
