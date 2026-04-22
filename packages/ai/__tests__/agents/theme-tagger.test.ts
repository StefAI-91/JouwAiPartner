import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Boundary-mock op de ai-sdk grens. We controleren wat de agent aan
 * `generateObject` meegeeft (prompt-discipline payload-capture) én hoe hij
 * de response terug normaliseert. Geen echte Anthropic-call, geen DB.
 */
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));
vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => ({ modelId: "test" })),
}));
vi.mock("@repo/database/mutations/agent-runs", () => ({
  insertAgentRun: vi.fn(async () => ({ success: true as const, id: "run-1" })),
}));

import { generateObject } from "ai";
import { tagMeetingThemes } from "../../src/agents/theme-tagger";
import {
  ThemeTaggerOutputSchema,
  type ThemeTaggerOutput,
} from "../../src/validations/theme-tagger";
import { THEME_EMOJI_FALLBACK } from "../../src/agents/theme-emojis";

const mockGenerateObject = generateObject as unknown as ReturnType<typeof vi.fn>;

// Must be valid v4 UUIDs (zod v4 validates RFC format strictly).
const HIRING_THEME_ID = "11111111-1111-4111-8111-111111111111";
const WERKDRUK_THEME_ID = "22222222-2222-4222-8222-222222222222";

function meetingContext(
  overrides: Partial<Parameters<typeof tagMeetingThemes>[0]["meeting"]> = {},
) {
  return {
    meetingId: "meeting-1",
    title: "Founders sync — werkdruk en hiring",
    summary: "Stef en Wouter bespreken de workload en de noodzaak om twee devs aan te nemen.",
    extractions: [
      { type: "need", content: "Twee junior devs werven dit kwartaal" },
      { type: "insight", content: "Stef voelt zich kapot van de workload" },
    ],
    ...overrides,
  };
}

const THEMES = [
  {
    themeId: HIRING_THEME_ID,
    name: "Team capaciteit & hiring",
    description: "Hiring, rolverdeling, dedicated devs.",
    matching_guide: "Valt onder als het over vacatures of rolverdeling gaat.",
  },
  {
    themeId: WERKDRUK_THEME_ID,
    name: "Werkdruk & founder-capaciteit",
    description: "Persoonlijke werkdruk van Stef/Wouter.",
    matching_guide: "Valt onder als het over persoonlijke overbelasting gaat.",
  },
];

