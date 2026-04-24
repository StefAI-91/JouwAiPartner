import { describe, it, expect } from "vitest";
import type { TimelineEntry } from "@repo/ai/validations/project-summary";
import { groupTimelineByMonth } from "../group-timeline-by-month";

function entry(date: string, title = "x"): TimelineEntry {
  return {
    date,
    source_type: "meeting",
    meeting_type: "status_update",
    title,
    summary: "y",
    key_decisions: [],
    open_actions: [],
  };
}

describe("groupTimelineByMonth", () => {
  it("returns empty array for empty input", () => {
    expect(groupTimelineByMonth([])).toEqual([]);
  });

  it("groups entries by YYYY-MM", () => {
    const result = groupTimelineByMonth([
      entry("2026-04-23"),
      entry("2026-04-12"),
      entry("2026-01-19"),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].month).toBe("2026-01");
    expect(result[1].month).toBe("2026-04");
    expect(result[1].entries).toHaveLength(2);
  });

  it("sorts entries oldest first within a group", () => {
    const result = groupTimelineByMonth([entry("2026-04-23", "b"), entry("2026-04-12", "a")]);
    expect(result[0].entries[0].title).toBe("a");
    expect(result[0].entries[1].title).toBe("b");
  });

  it("produces NL month labels", () => {
    const result = groupTimelineByMonth([entry("2026-01-15"), entry("2026-12-01")]);
    expect(result[0].label).toBe("Januari 2026");
    expect(result[1].label).toBe("December 2026");
  });

  it("handles cross-year ordering", () => {
    const result = groupTimelineByMonth([entry("2026-01-10"), entry("2025-12-05")]);
    expect(result[0].month).toBe("2025-12");
    expect(result[1].month).toBe("2026-01");
  });
});
