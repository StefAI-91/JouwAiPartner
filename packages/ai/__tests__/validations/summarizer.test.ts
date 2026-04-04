import { describe, it, expect } from "vitest";
import {
  SummarizerOutputSchema,
  ThemeSchema,
  ParticipantProfileSchema,
} from "../../src/validations/summarizer";

describe("SummarizerOutputSchema", () => {
  it("accepts valid output with all required fields", () => {
    const result = SummarizerOutputSchema.safeParse({
      briefing: "Stef en Wouter bespraken de platformstrategie voor Q2.",
      kernpunten: ["Migratie naar Vitest", "Dashboard redesign"],
      deelnemers: [
        { name: "Stef", role: "Lead", organization: "JouwAiPartner", stance: "enthousiast" },
      ],
      themas: [
        { title: "Testing", summary: "Migratie naar Vitest", quotes: ["Let's use Vitest"] },
      ],
      sfeer: "Constructief en energiek",
      context: "Vervolg op de Q1 review meeting",
      vervolgstappen: ["Setup Vitest", "Schrijf tests"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = SummarizerOutputSchema.safeParse({
      briefing: "Some briefing",
    });
    expect(result.success).toBe(false);
  });
});

describe("ThemeSchema", () => {
  it("accepts valid theme with title, summary, quotes", () => {
    const result = ThemeSchema.safeParse({
      title: "AI Strategy",
      summary: "Discussion about AI integration",
      quotes: ["We should invest in AI", "AI is the future"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty quotes array", () => {
    const result = ThemeSchema.safeParse({
      title: "Topic",
      summary: "Summary",
      quotes: [],
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
  });
});
