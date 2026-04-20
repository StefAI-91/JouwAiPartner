import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock `ai` zodat we generateObject-response kunnen controleren zonder
// Anthropic-call. We asserten op de post-processed output van beide
// agent-functies: specifiek dat een quote-mismatch confidence capt op
// 0.25, niet 0.3. Zie comment in beide agent-files over waarom 0.25
// (v5 staat 0.3 toe als bewuste twijfelclassificatie).
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));
vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => ({ modelId: "test" })),
}));

import { generateObject } from "ai";
import { runRiskSpecialist } from "../../src/agents/risk-specialist";
import { runMeetingStructurer } from "../../src/agents/meeting-structurer";

const mockGenerateObject = generateObject as unknown as ReturnType<typeof vi.fn>;

const TRANSCRIPT = "Dit is een transcript zonder de verzonnen quote erin.";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RiskSpecialist quote-cap (PW-QC-03 AI-QC-007 / QUAL-QC-020)", () => {
  it("capt confidence op 0.25 als source_quote niet in transcript staat", async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        risks: [
          {
            content: "Stef dreigt vast te lopen",
            theme: "Capaciteit",
            theme_project: "Algemeen",
            source_quote: "quote die niet in transcript staat",
            project: "",
            confidence: 0.9,
            metadata: {
              severity: "high",
              category: "team",
              jaip_impact_area: "delivery",
              raised_by: "Wouter",
            },
            reasoning: "Test-reasoning.",
          },
        ],
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
      object: {
        risks: [
          {
            content: "c",
            theme: "t",
            theme_project: "Algemeen",
            source_quote: quote,
            project: "",
            confidence: 0.85,
            metadata: {
              severity: "high",
              category: "team",
              jaip_impact_area: "delivery",
              raised_by: "Wouter",
            },
            reasoning: "Test.",
          },
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

    expect(output.risks[0].confidence).toBe(0.85);
  });

  it("laat bewuste 0.3-twijfelclassificatie ongemoeid (<= cap 0.25 zou deze verlagen — mag NIET)", async () => {
    // Het model mag 0.3 kiezen als bewuste twijfelclassificatie onder v5.
    // Als de quote wél matcht moet 0.3 exact 0.3 blijven, niet per ongeluk
    // naar 0.25 ge-capt worden door een cap op de verkeerde plek.
    const quote = "Dit is een transcript";
    mockGenerateObject.mockResolvedValue({
      object: {
        risks: [
          {
            content: "patroon-risk",
            theme: "t",
            theme_project: "Algemeen",
            source_quote: quote,
            project: "",
            confidence: 0.3,
            metadata: {
              severity: "medium",
              category: "team",
              jaip_impact_area: "team",
              raised_by: "impliciet",
            },
            reasoning: "Bewuste twijfel.",
          },
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

    expect(output.risks[0].confidence).toBe(0.3);
  });
});

describe("MeetingStructurer quote-cap (PW-QC-03 AI-QC-007 / QUAL-QC-020)", () => {
  function baseKernpunt(overrides: Record<string, unknown> = {}) {
    return {
      type: "risk",
      content: "Test kernpunt",
      theme: "Thema",
      theme_project: "Algemeen",
      source_quote: "",
      project: "",
      confidence: 0.9,
      follow_up_context: "",
      reasoning: "Test.",
      metadata: {
        effort_estimate: "n/a",
        impact_area: "n/a",
        severity: "high",
        jaip_impact_area: "delivery",
        party: "n/a",
        horizon: "n/a",
        sentiment: "n/a",
        signal_type: "n/a",
        sensitive: false,
        category: "team",
        scope: "n/a",
        status: "n/a",
        urgency: "n/a",
        direction: "n/a",
        domain: "n/a",
        follow_up_contact: "",
        assignee: "",
        deadline: "",
        decided_by: "",
        raised_by: "Wouter",
        committer: "",
        committed_to: "",
        needs_answer_from: "",
        jaip_category: "",
        contact_channel: "",
        relationship_context: "",
      },
      ...overrides,
    };
  }

  it("capt confidence op 0.25 als source_quote niet in transcript staat", async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        briefing: "Korte briefing.",
        entities: { clients: [], people: [] },
        deelnemers: [],
        kernpunten: [
          baseKernpunt({
            source_quote: "verzonnen quote niet in transcript",
            confidence: 0.9,
          }),
        ],
      },
    });

    const output = await runMeetingStructurer(TRANSCRIPT, {
      title: "test",
      meeting_type: "board",
      party_type: "internal",
      meeting_date: "2026-04-20",
      participants: ["Stef"],
    });

    expect(output.kernpunten[0].confidence).toBe(0.25);
    expect(output.kernpunten[0].confidence).not.toBe(0.3);
  });

  it("laat confidence ongewijzigd als source_quote wél in transcript staat", async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        briefing: "Korte briefing.",
        entities: { clients: [], people: [] },
        deelnemers: [],
        kernpunten: [
          baseKernpunt({
            source_quote: "Dit is een transcript",
            confidence: 0.85,
          }),
        ],
      },
    });

    const output = await runMeetingStructurer(TRANSCRIPT, {
      title: "test",
      meeting_type: "board",
      party_type: "internal",
      meeting_date: "2026-04-20",
      participants: ["Stef"],
    });

    expect(output.kernpunten[0].confidence).toBe(0.85);
  });
});
