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

// CC-008 — regex dekt drie aanroep-vormen die allemaal een import vormen:
//   - `import x from "@repo/notifications"` (static)
//   - `import("@repo/notifications")` (dynamic)
//   - `export ... from "@repo/notifications"` (re-export)
// Spaces, single/double quotes en optioneel sub-pad zijn flexibel.
const NOTIFICATIONS_IMPORT_RE =
  /(?:from\s+|import\s*\(\s*|export\s+(?:\*|\{[^}]*\})\s+from\s+)["']@repo\/notifications(?:\/[^"']*)?["']/;

describe("architectural guard: mutations are notifications-free", () => {
  it("geen enkel @repo/database/mutations bestand importeert @repo/notifications", () => {
    const offenders: string[] = [];
    for (const file of walkTs(MUTATIONS_ROOT)) {
      const content = readFileSync(file, "utf8");
      if (NOTIFICATIONS_IMPORT_RE.test(content)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("regex matcht zowel static, dynamic als re-export imports (CC-008)", () => {
    expect(NOTIFICATIONS_IMPORT_RE.test('import { x } from "@repo/notifications";')).toBe(true);
    expect(NOTIFICATIONS_IMPORT_RE.test('import x from "@repo/notifications/send";')).toBe(true);
    expect(NOTIFICATIONS_IMPORT_RE.test("await import('@repo/notifications')")).toBe(true);
    expect(NOTIFICATIONS_IMPORT_RE.test('export * from "@repo/notifications";')).toBe(true);
    expect(NOTIFICATIONS_IMPORT_RE.test('export { sendMail } from "@repo/notifications";')).toBe(
      true,
    );
    expect(NOTIFICATIONS_IMPORT_RE.test('import { x } from "@repo/database";')).toBe(false);
  });
});
