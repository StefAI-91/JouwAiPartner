import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";

/**
 * WG-007 regression: na evaluatie van public/widget.js in een echte browser-
 * achtige `<script>`-context MOET `window.__JAIPWidget.mount` een function
 * zijn. Vangt het var-shadow probleem dat in WG-003 silently door productie
 * kwam (esbuild `globalName` + manuele `window.__JAIPWidget=` overschreven
 * elkaar via top-level `var`-binding).
 *
 * Cruciaal: we gebruiken een verse JSDOM met `runScripts: "dangerously"` en
 * injecteren de bundle als `<script>`-tag. Dat geeft script-execution-context
 * waar top-level `var __JAIPWidget` aan window plakt — exact zoals in een
 * echte browser. `new Function(src)()` of indirect eval in een vitest ESM-
 * runner mist dat gedrag en zou de bug niet vangen.
 *
 * Vereist een gebouwde bundle. Run `npm run build --workspace=apps/widget`
 * vóór deze test, of vertrouw op de turbo build-pipeline.
 */
const bundlePath = resolve(__dirname, "../../public/widget.js");

describe("widget bundle binding", () => {
  let dom: JSDOM;

  beforeAll(() => {
    if (!existsSync(bundlePath)) {
      throw new Error(
        `public/widget.js ontbreekt — run \`npm run build --workspace=apps/widget\` eerst`,
      );
    }
    const src = readFileSync(bundlePath, "utf8");
    dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, {
      runScripts: "dangerously",
    });
    const script = dom.window.document.createElement("script");
    script.textContent = src;
    dom.window.document.body.appendChild(script);
  });

  it("exposes window.__JAIPWidget.mount as a function", () => {
    const widget = (dom.window as unknown as { __JAIPWidget?: { mount?: unknown } }).__JAIPWidget;
    expect(typeof widget?.mount).toBe("function");
  });
});
