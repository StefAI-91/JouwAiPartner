import { describe, it, expect } from "vitest";
import {
  SummarizerOutputSchema,
  ParticipantProfileSchema,
  ThemeSummarySchema,
} from "../../src/validations/summarizer";

const validOutput = {
  briefing: "Stef en Wouter bespraken de platformstrategie voor Q2.",
  kernpunten: ["Migratie naar Vitest", "Dashboard redesign"],
  deelnemers: [
    { name: "Stef", role: "Lead", organization: "JouwAiPartner", stance: "enthousiast" },
  ],
  vervolgstappen: ["Setup Vitest", "Schrijf tests"],
  theme_summaries: [],
};

describe("SummarizerOutputSchema", () => {
  it("accepts valid output with all required fields", () => {
    const result = SummarizerOutputSchema.safeParse(validOutput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.briefing).toContain("Stef");
      expect(result.data.kernpunten).toHaveLength(2);
      expect(result.data.theme_summaries).toEqual([]);
    }
  });

  it("accepts output with populated theme_summaries", () => {
    const output = {
      ...validOutput,
      theme_summaries: [
        {
          themeId: "a1b2c3d4-e5f6-4789-9012-3456789abcde",
          briefing: "Focus op coaching-dynamiek tussen Stef en Ege.",
          kernpunten: ["**Signaal:** Stef stuurt op diagnose-first."],
          vervolgstappen: ["Ege test voorbeeldgesprekken in system prompt."],
        },
      ],
    };
    const result = SummarizerOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.theme_summaries).toHaveLength(1);
      expect(result.data.theme_summaries[0].briefing).toContain("coaching");
    }
  });

  it("rejects missing briefing", () => {
    const { briefing: _, ...rest } = validOutput;
    expect(SummarizerOutputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing kernpunten", () => {
    const { kernpunten: _, ...rest } = validOutput;
    expect(SummarizerOutputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing deelnemers", () => {
    const { deelnemers: _, ...rest } = validOutput;
    expect(SummarizerOutputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing vervolgstappen", () => {
    const { vervolgstappen: _, ...rest } = validOutput;
    expect(SummarizerOutputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing theme_summaries", () => {
    const { theme_summaries: _, ...rest } = validOutput;
    expect(SummarizerOutputSchema.safeParse(rest).success).toBe(false);
  });
});

describe("ThemeSummarySchema", () => {
  const valid = {
    themeId: "a1b2c3d4-e5f6-4789-9012-3456789abcde",
    briefing: "Stef en Ege bespraken de coaching-aanpak.",
    kernpunten: ["Diagnose-first werkwijze."],
    vervolgstappen: ["Voorbeeldgesprekken opstellen."],
  };

  it("accepts valid entry", () => {
    expect(ThemeSummarySchema.safeParse(valid).success).toBe(true);
  });

  it("rejects non-UUID themeId", () => {
    const result = ThemeSummarySchema.safeParse({ ...valid, themeId: "theme-1" });
    expect(result.success).toBe(false);
  });

  it("accepts lege kernpunten en vervolgstappen arrays", () => {
    const result = ThemeSummarySchema.safeParse({
      ...valid,
      kernpunten: [],
      vervolgstappen: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("ParticipantProfileSchema", () => {
  it("accepts all nullable fields as null", () => {
    const result = ParticipantProfileSchema.safeParse({
      name: "Speaker 1",
      role: null,
      organization: null,
      stance: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts non-null values", () => {
    const result = ParticipantProfileSchema.safeParse({
      name: "John",
      role: "CTO",
      organization: "Acme",
      stance: "kritisch",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("John");
      expect(result.data.role).toBe("CTO");
    }
  });

  it("rejects missing name", () => {
    expect(
      ParticipantProfileSchema.safeParse({
        role: "CTO",
        organization: "Acme",
        stance: null,
      }).success,
    ).toBe(false);
  });
});