function mockResponse(output: ThemeTaggerOutput) {
  mockGenerateObject.mockResolvedValue({
    object: output,
    usage: { inputTokens: 100, outputTokens: 50 },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ThemeTagger — matches", () => {
  it("geeft een high-confidence match terug in de output", async () => {
    mockResponse({
      matches: [
        {
          themeId: HIRING_THEME_ID,
          confidence: "high",
          evidenceQuote: "Twee junior devs werven dit kwartaal",
        },
      ],
      proposals: [],
      meta: { themesConsidered: 2 },
    });

    const out = await tagMeetingThemes({
      meeting: meetingContext(),
      themes: THEMES,
      negativeExamples: [],
    });

    expect(out.matches).toHaveLength(1);
    expect(out.matches[0]).toMatchObject({
      themeId: HIRING_THEME_ID,
      confidence: "high",
      evidenceQuote: expect.stringContaining("Twee junior devs"),
    });
  });

  it("geeft een medium-confidence match terug in de output", async () => {
    mockResponse({
      matches: [
        {
          themeId: WERKDRUK_THEME_ID,
          confidence: "medium",
          evidenceQuote: "Stef voelt zich kapot van de workload",
        },
      ],
      proposals: [],
      meta: { themesConsidered: 2 },
    });

    const out = await tagMeetingThemes({
      meeting: meetingContext(),
      themes: THEMES,
      negativeExamples: [],
    });

    expect(out.matches[0].confidence).toBe("medium");
  });

  it("retourneert een lege matches-array als de LLM alle kandidaten als low zou filteren (AI-212)", async () => {
    // LLM past discipline-regel 3 toe: 'low' filter je zelf eruit. Resultaat:
    // matches[] is leeg. Agent geeft dat schoon door aan de caller.
    mockResponse({
      matches: [],
      proposals: [],
      meta: { themesConsidered: 2, skipped: "alle themes bleven onder medium" },
    });

    const out = await tagMeetingThemes({
      meeting: meetingContext(),
      themes: THEMES,
      negativeExamples: [],
    });

    expect(out.matches).toEqual([]);
    expect(out.meta.skipped).toBeDefined();
  });
});

describe("ThemeTagger — proposals", () => {
  it("bevat een proposal als geen bestaand thema past", async () => {
    mockResponse({
      matches: [],
      proposals: [
        {
          name: "Onboarding proces",
          description: "Inwerken van nieuwe team-leden.",
          emoji: "📋",
          evidenceQuote: "We hebben nog geen gestructureerd onboarding-traject",
          reasoning:
            "Dichtstbijzijnde was Team capaciteit & hiring, maar dat thema gaat over werving, niet over wat er ná het tekenen gebeurt.",
        },
      ],
      meta: { themesConsidered: 2 },
    });

    const out = await tagMeetingThemes({
      meeting: meetingContext(),
      themes: THEMES,
      negativeExamples: [],
    });

    expect(out.proposals).toHaveLength(1);
    expect(out.proposals[0].emoji).toBe("📋");
    expect(out.proposals[0].reasoning).toContain("Team capaciteit");
  });

  it("geeft geen proposal als het onderwerp slechts één extraction heeft (AI-213)", async () => {
    // Substantie-regel (PRD §5.6 criterium 2): ≥2 extractions nodig. Bij
    // één losse opmerking laat een disciplined LLM proposals leeg.
    const oneExtractionMeeting = meetingContext({
      extractions: [{ type: "insight", content: "Iemand noemde terloops vakantie-planning" }],
    });

    mockResponse({
      matches: [],
      proposals: [],
      meta: { themesConsidered: 2, skipped: "onderwerp te licht voor nieuw thema" },
    });

    const out = await tagMeetingThemes({
      meeting: oneExtractionMeeting,
      themes: THEMES,
      negativeExamples: [],
    });

    expect(out.proposals).toEqual([]);
  });
});

describe("ThemeTagger — prompt-discipline payload-capture", () => {
  it("stuurt alle vier discipline-regels letterlijk mee in de system prompt (AI-207)", async () => {
    mockResponse({ matches: [], proposals: [], meta: { themesConsidered: 2 } });

    await tagMeetingThemes({
      meeting: meetingContext(),
      themes: THEMES,
      negativeExamples: [],
    });

    const call = mockGenerateObject.mock.calls[0][0] as {
      messages: Array<{ role: string; content: string }>;
    };
    const systemMsg = call.messages.find((m) => m.role === "system")?.content ?? "";

    expect(systemMsg).toContain(
      "Match alleen als het thema een substantieel onderwerp van de meeting is",
    );
    expect(systemMsg).toContain("Gebruik de `matching_guide` als arbiter");
    expect(systemMsg).toContain("Retourneer alleen matches met confidence `medium` of `high`");
    expect(systemMsg).toContain("Max 4 matches per meeting");
  });

  it("stuurt alle vier proposal-criteria letterlijk mee in de system prompt (AI-206)", async () => {
    mockResponse({ matches: [], proposals: [], meta: { themesConsidered: 2 } });

    await tagMeetingThemes({
      meeting: meetingContext(),
      themes: THEMES,
      negativeExamples: [],
    });

    const call = mockGenerateObject.mock.calls[0][0] as {
      messages: Array<{ role: string; content: string }>;
    };
    const systemMsg = call.messages.find((m) => m.role === "system")?.content ?? "";

    // Criterium 1: Geen match
    expect(systemMsg).toMatch(/Geen match.*confidence `medium` of hoger/);
    // Criterium 2: Substantie
    expect(systemMsg).toMatch(/Substantie.*≥2 extractions/);
    // Criterium 3: Granulariteit
    expect(systemMsg).toContain("Granulariteit");
    expect(systemMsg).toContain("3× terugkomt");
    // Criterium 4: Expliciete afbakening
    expect(systemMsg).toContain("Expliciete afbakening");
  });

  it("bundelt per thema name + description + matching_guide + negative_examples in de user-prompt (AI-208)", async () => {
    mockResponse({ matches: [], proposals: [], meta: { themesConsidered: 2 } });

    await tagMeetingThemes({
      meeting: meetingContext(),
      themes: THEMES,
      negativeExamples: [
        {
          themeId: HIRING_THEME_ID,
          evidenceQuote: "Vorige keer ging dit over klant-hiring",
          reason: "ander_thema",
        },
      ],
    });

    const call = mockGenerateObject.mock.calls[0][0] as {
      messages: Array<{ role: string; content: string }>;
    };
    const userMsg = call.messages.find((m) => m.role === "user")?.content ?? "";

    expect(userMsg).toContain("Team capaciteit & hiring");
    expect(userMsg).toContain("Valt onder als het over vacatures");
    expect(userMsg).toContain("Werkdruk & founder-capaciteit");
    // negativeExample doorgegeven voor hiring-thema
    expect(userMsg).toContain("Vorige keer ging dit over klant-hiring");
    expect(userMsg).toContain("ander_thema");
  });
});

describe("ThemeTagger — Zod-validatie (AI-214)", () => {
  it("werpt als een proposal een emoji buiten de shortlist gebruikt", () => {
    const parse = () =>
      ThemeTaggerOutputSchema.parse({
        matches: [],
        proposals: [
          {
            name: "Test",
            description: "test",
            emoji: "😅", // niet in shortlist
            evidenceQuote: "quote",
            reasoning: "reason",
          },
        ],
        meta: { themesConsidered: 1 },
      });

    expect(parse).toThrow();
  });

  it("accepteert de fallback-emoji 🏷️", () => {
    const parsed = ThemeTaggerOutputSchema.parse({
      matches: [],
      proposals: [
        {
          name: "Test",
          description: "test",
          emoji: THEME_EMOJI_FALLBACK,
          evidenceQuote: "quote",
          reasoning: "reason",
        },
      ],
      meta: { themesConsidered: 1 },
    });

    expect(parsed.proposals[0].emoji).toBe(THEME_EMOJI_FALLBACK);
  });

  it("werpt als een match confidence='low' heeft", () => {
    const parse = () =>
      ThemeTaggerOutputSchema.parse({
        matches: [
          {
            themeId: HIRING_THEME_ID,
            confidence: "low",
            evidenceQuote: "quote",
          },
        ],
        proposals: [],
        meta: { themesConsidered: 1 },
      });

    expect(parse).toThrow();
  });

  it("Zod accepteert >4 matches (cap wordt post-validatie toegepast in de agent)", () => {
    // Cap zit niet meer in Zod omdat Anthropic's structured-output schema
    // geen `maxItems` accepteert. Het schema laat elke array-grootte toe.
    const match = {
      themeId: HIRING_THEME_ID,
      confidence: "medium" as const,
      evidenceQuote: "quote",
    };
    const parsed = ThemeTaggerOutputSchema.parse({
      matches: [match, match, match, match, match],
      proposals: [],
      meta: { themesConsidered: 2 },
    });
    expect(parsed.matches).toHaveLength(5);
  });
});

describe("ThemeTagger — post-validatie hard-cap (Anthropic schema compat)", () => {
  it("slice matches tot max 4 ook als de LLM er meer teruggeeft", async () => {
    const FIVE_IDS = [
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    ];
    const extraMatch = (i: number) => ({
      themeId: FIVE_IDS[i - 1],
      confidence: "medium" as const,
      evidenceQuote: `quote ${i}`,
    });
    mockResponse({
      matches: [extraMatch(1), extraMatch(2), extraMatch(3), extraMatch(4), extraMatch(5)],
      proposals: [],
      meta: { themesConsidered: 2 },
    });

    const out = await tagMeetingThemes({
      meeting: meetingContext(),
      themes: THEMES,
      negativeExamples: [],
    });

    expect(out.matches).toHaveLength(4);
  });

  it("slice proposals tot max 2", async () => {
    const makeProposal = (i: number) => ({
      name: `Thema ${i}`,
      description: "desc",
      emoji: "📋" as const,
      evidenceQuote: "quote",
      reasoning: "reasoning",
    });
    mockResponse({
      matches: [],
      proposals: [makeProposal(1), makeProposal(2), makeProposal(3)],
      meta: { themesConsidered: 2 },
    });

    const out = await tagMeetingThemes({
      meeting: meetingContext(),
      themes: THEMES,
      negativeExamples: [],
    });

    expect(out.proposals).toHaveLength(2);
  });
});
