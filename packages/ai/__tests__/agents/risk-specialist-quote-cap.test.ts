import { describe, it, expect, vi, beforeEach } from "vitest";

// Boundary-mock: we controleren de generateObject-response zonder echte
// Anthropic-call. De quote-mismatch-cap is verwijderd (zie risk-specialist.ts):
// Sonnet's eigen confidence moet bruikbaar blijven voor severity-filtering.
// Deze tests borgen: (a) clamp naar [0,1] blijft werken, (b) een quote die
// niet in het transcript staat laat confidence ONGEWIJZIGD.
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));
vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => ({ modelId: "test" })),
}));

import { generateObject } from "ai";
import { runRiskSpecialist } from "../../src/agents/risk-specialist";

const mockGenerateObject = generateObject as unknown as ReturnType<typeof vi.fn>;

const TRANSCRIPT = "Dit is een transcript zonder de verzonnen quote erin.";

function risk(overrides: Record<string, unknown> = {}) {
  return {
    content: "Stef dreigt vast te lopen",
    theme: "Capaciteit",
    theme_project: "Algemeen",
    source_quote: "",
    project: "",
    confidence: 0.9,
    metadata: {
      severity: "high",
      category: "team",
      jaip_impact_area: "delivery",
      raised_by: "Wouter",
    },
    reasoning: "Test-reasoning.",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RiskSpecialist confidence post-processing", () => {
  it("laat confidence ongewijzigd als source_quote NIET in transcript staat", async () => {
    // Cap is bewust verwijderd: Sonnet's confidence is leidend zodat
    // downstream op severity kan filteren. Quote-verificatie wordt later
    // als apart signaal teruggebracht zonder de confidence te overschrijven.
    mockGenerateObject.mockResolvedValue({
      object: {
        risks: [risk({ source_quote: "quote die niet in transcript staat", confidence: 0.9 })],
      },
      usage: { inputTokens: 100, outputTokens: 50, reasoningTokens: 20 },
    });

    const { output } = await runRiskSpecialist(TRANSCRIPT, {
      title: "test",
      meeting_type: "board",
      party_type: "internal",
      meeting_date: "2026-04-20",
      participants: ["Stef", "Wouter"],
    });

    expect(output.risks[0].confidence).toBe(0.9);
  });

  it("laat confidence ongewijzigd als source_quote wél in transcript staat", async () => {
    const quote = "Dit is een transcript";
    mockGenerateObject.mockResolvedValue({
      object: { risks: [risk({ source_quote: quote, confidence: 0.85 })] },
      usage: { inputTokens: 10, outputTokens: 10, reasoningTokens: 5 },
    });

    const { output } = await runRiskSpecialist(TRANSCRIPT, {
      title: "test",
      meeting_type: "board",
      party_type: "internal",
      meeting_date: "2026-04-20",
      participants: ["Stef"],
    });

    expect(output.risks[0].confidence).toBe(0.85);
  });

  it("clampt confidence naar [0,1] als het model buiten de range antwoordt", async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        risks: [
          risk({ source_quote: "", confidence: 1.4 }),
          risk({ source_quote: "", confidence: -0.2 }),
        ],
      },
      usage: { inputTokens: 10, outputTokens: 10, reasoningTokens: 5 },
    });

    const { output } = await runRiskSpecialist(TRANSCRIPT, {
      title: "test",
      meeting_type: "board",
      party_type: "internal",
      meeting_date: "2026-04-20",
      participants: ["Stef"],
    });

    expect(output.risks[0].confidence).toBe(1);
    expect(output.risks[1].confidence).toBe(0);
  });
});
