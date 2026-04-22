import { describe, it, expect } from "vitest";
import { computeCanSubmit, computeIsDirty } from "../../src/hooks/use-theme-form-state";

/**
 * TH-008 — pure validator- en dirty-check uit `useThemeFormState`. Hook zelf
 * draait op React (client), deze twee helpers zijn pure functies en hier
 * getest zodat edit-form en approval-card identiek valideren (Zod-grenzen
 * in sync).
 */

describe("computeCanSubmit (TH-008)", () => {
  it("true wanneer alle velden voldoen", () => {
    expect(
      computeCanSubmit({
        name: "Hiring",
        description: "Over openstaande rollen",
        matchingGuide: "Valt onder als het over vacatures gaat; niet bij werkdruk.",
      }),
    ).toBe(true);
  });

  it("false bij te korte name (< THEME_NAME_MIN=2)", () => {
    expect(
      computeCanSubmit({
        name: "A",
        description: "Over rollen",
        matchingGuide: "Valt onder als het over vacatures gaat; niet bij werkdruk.",
      }),
    ).toBe(false);
  });

  it("false bij te korte description (< THEME_DESC_MIN=5)", () => {
    expect(
      computeCanSubmit({
        name: "Hiring",
        description: "kort",
        matchingGuide: "Valt onder als het over vacatures gaat; niet bij werkdruk.",
      }),
    ).toBe(false);
  });

  it("false bij te korte matching_guide (< THEME_GUIDE_MIN=20)", () => {
    expect(
      computeCanSubmit({
        name: "Hiring",
        description: "Over rollen",
        matchingGuide: "te kort",
      }),
    ).toBe(false);
  });

  it("trimt whitespace — pure spaties tellen niet", () => {
    expect(
      computeCanSubmit({
        name: "   ",
        description: "   Over rollen   ",
        matchingGuide: "Valt onder als het over vacatures gaat; niet bij werkdruk.",
      }),
    ).toBe(false);
  });
});

describe("computeIsDirty (TH-008)", () => {
  const INITIAL = {
    name: "Hiring",
    description: "Over openstaande rollen",
    matching_guide: "Valt onder als het over vacatures gaat",
    emoji: "👥",
  };

  it("false wanneer alle velden ongewijzigd zijn", () => {
    expect(
      computeIsDirty(
        {
          name: INITIAL.name,
          description: INITIAL.description,
          matchingGuide: INITIAL.matching_guide,
          emoji: INITIAL.emoji,
        },
        INITIAL,
      ),
    ).toBe(false);
  });

  it("true wanneer name veranderde", () => {
    expect(
      computeIsDirty(
        {
          name: "Hiring & Rollen",
          description: INITIAL.description,
          matchingGuide: INITIAL.matching_guide,
          emoji: INITIAL.emoji,
        },
        INITIAL,
      ),
    ).toBe(true);
  });

  it("true wanneer emoji veranderde", () => {
    expect(
      computeIsDirty(
        {
          name: INITIAL.name,
          description: INITIAL.description,
          matchingGuide: INITIAL.matching_guide,
          emoji: "💼",
        },
        INITIAL,
      ),
    ).toBe(true);
  });

  it("true wanneer matching_guide veranderde", () => {
    expect(
      computeIsDirty(
        {
          name: INITIAL.name,
          description: INITIAL.description,
          matchingGuide: "Nieuwe guide-text",
          emoji: INITIAL.emoji,
        },
        INITIAL,
      ),
    ).toBe(true);
  });
});
