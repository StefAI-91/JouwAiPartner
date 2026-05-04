/**
 * Bundle-size CI check. Hard fail bij overschrijding zodat we niet stilletjes
 * naar 200KB drift binnen drie sprints. WG-002 reqs:
 *   - loader.js < 5KB gzip
 *   - widget.js < 30KB gzip (ruim voor Preact-compat baseline ~10KB)
 */

import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";

const checks = [
  { file: "public/loader.js", maxKB: 5 },
  { file: "public/widget.js", maxKB: 30 },
  // WG-006 lazy screenshot-bundle (html2canvas-pro + capture). Alleen geladen
  // bij eerste klik op "Screenshot toevoegen" — baseline widget.js blijft klein.
  // html2canvas-pro is iets groter dan vanilla html2canvas omdat het CSS Color 4
  // (oklab/oklch/lab/lch/hwb/color) parsers meeneemt — nodig voor Tailwind v4.
  // 60KB is praktisch maximum; overweeg `modern-screenshot` als we hieronder
  // willen zakken zonder DOM-coverage te verliezen.
  { file: "public/widget-screenshot.js", maxKB: 60 },
];

let failed = false;
for (const { file, maxKB } of checks) {
  let bytes;
  try {
    bytes = readFileSync(file);
  } catch (err) {
    console.error(`✗ ${file} ontbreekt — heb je esbuild gedraaid? (${err.message})`);
    failed = true;
    continue;
  }
  const gzKB = gzipSync(bytes).length / 1024;
  const status = gzKB > maxKB ? "✗" : "✓";
  const detail = gzKB > maxKB ? `OVER LIMIT (max ${maxKB}KB)` : `(max ${maxKB}KB)`;
  console.log(`${status} ${file}: ${gzKB.toFixed(2)}KB gzip ${detail}`);
  if (gzKB > maxKB) failed = true;
}

if (failed) {
  console.error("\nBundle-budget overschreden. Verwijder unused imports of overweeg een lichter alternatief.");
  process.exit(1);
}
