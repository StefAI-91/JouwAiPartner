import { describe, it, expect } from "vitest";
import type { TimelineEntry } from "@repo/ai/validations/project-summary";
import { detectPivot } from "../detect-pivot";

function entry(overrides: Partial<TimelineEntry> = {}): TimelineEntry {
  return {
    date: "2026-04-23",
    source_type: "meeting",
    meeting_type: "status_update",
    title: "x",
    summary: "y",
    key_decisions: [],
    open_actions: [],
    ...overrides,
  };
}

describe("detectPivot", () => {
  it("returns true for kickoff meetings", () => {
    expect(detectPivot(entry({ meeting_type: "kickoff" }))).toBe(true);
  });

  it("returns true for strategy meetings", () => {
    expect(detectPivot(entry({ meeting_type: "strategy" }))).toBe(true);
  });

  it("returns true for review meetings", () => {
    expect(detectPivot(entry({ meeting_type: "review" }))).toBe(true);
  });

  it("returns true when key_decisions has 3+ items", () => {
    expect(detectPivot(entry({ key_decisions: ["a", "b", "c"] }))).toBe(true);
  });

  it("returns false for routine status update with 0 decisions", () => {
    expect(detectPivot(entry({ meeting_type: "status_update", key_decisions: [] }))).toBe(false);
  });

  it("returns false with 2 decisions and non-pivot type", () => {
    expect(detectPivot(entry({ meeting_type: "status_update", key_decisions: ["a", "b"] }))).toBe(
      false,
    );
  });

  it("returns false for emails without pivot-meeting-type and <3 decisions", () => {
    expect(
      detectPivot(entry({ source_type: "email", meeting_type: null, key_decisions: ["a"] })),
    ).toBe(false);
  });

  it("handles null meeting_type gracefully", () => {
    expect(detectPivot(entry({ meeting_type: null, key_decisions: [] }))).toBe(false);
  });
});
