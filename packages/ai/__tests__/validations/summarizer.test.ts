import { describe, it, expect } from "vitest";
import {
  SummarizerOutputSchema,
  ThemeSchema,
  ParticipantProfileSchema,
} from "../../src/validations/summarizer";

const validOutput = {
  briefing: "Stef en Wouter bespraken de platformstrategie voor Q2.",
  kernpunten: ["Migratie naar Vitest", "Dashboard redesign"],
  deelnemers: [
    { name: "Stef", role: "Lead", organization: "JouwAiPartner", stance: "enthousiast" },
  ],
  themas: [{ title: "Testing", summary: "Migratie naar Vitest", quotes: ["Let's use Vitest"] }],
  sfeer: "Constructief en energiek",
  context: "Vervolg op de Q1 review meeting",
  vervolgstappen: ["Setup Vitest", "Schrijf tests"],
};

describe("SummarizerOutputSchema", () => {
  it("accepts valid output with all required fields", () => {
    const result = SummarizerOutputSchema.safeParse(validOutput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.briefing).toContain("Stef");
      expect(result.data.kernpunten).toHaveLength(2);
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

  it("rejects missing sfeer", () => {
    const { sfeer: _, ...rest } = validOutput;
    expect(SummarizerOutputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing context", () => {
    const { context: _, ...rest } = validOutput;
    expect(SummarizerOutputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing vervolgstappen", () => {
    const { vervolgstappen: _, ...rest } = validOutput;
    expect(SummarizerOutputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing deelnemers", () => {
    const { deelnemers: _, ...rest } = validOutput;
    expect(SummarizerOutputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing themas", () => {
    const { themas: _, ...rest } = validOutput;
    expect(SummarizerOutputSchema.safeParse(rest).success).toBe(false);
  });
});

describe("ThemeSchema", () => {
  it("accepts valid theme with title, summary, quotes", () => {
    const result = ThemeSchema.safeParse({
      title: "AI Strategy",
      summary: "Discussion about AI",
      quotes: ["AI is the future"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("AI Strategy");
    }
  });

  it("accepts empty quotes array", () => {
    expect(ThemeSchema.safeParse({ title: "T", summary: "S", quotes: [] }).success).toBe(true);
  });

  it("rejects missing title", () => {
    expect(ThemeSchema.safeParse({ summary: "S", quotes: [] }).success).toBe(false);
  });

  it("rejects missing summary", () => {
    expect(ThemeSchema.safeParse({ title: "T", quotes: [] }).success).toBe(false);
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
