import { describe, it, expect, beforeEach } from "vitest";
import { JSDOM } from "jsdom";
import {
  inlineUnsupportedColors,
  normalizeUnsupportedColors,
  type ColorResolver,
} from "../../src/widget/normalize-colors";

/**
 * Regression voor screenshot fix: html2canvas 1.4.1 faalt op `oklab()` /
 * `oklch()`. We gaan ervan uit dat de canvas-resolver in een echte browser
 * werkt — JSDOM kan dat niet repro'en, dus mocken we de resolver en testen
 * we alleen dat de DOM-walk de juiste properties detecteert, normaliseert,
 * en bij restore weer terugzet.
 */

const fakeResolver: ColorResolver = (input) => {
  if (/oklab/i.test(input)) return "rgb(11, 22, 33)";
  if (/oklch/i.test(input)) return "rgb(44, 55, 66)";
  return input;
};

let dom: JSDOM;
let document: Document;

beforeEach(() => {
  dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
  document = dom.window.document;
  // jsdom's getComputedStyle valt terug op inline styles wanneer er geen
  // stylesheet is — voldoende voor onze test omdat we inline `style=` zetten.
  (globalThis as unknown as { getComputedStyle: typeof window.getComputedStyle }).getComputedStyle =
    dom.window.getComputedStyle.bind(dom.window);
  (
    globalThis as unknown as { CSSStyleDeclaration: typeof CSSStyleDeclaration }
  ).CSSStyleDeclaration = dom.window.CSSStyleDeclaration;
});

describe("normalizeUnsupportedColors", () => {
  it("vervangt oklab en oklch occurrences in een gradient string", () => {
    const input = "linear-gradient(to right, oklab(0.7 0.1 0.1), oklch(70% 0.2 30deg))";
    const out = normalizeUnsupportedColors(input, fakeResolver);
    expect(out).toBe("linear-gradient(to right, rgb(11, 22, 33), rgb(44, 55, 66))");
  });

  it("laat strings zonder oklab/oklch ongemoeid", () => {
    const input = "rgb(0, 0, 0)";
    expect(normalizeUnsupportedColors(input, fakeResolver)).toBe(input);
  });

  it("gaat om met geneste functies in oklab args", () => {
    const input = "oklab(from var(--brand) l a b)";
    expect(normalizeUnsupportedColors(input, fakeResolver)).toBe("rgb(11, 22, 33)");
  });
});

describe("inlineUnsupportedColors", () => {
  it("zet een rgb-fallback inline op elementen met oklab color", () => {
    const el = document.createElement("div");
    el.setAttribute("style", "color: oklab(0.7 0.1 0.1)");
    document.body.appendChild(el);

    const restore = inlineUnsupportedColors(document.documentElement, fakeResolver);

    expect(el.style.color).toBe("rgb(11, 22, 33)");

    restore();
    expect(el.style.color).toBe("oklab(0.7 0.1 0.1)");
  });

  it("normaliseert ook backgroundImage met oklch in een gradient", () => {
    const el = document.createElement("div");
    el.setAttribute(
      "style",
      "background-image: linear-gradient(to right, oklch(70% 0.2 30deg), #fff)",
    );
    document.body.appendChild(el);

    const restore = inlineUnsupportedColors(document.documentElement, fakeResolver);

    expect(el.style.backgroundImage).toContain("rgb(44, 55, 66)");
    expect(el.style.backgroundImage).not.toContain("oklch");

    restore();
    expect(el.style.backgroundImage).toContain("oklch");
  });

  it("raakt elementen zonder oklab/oklch niet aan", () => {
    const el = document.createElement("div");
    el.setAttribute("style", "color: rgb(255, 0, 0); background-color: #abc");
    document.body.appendChild(el);
    const before = el.getAttribute("style");

    const restore = inlineUnsupportedColors(document.documentElement, fakeResolver);
    expect(el.getAttribute("style")).toBe(before);

    restore();
    expect(el.getAttribute("style")).toBe(before);
  });

  it("walkt nested elementen", () => {
    document.body.innerHTML = `
      <section>
        <article style="color: oklab(0.5 0 0)">
          <span style="background-color: oklch(50% 0.1 0)">x</span>
        </article>
      </section>
    `;

    const restore = inlineUnsupportedColors(document.documentElement, fakeResolver);

    const article = document.querySelector("article") as HTMLElement;
    const span = document.querySelector("span") as HTMLElement;
    expect(article.style.color).toBe("rgb(11, 22, 33)");
    expect(span.style.backgroundColor).toBe("rgb(44, 55, 66)");

    restore();
    // JSDOM canonicalizes het percentage (50% → 0.5); kern is dat de oklch
    // string terug staat na restore, niet de exacte literal.
    expect(article.style.color).toBe("oklab(0.5 0 0)");
    expect(span.style.backgroundColor).toMatch(/^oklch\(/);
  });
});
