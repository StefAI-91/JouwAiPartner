import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * TH-014 — Theme-Narrator agent tests. Boundary-mock op `generateObject`
 * (Vercel AI SDK) + Anthropic SDK. We asserteren op: (a) output-schema
 * respected, (b) totale char-cap toegepast met correcte drop-order, en
 * (c) briefing + signal_* blijven altijd staan ook onder cap.
 */
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));
vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => ({ modelId: "test" })),
}));
vi.mock("../../src/agents/run-logger", () => ({
  withAgentRun: async (_meta: unknown, fn: () => Promise<{ result: unknown; usage?: unknown }>) => {
    const { result } = await fn();
    return result;
  },
}));

import { generateObject } from "ai";
import { runThemeNarrator, type RunThemeNarratorInput } from "../../src/agents/theme-narrator";
import {
  NARRATIVE_TOTAL_CHAR_CAP,
  type ThemeNarratorOutput,
} from "../../src/validations/theme-narrator";

const mockGenerateObject = generateObject as unknown as ReturnType<typeof vi.fn>;

function baseInput(): RunThemeNarratorInput {
  return {
    theme: {
      themeId: "d0000000-0000-0000-0000-000000000005",
      name: "Founder-ritme & samenwerking",
      emoji: "🗣️",
      description: "Wekelijkse sync tussen Stef en Wouter.",
      matching_guide: "Valt onder 1-op-1's, standups, strategische sync.",
    },
    meetings: [
      {
        meeting_id: "m-1",
        date: "2026-04-23",
        title: "Cai Studio klantportaal",
        confidence: "medium",
        evidence_quote: "We hebben het over rolverdeling gehad.",
        summary: "## Briefing\nStef en Wouter bespraken rolverdeling.",
      },
      {
        meeting_id: "m-2",
        date: "2026-04-22",
        title: "Rolverdeling",
        confidence: "high",
        evidence_quote: "Stef pakt CTO-rol.",
        summary: "## Briefing\nCTO-rol expliciet gemaakt.",
      },
    ],
  };
}

function happyOutput(overrides: Partial<ThemeNarratorOutput> = {}): ThemeNarratorOutput {
  return {
    briefing: "Jullie rolverdeling is deze maand expliciet geworden.",
    patterns: "Pattern A",
    alignment: "Alignment A",
    friction: "Friction A",
    open_points: "Open A",
    blind_spots: "Blind A",
    signal_strength: "sterk",
    signal_notes: "4 meetings in 10 dagen.",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runThemeNarrator — happy path", () => {
  it("returnt de LLM-output ongewijzigd wanneer totale lengte onder de cap blijft", async () => {
    const output = happyOutput();
    mockGenerateObject.mockResolvedValueOnce({ object: output, usage: {} });

    const result = await runThemeNarrator(baseInput());

    expect(result).toEqual(output);
    expect(mockGenerateObject).toHaveBeenCalledOnce();
  });

  it("stuurt de thema-definitie én de meeting-summaries naar de LLM-call", async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: happyOutput(), usage: {} });

    await runThemeNarrator(baseInput());

    const call = mockGenerateObject.mock.calls[0]![0]! as {
      messages: Array<{ role: string; content: unknown }>;
    };
    const userMessage = call.messages.find((m) => m.role === "user");
    expect(userMessage).toBeDefined();
    const content = String(userMessage!.content);
    expect(content).toContain("Founder-ritme & samenwerking");
    expect(content).toContain("Matching guide");
    expect(content).toContain("Rolverdeling");
    expect(content).toContain("Cai Studio klantportaal");
  });
});

describe("runThemeNarrator — totale char-cap", () => {
  it("laat blind_spots als eerste vallen wanneer totaal de cap overschrijdt", async () => {
    const huge = "x".repeat(NARRATIVE_TOTAL_CHAR_CAP); // alleen al hier: over de cap
    const output = happyOutput({
      blind_spots: huge,
    });
    mockGenerateObject.mockResolvedValueOnce({ object: output, usage: {} });

    const result = await runThemeNarrator(baseInput());

    expect(result.blind_spots).toBeNull();
    // de andere optionele secties blijven ongemoeid want cap is nu onder drempel
    expect(result.patterns).toBe("Pattern A");
    expect(result.alignment).toBe("Alignment A");
    expect(result.briefing).toBeTruthy();
    expect(result.signal_strength).toBe("sterk");
    expect(result.signal_notes).toBeTruthy();
  });

  it("laat meerdere secties vallen in volgorde blind_spots → open_points → friction als alle te groot zijn", async () => {
    const big = "x".repeat(4000);
    const output = happyOutput({
      patterns: big,
      alignment: big,
      friction: big,
      open_points: big,
      blind_spots: big,
    });
    mockGenerateObject.mockResolvedValueOnce({ object: output, usage: {} });

    const result = await runThemeNarrator(baseInput());

    // Drop-order: blind_spots eerst, dan open_points, dan friction. Daarna
    // zou totaal nog boven cap zijn (3 * 4000 = 12_000 > 10_000), dus ook
    // friction valt weg tot onder cap.
    expect(result.blind_spots).toBeNull();
    expect(result.open_points).toBeNull();
    // Afhankelijk van precieze lengte valt friction eventueel ook.
    // Hard garantie: ofwel friction=null, ofwel totaal <= cap.
    const total =
      (result.briefing?.length ?? 0) +
      (result.patterns?.length ?? 0) +
      (result.alignment?.length ?? 0) +
      (result.friction?.length ?? 0) +
      (result.open_points?.length ?? 0) +
      (result.blind_spots?.length ?? 0) +
      (result.signal_notes?.length ?? 0);
    expect(total).toBeLessThanOrEqual(NARRATIVE_TOTAL_CHAR_CAP);
  });

  it("behoudt altijd briefing en signal-velden, zelfs onder extreme cap-druk", async () => {
    const huge = "x".repeat(NARRATIVE_TOTAL_CHAR_CAP * 2);
    const output = happyOutput({
      patterns: huge,
      alignment: huge,
      friction: huge,
      open_points: huge,
      blind_spots: huge,
    });
    mockGenerateObject.mockResolvedValueOnce({ object: output, usage: {} });

    const result = await runThemeNarrator(baseInput());

    expect(result.briefing).toBeTruthy();
    expect(result.signal_strength).toBe("sterk");
    expect(result.signal_notes).toBeTruthy();
  });
});
