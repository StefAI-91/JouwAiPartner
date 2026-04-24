import { describe, it, expect } from "vitest";
import { formatProjectProgress } from "../format-project-progress";

describe("formatProjectProgress", () => {
  it("returns null when start_date is missing", () => {
    expect(formatProjectProgress(null, "2026-06-15")).toBeNull();
  });

  it("returns null when deadline is missing", () => {
    expect(formatProjectProgress("2026-01-12", null)).toBeNull();
  });

  it("returns null when deadline is before start", () => {
    expect(formatProjectProgress("2026-06-15", "2026-01-12")).toBeNull();
  });

  it("returns 50% at the halfway point", () => {
    const today = new Date("2026-03-29"); // ~halfway between jan 12 and jun 15
    const result = formatProjectProgress("2026-01-12", "2026-06-15", today);
    expect(result?.percent).toBeGreaterThanOrEqual(48);
    expect(result?.percent).toBeLessThanOrEqual(52);
    expect(result?.status).toBe("in_progress");
  });

  it("returns status='before' when today is before start", () => {
    const today = new Date("2025-12-01");
    const result = formatProjectProgress("2026-01-12", "2026-06-15", today);
    expect(result?.status).toBe("before");
    expect(result?.percent).toBe(0);
  });

  it("returns status='overdue' when today is past deadline", () => {
    const today = new Date("2026-07-01");
    const result = formatProjectProgress("2026-01-12", "2026-06-15", today);
    expect(result?.status).toBe("overdue");
    expect(result?.percent).toBe(100);
  });

  it("calculates daysRemaining correctly", () => {
    const today = new Date("2026-06-10");
    const result = formatProjectProgress("2026-01-12", "2026-06-15", today);
    expect(result?.daysRemaining).toBe(5);
  });

  it("returns null for invalid date strings", () => {
    expect(formatProjectProgress("not-a-date", "2026-06-15")).toBeNull();
  });
});
