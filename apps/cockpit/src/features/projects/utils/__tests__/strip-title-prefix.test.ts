import { describe, it, expect } from "vitest";
import { stripTitlePrefix } from "../strip-title-prefix";

describe("stripTitlePrefix", () => {
  it("removes simple prefix with space", () => {
    expect(stripTitlePrefix("(Status): platform feedback")).toBe("platform feedback");
  });

  it("removes prefix without space after colon", () => {
    expect(stripTitlePrefix("(Strategie):client-portaal")).toBe("client-portaal");
  });

  it("leaves titles without prefix untouched", () => {
    expect(stripTitlePrefix("Platform feedback")).toBe("Platform feedback");
  });

  it("trims only leading prefix, not trailing content", () => {
    expect(stripTitlePrefix("(X): foo (bar)")).toBe("foo (bar)");
  });

  it("handles empty string", () => {
    expect(stripTitlePrefix("")).toBe("");
  });

  it("handles multi-word prefix", () => {
    expect(stripTitlePrefix("(Status update): weekly sync")).toBe("weekly sync");
  });
});
