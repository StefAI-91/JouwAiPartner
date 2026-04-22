import { describe, it, expect } from "vitest";
import { cn } from "../src/utils";

describe("cn", () => {
  it("voegt class-strings samen", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("filtert falsy waarden uit conditionele expressies", () => {
    expect(cn("foo", false && "bar", null, undefined, "baz")).toBe("foo baz");
  });

  it("dedupliceert tegenstrijdige Tailwind utilities (laatste wint)", () => {
    // tailwind-merge regel: latere class overschrijft eerdere op zelfde axis.
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("accepteert object-syntax (clsx-conditional)", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });
});
