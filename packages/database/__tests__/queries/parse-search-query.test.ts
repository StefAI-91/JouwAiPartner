import { describe, it, expect } from "vitest";
import { parseSearchQuery } from "../../src/queries/issues";

describe("parseSearchQuery", () => {
  it("returns empty object for null/undefined/empty/whitespace", () => {
    expect(parseSearchQuery(undefined)).toEqual({});
    expect(parseSearchQuery(null)).toEqual({});
    expect(parseSearchQuery("")).toEqual({});
    expect(parseSearchQuery("   ")).toEqual({});
  });

  it("treats a bare number as an issue_number lookup", () => {
    expect(parseSearchQuery("464")).toEqual({ issueNumber: 464 });
  });

  it("treats a #-prefixed number as an issue_number lookup", () => {
    expect(parseSearchQuery("#464")).toEqual({ issueNumber: 464 });
  });

  it("trims surrounding whitespace before matching", () => {
    expect(parseSearchQuery("  #464  ")).toEqual({ issueNumber: 464 });
    expect(parseSearchQuery(" 12 ")).toEqual({ issueNumber: 12 });
  });

  it("falls back to text search when anything non-numeric is present", () => {
    expect(parseSearchQuery("auth bug")).toEqual({ search: "auth bug" });
    expect(parseSearchQuery("464 and more")).toEqual({ search: "464 and more" });
    expect(parseSearchQuery("bug-123")).toEqual({ search: "bug-123" });
  });

  it("rejects zero and negative numbers — those are not valid issue numbers", () => {
    // "0" matches the digit regex but fails the > 0 check, so it becomes
    // a text search. Negative numbers have a '-' and fail the regex upfront.
    expect(parseSearchQuery("0")).toEqual({ search: "0" });
    expect(parseSearchQuery("#0")).toEqual({ search: "#0" });
    expect(parseSearchQuery("-1")).toEqual({ search: "-1" });
  });

  it("handles unsafe integers by falling back to search", () => {
    // Numbers beyond Number.MAX_SAFE_INTEGER lose precision; don't pretend we
    // can look up an exact row.
    const huge = "9".repeat(20);
    expect(parseSearchQuery(huge)).toEqual({ search: huge });
  });

  it("does not require hash sign to be present", () => {
    // Users type either "#464" or "464" — both should work identically.
    expect(parseSearchQuery("464")).toEqual(parseSearchQuery("#464"));
  });

  it("preserves the raw trimmed input for text searches", () => {
    expect(parseSearchQuery("  hello world  ")).toEqual({ search: "hello world" });
  });
});
