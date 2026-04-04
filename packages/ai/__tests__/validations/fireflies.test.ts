import { describe, it, expect } from "vitest";
import { isValidDuration, hasParticipants } from "../../src/validations/fireflies";

describe("isValidDuration", () => {
  it("returns invalid for meetings shorter than 2 minutes", () => {
    const sentences = [
      { start_time: 0, end_time: 60 }, // 1 minute
    ];
    const result = isValidDuration(sentences);
    expect(result.valid).toBe(false);
    expect(result.duration).toBe(1);
  });

  it("returns valid for meetings of exactly 2 minutes", () => {
    const sentences = [
      { start_time: 0, end_time: 120 },
    ];
    const result = isValidDuration(sentences);
    expect(result.valid).toBe(true);
    expect(result.duration).toBe(2);
  });

  it("returns valid for empty sentences array", () => {
    const result = isValidDuration([]);
    expect(result.valid).toBe(true);
    expect(result.duration).toBe(0);
  });

  it("calculates duration from first start to last end", () => {
    const sentences = [
      { start_time: 10, end_time: 30 },
      { start_time: 40, end_time: 60 },
      { start_time: 70, end_time: 250 }, // 250-10 = 240s = 4min
    ];
    const result = isValidDuration(sentences);
    expect(result.valid).toBe(true);
    expect(result.duration).toBe(4);
  });
});

describe("hasParticipants", () => {
  it("returns false for fewer than 2 participants", () => {
    expect(hasParticipants(["Alice"])).toBe(false);
  });

  it("returns true for 2 or more participants", () => {
    expect(hasParticipants(["Alice", "Bob"])).toBe(true);
  });

  it("returns false for undefined participants", () => {
    expect(hasParticipants(undefined)).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(hasParticipants([])).toBe(false);
  });
});
