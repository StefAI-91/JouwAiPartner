import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";

/**
 * WG-006 regression: na evaluatie van public/widget-screenshot.js in een
 * echte browser-achtige `<script>`-context MOET `window.__JAIPWidgetScreenshot.capture`
 * een function zijn. Zelfde vangnet-patroon als WG-007 voor widget.js — als
 * een toekomstige refactor per ongeluk een `globalName` op de screenshot-build
 * zet, vangt dit het op.
 */
const bundlePath = resolve(__dirname, "../../public/widget-screenshot.js");

describe("widget screenshot bundle binding", () => {
  let dom: JSDOM;

  beforeAll(() => {
    if (!existsSync(bundlePath)) {
      throw new Error(
        `public/widget-screenshot.js ontbreekt — run \`npm run build --workspace=apps/widget\` eerst`,
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

  it("exposes window.__JAIPWidgetScreenshot.capture as a function", () => {
    const widget = (dom.window as unknown as { __JAIPWidgetScreenshot?: { capture?: unknown } })
      .__JAIPWidgetScreenshot;
    expect(typeof widget?.capture).toBe("function");
  });
});
