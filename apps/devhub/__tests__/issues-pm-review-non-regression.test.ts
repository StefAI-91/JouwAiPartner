import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * CC-001 — non-regression guard voor de DevHub issues-page.
 *
 * `needs_pm_review` issues mogen NIET in de DevHub-default-view verschijnen
 * (vision §5: PM-gate komt vóór DevHub-triage). De relevante constant
 * `UNGROUPED_DEFAULT_OPEN` is module-private; deze test leest de file en
 * assertet op de constant-definitie zelf — dat blokkeert een toekomstige
 * "voeg needs_pm_review toe aan de open-filter"-wijziging.
 */
describe("DevHub issues page — UNGROUPED_DEFAULT_OPEN", () => {
  const pagePath = resolve(__dirname, "../src/app/(app)/issues/page.tsx");
  const source = readFileSync(pagePath, "utf-8");

  it("bevat geen needs_pm_review in UNGROUPED_DEFAULT_OPEN", () => {
    const match = source.match(/UNGROUPED_DEFAULT_OPEN\s*=\s*\[([^\]]*)\]/);
    expect(match).not.toBeNull();
    const arr = match![1];
    expect(arr).not.toContain("needs_pm_review");
  });

  it("bevat de verwachte basis-statussen (triage, backlog, todo, in_progress)", () => {
    const match = source.match(/UNGROUPED_DEFAULT_OPEN\s*=\s*\[([^\]]*)\]/);
    expect(match).not.toBeNull();
    const arr = match![1];
    expect(arr).toContain("triage");
    expect(arr).toContain("backlog");
    expect(arr).toContain("todo");
    expect(arr).toContain("in_progress");
  });
});
