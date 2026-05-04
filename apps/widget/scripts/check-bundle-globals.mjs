import { readFile } from "node:fs/promises";

/**
 * WG-007 build-guard. Faalt de build als public/widget.js z'n
 * `window.__JAIPWidget=` toewijzing kwijt is, of als een outer
 * `var __JAIPWidget=` shadow opnieuw is geïntroduceerd door
 * een esbuild `globalName`-toevoeging. Beide zijn de fout-classes
 * waardoor klikken op de feedback-knop stilletjes niets deed.
 */

const path = "public/widget.js";
const src = await readFile(path, "utf8");

const hasInnerBind = /window\.__JAIPWidget\s*=/.test(src);
const hasOuterShadow = /^("use strict";)?\s*var\s+__JAIPWidget\s*=/.test(src);

const errors = [];
if (!hasInnerBind) {
  errors.push(`${path}: missing 'window.__JAIPWidget=' assignment — IIFE moet 'm zelf zetten`);
}
if (hasOuterShadow) {
  errors.push(
    `${path}: outer 'var __JAIPWidget=' shadow re-introduced — verwijder esbuild 'globalName' (zie WG-007)`,
  );
}

if (errors.length) {
  for (const e of errors) console.error("✗", e);
  process.exit(1);
}
console.log("✓ widget.js: window.__JAIPWidget binding intact, geen var-shadow");
