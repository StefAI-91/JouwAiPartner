/**
 * html2canvas 1.4.1 ondersteunt geen `oklab()` of `oklch()` — moderne Tailwind
 * v4 sites (default oklch) of expliciet oklab-themed pagina's gooien daardoor
 * "Attempting to parse an unsupported color function" en de capture sterft.
 *
 * Workaround: vóór capture lopen we de DOM door, lezen we de computed values
 * van kleur-dragende properties, en zetten we per element een inline style met
 * een rgb-equivalent dat we via canvas 2D `fillStyle` ophalen — de browser
 * normaliseert daar moderne kleurfuncties zelf naar `#rrggbb` / `rgba(...)`.
 *
 * Restore-fn van `inlineUnsupportedColors` reset alle aangepaste inline
 * styles terug naar hun oorspronkelijke waarde, ook bij failure.
 */

const COLOR_PROPERTIES = [
  "color",
  "backgroundColor",
  "backgroundImage",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "textDecorationColor",
  "caretColor",
  "columnRuleColor",
  "boxShadow",
  "textShadow",
  "fill",
  "stroke",
] as const;

type ColorProperty = (typeof COLOR_PROPERTIES)[number];

const UNSUPPORTED_COLOR_TEST = /\b(oklab|oklch)\s*\(/i;
const UNSUPPORTED_COLOR_REPLACE = /\b(oklab|oklch)\s*\([^()]*(?:\([^()]*\)[^()]*)*\)/gi;

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
    for (const prop of COLOR_PROPERTIES) {
      const current = readStyle(computed, prop);
      if (!UNSUPPORTED_COLOR_TEST.test(current)) continue;
      const normalized = normalizeUnsupportedColors(current, resolve);
      if (normalized === current) continue;
      const previous = readStyle(el.style, prop);
      writeStyle(el.style, prop, normalized);
      restore.push(() => writeStyle(el.style, prop, previous));
    }
  }
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

function isStylable(el: Element): el is HTMLElement | SVGElement {
  return "style" in el && (el as HTMLElement).style instanceof CSSStyleDeclaration;
}

function readStyle(style: CSSStyleDeclaration, prop: ColorProperty): string {
  return (style as unknown as Record<ColorProperty, string>)[prop] ?? "";
}

function writeStyle(style: CSSStyleDeclaration, prop: ColorProperty, value: string): void {
  (style as unknown as Record<ColorProperty, string>)[prop] = value;
}
