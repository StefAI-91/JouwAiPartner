import { describe, it, expect } from "vitest";
import { buildSegments } from "../../src/components/themes/donut-segments";
import { DONUT_PALETTE } from "../../src/components/themes/donut-palette";
import type { ThemeShareSlice } from "@repo/database/queries/themes";

const CIRCUMFERENCE = 2 * Math.PI * 54;

function slice(id: string, share: number, name = id): ThemeShareSlice {
  return {
    theme: { id, slug: id, name, emoji: "🏷️" },
    mentions: Math.round(share * 100),
    share,
  };
}

describe("buildSegments", () => {
  it("returnt lege array voor lege input", () => {
    expect(buildSegments([], CIRCUMFERENCE)).toEqual([]);
  });

  it("berekent dash evenredig met share", () => {
    const [a, b] = buildSegments([slice("a", 0.25), slice("b", 0.75)], CIRCUMFERENCE);
    expect(a.dash).toBeCloseTo(CIRCUMFERENCE * 0.25, 5);
    expect(b.dash).toBeCloseTo(CIRCUMFERENCE * 0.75, 5);
  });

  it("offset van segment N is som van dashes van 0..N-1", () => {
    const segments = buildSegments(
      [slice("a", 0.2), slice("b", 0.5), slice("c", 0.3)],
      CIRCUMFERENCE,
    );
    expect(segments[0].offset).toBe(0);
    expect(segments[1].offset).toBeCloseTo(segments[0].dash, 5);
    expect(segments[2].offset).toBeCloseTo(segments[0].dash + segments[1].dash, 5);
  });

  it("kleuren komen uit DONUT_PALETTE in volgorde", () => {
    const segments = buildSegments(
      [slice("a", 0.1), slice("b", 0.1), slice("c", 0.1)],
      CIRCUMFERENCE,
    );
    expect(segments[0].color).toBe(DONUT_PALETTE[0]);
    expect(segments[1].color).toBe(DONUT_PALETTE[1]);
    expect(segments[2].color).toBe(DONUT_PALETTE[2]);
  });

  it("valt terug op palette-wrap bij meer dan 10 slices", () => {
    const many = Array.from({ length: 12 }, (_, i) => slice(`t${i}`, 1 / 12));
    const segments = buildSegments(many, CIRCUMFERENCE);
    expect(segments[10].color).toBe(DONUT_PALETTE[0]);
    expect(segments[11].color).toBe(DONUT_PALETTE[1]);
  });

  it("percent is afgeronde share × 100", () => {
    const [a, b, c] = buildSegments(
      [slice("a", 0.333), slice("b", 0.5), slice("c", 0.167)],
      CIRCUMFERENCE,
    );
    expect(a.percent).toBe(33);
    expect(b.percent).toBe(50);
    expect(c.percent).toBe(17);
  });

  it("som van alle dashes = omtrek bij volledige share-verdeling (1.0)", () => {
    const segments = buildSegments(
      [slice("a", 0.4), slice("b", 0.35), slice("c", 0.25)],
      CIRCUMFERENCE,
    );
    const totalDash = segments.reduce((sum, s) => sum + s.dash, 0);
    expect(totalDash).toBeCloseTo(CIRCUMFERENCE, 5);
  });
});
