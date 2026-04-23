import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Boundary-mock op `ai.generateObject` + Anthropic SDK. We asserteren op
 * de post-validatie (caps + hallucination-strip) en op de payload die
 * naar de LLM-call gaat — geen inspectie van interne helpers.
 */
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));
vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => ({ modelId: "test" })),
}));
// run-logger wrapt elke agent-call met agent_runs telemetry; mocking zodat we
// Supabase-client setup niet nodig hebben in unit-tests (zelfde patroon als
// risk-specialist-quote-cap.test.ts).
vi.mock("../../src/agents/run-logger", () => ({
  withAgentRun: async (_meta: unknown, fn: () => Promise<{ result: unknown; usage?: unknown }>) => {
    const { result } = await fn();
    return result;
  },
}));

import { generateObject } from "ai";
import {
  runThemeDetector,
  type RunThemeDetectorInput,
  type ThemeCatalogEntry,
} from "../../src/agents/theme-detector";
import {
  MATCHES_HARD_CAP,
  PROPOSALS_HARD_CAP,
  type ThemeDetectorOutput,
} from "../../src/validations/theme-detector";

const mockGenerateObject = generateObject as unknown as ReturnType<typeof vi.fn>;

const THEME_A: ThemeCatalogEntry = {
  themeId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  name: "MCP Capabilities",
  description: "De rol van MCP in onze stack.",
  matching_guide: "Valt onder als MCP tool-exposure substantieel besproken wordt.",
};
const THEME_B: ThemeCatalogEntry = {
  themeId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  name: "AI-Native Architecture",
  description: "Patronen voor AI-native systemen.",
  matching_guide: "Valt onder als het architectuurbreed is.",
};

function baseInput(
  overrides: Partial<RunThemeDetectorInput["meeting"]> = {},
): RunThemeDetectorInput {
  return {
    meeting: {
      meetingId: "11111111-1111-4111-8111-111111111111",
      title: "Roadmap sync",
      meeting_type: "strategy",
      party_type: "internal",
      participants: ["Stef", "Wouter"],
      summary: "We bespraken MCP tool-exposure uitgebreid en enkele architectuurkeuzes.",
      identified_projects: [{ project_name: "JAP Cockpit", project_id: "p1" }],
      ...overrides,
    },
    themes: [THEME_A, THEME_B],
    negativeExamples: [],
  };
}

function identifiedTheme(themeId: string, overrides: Record<string, unknown> = {}) {
  return {
    themeId,
    confidence: "medium" as const,
    relevance_quote: "quote",
    theme_summary: "wat besproken",
    substantialityEvidence: { extractionCount: 2, reason: "genoeg" },
    ...overrides,
  };
}

function proposedTheme(name: string, overrides: Record<string, unknown> = {}) {
  return {
    name,
    description: "een nieuw thema",
    matching_guide: "matcht wanneer",
    emoji: "🧭" as const,
    rationale: "geen bestaand thema dekt dit",
    evidence_quote: "quote",
    ...overrides,
  };
}

function mockOutput(output: ThemeDetectorOutput) {
  mockGenerateObject.mockResolvedValue({
    object: output,
    usage: { inputTokens: 100, outputTokens: 50 },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runThemeDetector — happy path", () => {
  it("retourneert de volledige detector-output ongewijzigd wanneer binnen caps", async () => {
    mockOutput({
      identified_themes: [identifiedTheme(THEME_A.themeId)],
      proposed_themes: [proposedTheme("Cost monitoring")],
    });

    const out = await runThemeDetector(baseInput());
    expect(out.identified_themes).toHaveLength(1);
    expect(out.identified_themes[0].themeId).toBe(THEME_A.themeId);
    expect(out.proposed_themes).toHaveLength(1);
    expect(out.proposed_themes[0].name).toBe("Cost monitoring");
  });
});

describe("runThemeDetector — post-validatie (AI-233)", () => {
  it("strip identified_themes met onbekende themeId", async () => {
    mockOutput({
      identified_themes: [
        identifiedTheme(THEME_A.themeId),
        identifiedTheme("ffffffff-ffff-4fff-8fff-ffffffffffff"),
      ],
      proposed_themes: [],
    });

    const out = await runThemeDetector(baseInput());
    expect(out.identified_themes).toHaveLength(1);
    expect(out.identified_themes[0].themeId).toBe(THEME_A.themeId);
  });

  it("cap MATCHES_HARD_CAP op identified_themes onafhankelijk van proposals", async () => {
    // 10 identified voor theme A, 5 proposals → cap naar 6 + 3.
    mockOutput({
      identified_themes: Array.from({ length: 10 }, () => identifiedTheme(THEME_A.themeId)),
      proposed_themes: Array.from({ length: 5 }, (_, i) => proposedTheme(`Nieuw ${i}`)),
    });

    const out = await runThemeDetector(baseInput());
    expect(out.identified_themes.length).toBeLessThanOrEqual(MATCHES_HARD_CAP);
    expect(out.proposed_themes.length).toBeLessThanOrEqual(PROPOSALS_HARD_CAP);
    // Onafhankelijke caps bevestigen: 6 + 3 tegelijk mag.
    expect(out.identified_themes.length).toBe(MATCHES_HARD_CAP);
    expect(out.proposed_themes.length).toBe(PROPOSALS_HARD_CAP);
  });

  it("lege lijst is acceptabel (meeting met geen substantiële themes)", async () => {
    mockOutput({ identified_themes: [], proposed_themes: [] });
    const out = await runThemeDetector(baseInput());
    expect(out.identified_themes).toEqual([]);
    expect(out.proposed_themes).toEqual([]);
  });
});

describe("runThemeDetector — user-prompt payload", () => {
  it("geeft identified_projects, meeting-metadata en themes-catalog door in de user-content", async () => {
    mockOutput({ identified_themes: [], proposed_themes: [] });
    await runThemeDetector(baseInput());

    expect(mockGenerateObject).toHaveBeenCalledOnce();
    const call = mockGenerateObject.mock.calls[0][0] as {
      messages: { role: string; content: string }[];
    };
    const userContent = call.messages.find((m) => m.role === "user")?.content ?? "";
    expect(userContent).toContain("JAP Cockpit");
    expect(userContent).toContain("MCP Capabilities");
    expect(userContent).toContain("AI-Native Architecture");
    expect(userContent).toContain("strategy");
    expect(userContent).toContain("internal");
  });
});
