import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * CC-002 — architecturale guard: `@repo/database`-mutations mogen NOOIT
 * `@repo/notifications` importeren (anders ontstaat een circulaire dep).
 *
 * Notify-calls leven op de server-action laag (`apps/*`); mutations blijven
 * notifications-vrij. Deze test grept de mutation-tree statisch.
 */

const MUTATIONS_ROOT = join(__dirname, "..", "..", "database", "src", "mutations");

function* walkTs(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) yield* walkTs(full);
    else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) yield full;
  }
}

describe("architectural guard: mutations are notifications-free", () => {
  it("geen enkel @repo/database/mutations bestand importeert @repo/notifications", () => {
    const offenders: string[] = [];
    for (const file of walkTs(MUTATIONS_ROOT)) {
      const content = readFileSync(file, "utf8");
      if (/from\s+["']@repo\/notifications/.test(content)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});
