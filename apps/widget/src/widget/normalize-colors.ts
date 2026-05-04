/**
 * html2canvas 1.4.1 ondersteunt geen CSS Color 4 functies (`oklab`, `oklch`,
 * `lab`, `lch`, `hwb`, `color()`) — moderne Tailwind v4 sites (default oklch),
 * brand-pagina's met expliciete `lab()`-kleuren of wide-gamut `color()` calls
 * gooien daardoor "Attempting to parse an unsupported color function" en de
 * capture sterft.
 *
 * Aanpak vóór capture, in twee stappen die elkaar aanvullen:
 *
 *  1. `normalizeStylesheets` — walkt elke CSSRule (incl. `::before`/`::after`,
 *     `@media`, `@supports`) en herschrijft oklab/oklch in place. Dit dekt
 *     pseudo-elementen waar je geen inline style op kunt zetten.
 *  2. `inlineUnsupportedColors` — walkt vervolgens elk DOM-element en zet de
 *     computed kleur-properties als `!important` inline om eventuele blijvers
 *     (incl. CSS variables met oklab waarde) en `!important` rules te verslaan.
 *
 * Beide functies retourneren een restore-fn. `try/finally` in screenshot.tsx
 * zorgt dat de pagina identiek terugkomt na de capture.
 *
 * Cross-origin stylesheets blokkeren `cssRules`-toegang; die slaan we stil
 * over. Voor onze klanten (eigen Tailwind-bundle = same-origin) is dat geen
 * probleem.
 */

const COLOR_PROPERTIES = [
  "color",
  "background-color",
  "background-image",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "text-decoration-color",
  "caret-color",
  "column-rule-color",
  "box-shadow",
  "text-shadow",
  "fill",
  "stroke",
] as const;

// CSS Color 4 functies die html2canvas 1.4.1 niet snapt. `\b` voorkomt dat
// `lab`/`lch` per ongeluk binnen `oklab`/`oklch` matchen (geen word-boundary
// tussen k en l). `color(` dekt de wide-gamut syntax (`color(display-p3 ...)`).
const UNSUPPORTED_COLOR_TEST = /\b(oklab|oklch|lab|lch|hwb|color)\s*\(/i;
const UNSUPPORTED_COLOR_REPLACE =
  /\b(oklab|oklch|lab|lch|hwb|color)\s*\([^()]*(?:\([^()]*\)[^()]*)*\)/gi;

export type ColorResolver = (input: string) => string;

export function createCanvasColorResolver(doc: Document = document): ColorResolver | null {
  const ctx = doc.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  return (input) => {
    try {
      ctx.fillStyle = "#000";
      ctx.fillStyle = input;
      const resolved = ctx.fillStyle;
      return typeof resolved === "string" ? resolved : input;
    } catch {
      return input;
    }
  };
}

export function normalizeUnsupportedColors(value: string, resolve: ColorResolver): string {
  if (!value || !UNSUPPORTED_COLOR_TEST.test(value)) return value;
  return value.replace(UNSUPPORTED_COLOR_REPLACE, (match) => resolve(match));
}

export function inlineUnsupportedColors(root: Element, resolve: ColorResolver): () => void {
  const restore: Array<() => void> = [];
  const elements: Element[] = [root, ...Array.from(root.querySelectorAll("*"))];
  for (const el of elements) {
    if (!isStylable(el)) continue;
    const computed = getComputedStyle(el);
    const inline = el.style;
    for (const prop of COLOR_PROPERTIES) {
      const current = computed.getPropertyValue(prop);
      if (!UNSUPPORTED_COLOR_TEST.test(current)) continue;
      const normalized = normalizeUnsupportedColors(current, resolve);
      if (normalized === current) continue;
      const prevValue = inline.getPropertyValue(prop);
      const prevPriority = inline.getPropertyPriority(prop);
      // !important zodat we ook stylesheet-rules met !important verslaan
      // — anders zien we ze terug in computed style en faalt html2canvas.
      inline.setProperty(prop, normalized, "important");
      restore.push(() => {
        if (prevValue) {
          inline.setProperty(prop, prevValue, prevPriority);
        } else {
          inline.removeProperty(prop);
        }
      });
    }
  }
  return runAll(restore);
}

export function normalizeStylesheets(doc: Document, resolve: ColorResolver): () => void {
  const restore: Array<() => void> = [];
  for (const sheet of Array.from(doc.styleSheets)) {
    let rules: CSSRuleList | null = null;
    try {
      rules = sheet.cssRules;
    } catch {
      // Cross-origin stylesheet — kan cssRules niet lezen, sla over.
      continue;
    }
    if (rules) collectRuleRestores(rules, resolve, restore);
  }
  return runAll(restore);
}

function collectRuleRestores(
  rules: CSSRuleList,
  resolve: ColorResolver,
  restore: Array<() => void>,
): void {
  for (const rule of Array.from(rules)) {
    const styleRule = rule as CSSRule & { style?: CSSStyleDeclaration };
    if (styleRule.style && typeof styleRule.style.setProperty === "function") {
      const undo = normalizeStyleDeclaration(styleRule.style, resolve);
      if (undo) restore.push(undo);
    }
    const groupRule = rule as CSSRule & { cssRules?: CSSRuleList };
    if (groupRule.cssRules) {
      try {
        collectRuleRestores(groupRule.cssRules, resolve, restore);
      } catch {
        // Sommige rule-types weigeren cssRules-toegang afhankelijk van browser.
      }
    }
  }
}

function normalizeStyleDeclaration(
  style: CSSStyleDeclaration,
  resolve: ColorResolver,
): (() => void) | null {
  const props = listDeclaredProperties(style);
  const changes: Array<{ prop: string; value: string; priority: string }> = [];
  for (const prop of props) {
    const value = style.getPropertyValue(prop);
    if (!UNSUPPORTED_COLOR_TEST.test(value)) continue;
    const normalized = normalizeUnsupportedColors(value, resolve);
    if (normalized === value) continue;
    const priority = style.getPropertyPriority(prop);
    changes.push({ prop, value, priority });
    style.setProperty(prop, normalized, priority);
  }
  if (changes.length === 0) return null;
  return () => {
    for (const { prop, value, priority } of changes) {
      style.setProperty(prop, value, priority);
    }
  };
}

/**
 * Spec-conform zou `style.item(i)` werken, maar JSDOM mist die op
 * stylesheet-rule-styles. Indexed access (`style[i]`) is óók spec en
 * werkt in beide. We snapshotten alle declared property-names zodat
 * een latere `setProperty` de iteratie niet beïnvloedt.
 */
function listDeclaredProperties(style: CSSStyleDeclaration): string[] {
  const result: string[] = [];
  const length = style.length ?? 0;
  const indexed = style as unknown as Record<number, unknown>;
  for (let i = 0; i < length; i++) {
    let prop: string | null = null;
    if (typeof style.item === "function") {
      try {
        prop = style.item(i);
      } catch {
        prop = null;
      }
    }
    if (!prop) {
      const value = indexed[i];
      prop = typeof value === "string" ? value : null;
    }
    if (prop) result.push(prop);
  }
  return result;
}

function isStylable(el: Element): el is HTMLElement | SVGElement {
  return "style" in el && (el as HTMLElement).style instanceof CSSStyleDeclaration;
}

function runAll(restore: Array<() => void>): () => void {
  return () => {
    while (restore.length > 0) {
      const fn = restore.pop();
      try {
        fn?.();
      } catch {
        // Swallow — restore is best-effort.
      }
    }
  };
}
