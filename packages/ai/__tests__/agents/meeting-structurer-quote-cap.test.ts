import { describe, it, expect, vi, beforeEach } from "vitest";

// Boundary-mock op de AI-SDK — we asserten alleen op de post-processed
// output van runMeetingStructurer. Quote-cap logic hoort op agent-laag
// verifieerbaar te zijn zonder echte Anthropic-call.
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));
vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => ({ modelId: "test" })),
}));

import { generateObject } from "ai";
import { runMeetingStructurer } from "../../src/agents/meeting-structurer";

const mockGenerateObject = generateObject as unknown as ReturnType<typeof vi.fn>;

const TRANSCRIPT = "Dit is een transcript zonder de verzonnen quote erin.";

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MeetingStructurer quote-cap (PW-QC-04 QUAL-QC-033)", () => {
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
