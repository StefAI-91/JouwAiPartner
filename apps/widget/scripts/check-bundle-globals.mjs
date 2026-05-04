import { readFile } from "node:fs/promises";

/**
 * WG-007 + WG-006 build-guard. Faalt de build als een van de bundles
 * z'n `window.__JAIPWidget*=` toewijzing kwijt is, of als een outer
 * `var __JAIPWidget*=` shadow opnieuw is geïntroduceerd door een
 * esbuild `globalName`-toevoeging. Beide zijn de fout-classes waardoor
 * klikken op de feedback-knop (of "Screenshot toevoegen") stilletjes
 * niets zou doen.
 */

const BUNDLES = [
  { file: "public/widget.js", global: "__JAIPWidget" },
  { file: "public/widget-screenshot.js", global: "__JAIPWidgetScreenshot" },
];

let hadError = false;

for (const { file, global } of BUNDLES) {
  const src = await readFile(file, "utf8");

  const innerBindRe = new RegExp(`window\\.${global}\\s*=`);
  const outerShadowRe = new RegExp(`^("use strict";)?\\s*var\\s+${global}\\s*=`);

  const hasInnerBind = innerBindRe.test(src);
  const hasOuterShadow = outerShadowRe.test(src);

  if (!hasInnerBind) {
    console.error(`✗ ${file}: missing 'window.${global}=' assignment — IIFE moet 'm zelf zetten`);
    hadError = true;
  }
  if (hasOuterShadow) {
    console.error(
      `✗ ${file}: outer 'var ${global}=' shadow re-introduced — verwijder esbuild 'globalName' (zie WG-007)`,
    );
    hadError = true;
  }
  if (hasInnerBind && !hasOuterShadow) {
    console.log(`✓ ${file}: window.${global} binding intact, geen var-shadow`);
  }
}

if (hadError) process.exit(1);
