import { describe, it, expect, vi, beforeEach } from "vitest";

// Boundary-mock: we controleren de generateObject-response zonder echte
// Anthropic-call. We asserten op de post-processed output van runRiskSpecialist:
// specifiek dat een quote-mismatch confidence capt op 0.25 (niet 0.3).
// Zie agent-file voor uitleg: v5 staat 0.3 toe als bewuste twijfel-
// classificatie, dus de cap moet ondubbelzinnig ≠ 0.3 zijn.
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

describe("RiskSpecialist quote-cap (PW-QC-04 QUAL-QC-032)", () => {
  it("capt confidence op 0.25 als source_quote niet in transcript staat", async () => {
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

    expect(output.risks[0].confidence).toBe(0.25);
    expect(output.risks[0].confidence).not.toBe(0.3);
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

  it("laat bewuste 0.3-twijfelclassificatie ongemoeid als quote wél matcht", async () => {
    // Het model mag 0.3 kiezen als bewuste twijfelclassificatie onder v5.
    // Als de quote wél matcht moet 0.3 exact 0.3 blijven — niet per ongeluk
    // naar 0.25 ge-capt worden door een cap op de verkeerde plek.
    const quote = "Dit is een transcript";
    mockGenerateObject.mockResolvedValue({
      object: { risks: [risk({ source_quote: quote, confidence: 0.3 })] },
      usage: { inputTokens: 10, outputTokens: 10, reasoningTokens: 5 },
    });

    const { output } = await runRiskSpecialist(TRANSCRIPT, {
      title: "test",
      meeting_type: "board",
      party_type: "internal",
      meeting_date: "2026-04-20",
      participants: ["Stef"],
    });

    expect(output.risks[0].confidence).toBe(0.3);
  });
});
