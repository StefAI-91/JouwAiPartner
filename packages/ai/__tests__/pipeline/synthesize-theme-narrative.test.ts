import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * TH-014 (FUNC-300, FUNC-301) — Pipeline-step `runThemeNarrativeSynthesis`.
 *
 * We mocken de DB-grenzen (`listThemeMeetingSummaries`, `upsertThemeNarrative`,
 * `getAdminClient`) en de agent-call. Asserts gaan over:
 *   - Guardrail: <2 meetings → agent NIET gecalled + sentinel-payload naar upsert.
 *   - Happy path: ≥2 meetings → agent gecalled + upsert met output.
 *   - EDGE-250: agent-failure → oude rij blijft (geen upsert), success=false.
 */

const mockListMeetings =
  vi.fn<
    (
      themeId: string,
      client?: unknown,
    ) => Promise<
      Array<{
        meeting_id: string;
        date: string | null;
        title: string | null;
        confidence: "medium" | "high";
        evidence_quote: string;
        summary: string;
      }>
    >
  >();
const mockUpsert =
  vi.fn<
    (
      input: Record<string, unknown>,
      client?: unknown,
    ) => Promise<{ success: true } | { error: string }>
  >();
const mockRunThemeNarrator = vi.fn();

// Supabase client-mock: `from('themes').select(...).eq(...).maybeSingle()` moet
// het thema teruggeven. Simpele chainable stub volstaat voor deze ene query.
function makeClient(themeRow: Record<string, unknown> | null = FAKE_THEME) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: themeRow, error: null })),
        })),
      })),
    })),
  };
}

const FAKE_THEME = {
  id: "d0000000-0000-0000-0000-000000000005",
  name: "Founder-ritme & samenwerking",
  emoji: "🗣️",
  description: "Founder-sync",
  matching_guide: "1-op-1 Stef/Wouter",
};

vi.mock("@repo/database/queries/themes", () => ({
  listThemeMeetingSummaries: (...args: Parameters<typeof mockListMeetings>) =>
    mockListMeetings(...args),
  INSUFFICIENT_MEETINGS_SENTINEL: "__insufficient__",
}));
vi.mock("@repo/database/mutations/themes", () => ({
  upsertThemeNarrative: (...args: Parameters<typeof mockUpsert>) => mockUpsert(...args),
}));
vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: () => makeClient(),
}));
vi.mock("../../src/agents/theme-narrator", () => ({
  runThemeNarrator: (...args: unknown[]) => mockRunThemeNarrator(...args),
}));

import { runThemeNarrativeSynthesis } from "../../src/pipeline/steps/synthesize-theme-narrative";

beforeEach(() => {
  vi.clearAllMocks();
  mockUpsert.mockResolvedValue({ success: true });
});

describe("runThemeNarrativeSynthesis — guardrail", () => {
  it("schrijft sentinel bij 0 meetings en roept de agent NIET aan", async () => {
    mockListMeetings.mockResolvedValueOnce([]);

    const result = await runThemeNarrativeSynthesis(FAKE_THEME.id, makeClient());

    expect(result).toEqual({ success: true, skipped: "insufficient_meetings" });
    expect(mockRunThemeNarrator).not.toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalledOnce();
    const payload = mockUpsert.mock.calls[0]![0]!;
    expect(payload).toMatchObject({
      theme_id: FAKE_THEME.id,
      briefing: "__insufficient__",
      signal_strength: "onvoldoende",
      meetings_count_at_generation: 0,
    });
  });

  it("schrijft sentinel bij 1 meeting (onder drempel van 2)", async () => {
    mockListMeetings.mockResolvedValueOnce([
      {
        meeting_id: "m1",
        date: "2026-04-22",
        title: "Rolverdeling",
        confidence: "medium",
        evidence_quote: "q",
        summary: "## Briefing\n...",
      },
    ]);

    const result = await runThemeNarrativeSynthesis(FAKE_THEME.id, makeClient());

    expect(result.skipped).toBe("insufficient_meetings");
    expect(mockRunThemeNarrator).not.toHaveBeenCalled();
    const payload = mockUpsert.mock.calls[0]![0]!;
    expect(payload).toMatchObject({
      briefing: "__insufficient__",
      meetings_count_at_generation: 1,
      signal_strength: "onvoldoende",
    });
  });
});

describe("runThemeNarrativeSynthesis — happy path", () => {
  it("roept de agent aan en upsert de output bij ≥2 meetings", async () => {
    const meetings = [
      {
        meeting_id: "m1",
        date: "2026-04-23",
        title: "Cai",
        confidence: "medium" as const,
        evidence_quote: "q1",
        summary: "## Briefing\n1",
      },
      {
        meeting_id: "m2",
        date: "2026-04-22",
        title: "Rolverdeling",
        confidence: "high" as const,
        evidence_quote: "q2",
        summary: "## Briefing\n2",
      },
    ];
    mockListMeetings.mockResolvedValueOnce(meetings);
    mockRunThemeNarrator.mockResolvedValueOnce({
      briefing: "Kern-sentence.",
      patterns: "Pattern prose",
      alignment: null,
      friction: "Friction prose",
      open_points: null,
      blind_spots: "Blind prose",
      signal_strength: "sterk",
      signal_notes: "Good basis.",
    });

    const result = await runThemeNarrativeSynthesis(FAKE_THEME.id, makeClient());

    expect(result).toEqual({ success: true });
    expect(mockRunThemeNarrator).toHaveBeenCalledOnce();
    const agentCall = mockRunThemeNarrator.mock.calls[0]![0]! as {
      theme: unknown;
      meetings: unknown;
    };
    expect(agentCall.theme).toMatchObject({ themeId: FAKE_THEME.id, name: FAKE_THEME.name });
    expect(agentCall.meetings).toHaveLength(2);

    const upsertPayload = mockUpsert.mock.calls[0]![0]!;
    expect(upsertPayload).toMatchObject({
      theme_id: FAKE_THEME.id,
      briefing: "Kern-sentence.",
      patterns: "Pattern prose",
      alignment: null,
      friction: "Friction prose",
      blind_spots: "Blind prose",
      signal_strength: "sterk",
      meetings_count_at_generation: 2,
    });
  });
});

describe("runThemeNarrativeSynthesis — EDGE-250 agent failure", () => {
  it("returnt success=false zonder upsert bij een agent-crash", async () => {
    mockListMeetings.mockResolvedValueOnce([
      {
        meeting_id: "m1",
        date: "2026-04-23",
        title: "t",
        confidence: "medium",
        evidence_quote: "q",
        summary: "s",
      },
      {
        meeting_id: "m2",
        date: "2026-04-22",
        title: "t",
        confidence: "high",
        evidence_quote: "q",
        summary: "s",
      },
    ]);
    mockRunThemeNarrator.mockRejectedValueOnce(new Error("anthropic 500"));

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await runThemeNarrativeSynthesis(FAKE_THEME.id, makeClient());
    consoleWarnSpy.mockRestore();

    expect(result.success).toBe(false);
    expect(result.error).toContain("anthropic 500");
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

describe("runThemeNarrativeSynthesis — thema niet gevonden", () => {
  it("returnt error zonder crash als themes.eq().maybeSingle() null geeft", async () => {
    const result = await runThemeNarrativeSynthesis(
      "99999999-9999-9999-9999-999999999999",
      makeClient(null),
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("theme not found");
    expect(mockListMeetings).not.toHaveBeenCalled();
    expect(mockRunThemeNarrator).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
