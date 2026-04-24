import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * TH-013 — Boundary-mock op `ai.generateObject` + Anthropic SDK. We
 * asserteren op post-validatie (caps, hallucination-strip, fallback-
 * telemetry). Het bestaande patroon uit `theme-detector.test.ts` en
 * `risk-specialist-quote-cap.test.ts` wordt gevolgd: geen inspectie van
 * interne helpers, alleen de payload die naar/van de LLM-grens gaat.
 */
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));
vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => ({ modelId: "test" })),
}));
vi.mock("../../src/agents/run-logger", () => ({
  withAgentRun: async (
    _meta: unknown,
    fn: () => Promise<{ result: unknown; usage?: unknown; metadata?: unknown }>,
  ) => {
    const { result } = await fn();
    return result;
  },
}));

import { generateObject } from "ai";
import {
  runSummarizer,
  formatThemeSummary,
  SUMMARIZER_PROMPT_VERSION,
  THEME_SUMMARIES_HARD_CAP,
  KERNPUNTEN_PER_THEME_CAP,
  VERVOLGSTAPPEN_PER_THEME_CAP,
  type SummarizerIdentifiedTheme,
} from "../../src/agents/summarizer";
import type { SummarizerOutput, ThemeSummary } from "../../src/validations/summarizer";

const mockGenerateObject = generateObject as unknown as ReturnType<typeof vi.fn>;

const THEME_A: SummarizerIdentifiedTheme = {
  themeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Coaching dynamiek",
  description: "Hoe Stef juniors begeleidt.",
};
const THEME_B: SummarizerIdentifiedTheme = {
  themeId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  name: "AI-Native Architecture",
  description: "Patronen voor AI-native systemen.",
};

function baseSummarizerOutput(overrides: Partial<SummarizerOutput> = {}): SummarizerOutput {
  return {
    briefing: "Stef en Ege bespraken diagnostisch denken.",
    kernpunten: ["### [Algemeen] Coaching", "**Signaal:** Stef stuurt op diagnose-first."],
    deelnemers: [{ name: "Stef", role: "Coach", organization: "JouwAiPartner", stance: null }],
    vervolgstappen: ["Ege experimenteert met voorbeeldgesprekken."],
    theme_summaries: [],
    ...overrides,
  };
}

function themeSummary(themeId: string, overrides: Partial<ThemeSummary> = {}): ThemeSummary {
  return {
    themeId,
    briefing: "Korte narrative over dit thema in deze meeting.",
    kernpunten: ["**Signaal:** bullet."],
    vervolgstappen: ["Een follow-up."],
    ...overrides,
  };
}

function mockOutput(output: SummarizerOutput) {
  mockGenerateObject.mockResolvedValue({
    object: output,
    usage: { inputTokens: 100, outputTokens: 50 },
  });
}

const baseContext = {
  title: "1:1 Stef/Ege",
  meeting_type: "one_on_one",
  party_type: "internal",
  participants: ["Stef", "Ege"],
  meetingId: "11111111-1111-4111-8111-111111111111",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runSummarizer — prompt version + context", () => {
  it("exporteert v2 als prompt-version (AI-244)", () => {
    expect(SUMMARIZER_PROMPT_VERSION).toBe("v2");
  });

  it("stuurt themeId in de user-content wanneer identified_themes niet leeg is", async () => {
    mockOutput(baseSummarizerOutput());

    await runSummarizer("transcript text", {
      ...baseContext,
      identified_themes: [THEME_A, THEME_B],
    });

    const call = mockGenerateObject.mock.calls[0][0];
    const userContent = call.messages.find((m: { role: string }) => m.role === "user").content;
    expect(userContent).toContain(THEME_A.themeId);
    expect(userContent).toContain(THEME_A.name);
    expect(userContent).toContain(THEME_B.themeId);
  });
});

describe("runSummarizer — hallucination-strip (EDGE-240)", () => {
  it("strip theme_summaries met onbekende themeId + behoudt valide entry", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    mockOutput(
      baseSummarizerOutput({
        theme_summaries: [
          themeSummary(THEME_A.themeId),
          themeSummary("ffffffff-ffff-4fff-8fff-ffffffffffff"), // onbekend
        ],
      }),
    );

    const result = await runSummarizer("transcript", {
      ...baseContext,
      identified_themes: [THEME_A],
    });

    expect(result.theme_summaries).toHaveLength(1);
    expect(result.theme_summaries[0].themeId).toBe(THEME_A.themeId);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("onbekende themeId"));

    warnSpy.mockRestore();
  });
});

describe("runSummarizer — caps (AI-243 / EDGE-242)", () => {
  it("capt theme_summaries op THEME_SUMMARIES_HARD_CAP", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const manyThemes: SummarizerIdentifiedTheme[] = Array.from({ length: 8 }).map((_, i) => ({
      themeId: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${i}`,
      name: `Theme ${i}`,
      description: "desc",
    }));

    mockOutput(
      baseSummarizerOutput({
        theme_summaries: manyThemes.map((t) => themeSummary(t.themeId)),
      }),
    );

    const result = await runSummarizer("transcript", {
      ...baseContext,
      identified_themes: manyThemes,
    });

    expect(result.theme_summaries).toHaveLength(THEME_SUMMARIES_HARD_CAP);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("gecapt"));

    warnSpy.mockRestore();
  });

  it("truncates kernpunten per theme naar KERNPUNTEN_PER_THEME_CAP", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const tooManyKp = Array.from({ length: 15 }).map((_, i) => `**Signaal:** bullet ${i}`);
    mockOutput(
      baseSummarizerOutput({
        theme_summaries: [themeSummary(THEME_A.themeId, { kernpunten: tooManyKp })],
      }),
    );

    const result = await runSummarizer("transcript", {
      ...baseContext,
      identified_themes: [THEME_A],
    });

    expect(result.theme_summaries[0].kernpunten).toHaveLength(KERNPUNTEN_PER_THEME_CAP);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("kernpunten getruncated"));

    warnSpy.mockRestore();
  });

  it("truncates vervolgstappen per theme naar VERVOLGSTAPPEN_PER_THEME_CAP", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const tooManyVs = Array.from({ length: 10 }).map((_, i) => `Actie ${i}`);
    mockOutput(
      baseSummarizerOutput({
        theme_summaries: [themeSummary(THEME_A.themeId, { vervolgstappen: tooManyVs })],
      }),
    );

    const result = await runSummarizer("transcript", {
      ...baseContext,
      identified_themes: [THEME_A],
    });

    expect(result.theme_summaries[0].vervolgstappen).toHaveLength(VERVOLGSTAPPEN_PER_THEME_CAP);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("vervolgstappen getruncated"));

    warnSpy.mockRestore();
  });
});

describe("runSummarizer — missing-telemetry (EDGE-241)", () => {
  it("logt warn wanneer Summarizer minder theme_summaries levert dan identified_themes", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    mockOutput(baseSummarizerOutput({ theme_summaries: [] }));

    await runSummarizer("transcript", {
      ...baseContext,
      identified_themes: [THEME_A, THEME_B],
    });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("theme_summaries_missing"));

    warnSpy.mockRestore();
  });

  it("logt geen warn wanneer Summarizer het volledige setje levert", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    mockOutput(
      baseSummarizerOutput({
        theme_summaries: [themeSummary(THEME_A.themeId), themeSummary(THEME_B.themeId)],
      }),
    );

    await runSummarizer("transcript", {
      ...baseContext,
      identified_themes: [THEME_A, THEME_B],
    });

    const warnMessages = warnSpy.mock.calls.map((c) => String(c[0]));
    expect(warnMessages.some((m) => m.includes("theme_summaries_missing"))).toBe(false);

    warnSpy.mockRestore();
  });
});

describe("formatThemeSummary — markdown renderer (AI-242)", () => {
  it("rendert briefing + kernpunten + vervolgstappen wanneer alle secties gevuld zijn", () => {
    const md = formatThemeSummary({
      themeId: THEME_A.themeId,
      briefing: "Dit is de briefing.",
      kernpunten: ["Kernpunt één.", "Kernpunt twee."],
      vervolgstappen: ["Stap één."],
    });

    expect(md).toContain("## Briefing");
    expect(md).toContain("Dit is de briefing.");
    expect(md).toContain("## Kernpunten");
    expect(md).toContain("- Kernpunt één.");
    expect(md).toContain("## Vervolgstappen");
    expect(md).toContain("- [ ] Stap één.");
  });

  it("laat Kernpunten-sectie weg bij lege array (geen placeholder)", () => {
    const md = formatThemeSummary({
      themeId: THEME_A.themeId,
      briefing: "Briefing.",
      kernpunten: [],
      vervolgstappen: ["Actie."],
    });

    expect(md).toContain("## Briefing");
    expect(md).not.toContain("## Kernpunten");
    expect(md).toContain("## Vervolgstappen");
  });

  it("laat Vervolgstappen-sectie weg bij lege array (geen placeholder)", () => {
    const md = formatThemeSummary({
      themeId: THEME_A.themeId,
      briefing: "Briefing.",
      kernpunten: ["Punt."],
      vervolgstappen: [],
    });

    expect(md).toContain("## Kernpunten");
    expect(md).not.toContain("## Vervolgstappen");
  });

  it("rendert alleen Briefing als kernpunten+vervolgstappen beide leeg zijn", () => {
    const md = formatThemeSummary({
      themeId: THEME_A.themeId,
      briefing: "Korte briefing, thema had weinig raakpunten.",
      kernpunten: [],
      vervolgstappen: [],
    });

    expect(md).toContain("## Briefing");
    expect(md).not.toContain("## Kernpunten");
    expect(md).not.toContain("## Vervolgstappen");
  });
});
