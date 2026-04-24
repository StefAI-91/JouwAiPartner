import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * TH-011 (SEC-230, MB-4) — runDevDetectorAction tests. Mock-grens:
 * auth + Anthropic agent + queries. We asserteren op admin-guard (SEC-230),
 * Zod-validatie, error-paden, en de dry-run telemetry-tag (MB-2).
 */

const mockUser = { value: null as { id: string; email?: string } | null };
const mockIsAdmin = vi.fn<(userId: string) => Promise<boolean>>();
const mockGetMeeting = vi.fn<(id: string) => Promise<unknown>>();
const mockListThemes = vi.fn<(options?: unknown) => Promise<unknown[]>>();
const mockDevMeetingThemes = vi.fn<(id: string) => Promise<unknown[]>>();
const mockDevExtractionThemes = vi.fn<(id: string) => Promise<unknown[]>>();
const mockRunDetector = vi.fn<(input: Record<string, unknown>) => Promise<unknown>>();

vi.mock("@repo/auth/helpers", () => ({
  getAuthenticatedUser: vi.fn(async () => mockUser.value),
}));
vi.mock("@repo/auth/access", () => ({
  isAdmin: (...args: [string]) => mockIsAdmin(...args),
  requireAdminInAction: async () => {
    if (!mockUser.value?.id) return { error: "Niet ingelogd" };
    if (!(await mockIsAdmin(mockUser.value.id))) return { error: "Geen toegang" };
    return { user: { id: mockUser.value.id, email: mockUser.value.email ?? "" } };
  },
}));
vi.mock("@repo/database/queries/meetings", () => ({
  getVerifiedMeetingById: (...args: [string]) => mockGetMeeting(...args),
}));
vi.mock("@repo/database/queries/themes", () => ({
  listVerifiedThemes: (options?: unknown) => mockListThemes(options),
}));
vi.mock("@repo/database/queries/dev-detector", () => ({
  getMeetingThemesForDevDetector: (...args: [string]) => mockDevMeetingThemes(...args),
  getExtractionThemesForDevDetector: (...args: [string]) => mockDevExtractionThemes(...args),
}));
vi.mock("@repo/ai/agents/theme-detector", () => ({
  runThemeDetector: (input: Record<string, unknown>) => mockRunDetector(input),
  THEME_DETECTOR_SYSTEM_PROMPT: "SYSTEM-PROMPT",
  THEME_DETECTOR_PROMPT_VERSION: "v1",
  THEME_DETECTOR_MODEL: "claude-sonnet-4-6",
}));

import { runDevDetectorAction } from "@/actions/dev-detector";

const MEETING_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";
const THEME_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const DEFAULT_MEETING = {
  id: MEETING_ID,
  title: "Roadmap sync",
  meeting_type: "strategy",
  party_type: "internal",
  date: "2026-04-22T10:00:00Z",
  summary: "We bespraken MCP uitgebreid.",
  transcript: "transcript content",
  transcript_elevenlabs: null,
  meeting_participants: [
    { person: { id: "p1", name: "Stef" } },
    { person: { id: "p2", name: "Wouter" } },
  ],
};

const DEFAULT_THEME = {
  id: THEME_ID,
  slug: "mcp-capabilities",
  name: "MCP Capabilities",
  emoji: "🧭",
  description: "desc",
  matching_guide: "guide",
  status: "verified" as const,
  negative_examples: [
    {
      theme_id: THEME_ID,
      meeting_id: "x",
      evidence_quote: "losse opm",
      reason: "niet_substantieel",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUser.value = null;
  mockIsAdmin.mockResolvedValue(false);
  mockGetMeeting.mockResolvedValue(DEFAULT_MEETING);
  mockListThemes.mockResolvedValue([DEFAULT_THEME]);
  mockDevMeetingThemes.mockResolvedValue([]);
  mockDevExtractionThemes.mockResolvedValue([]);
  mockRunDetector.mockResolvedValue({
    identified_themes: [],
    proposed_themes: [],
  });
});

describe("runDevDetectorAction — SEC-230 admin guard", () => {
  it("weigert unauthenticated users", async () => {
    mockUser.value = null;
    const result = await runDevDetectorAction({ meetingId: MEETING_ID });
    expect(result).toEqual({ error: "Niet ingelogd" });
    expect(mockRunDetector).not.toHaveBeenCalled();
  });

  it("weigert non-admin users", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(false);
    const result = await runDevDetectorAction({ meetingId: MEETING_ID });
    expect(result).toEqual({ error: "Geen toegang" });
    expect(mockRunDetector).not.toHaveBeenCalled();
  });
});

describe("runDevDetectorAction — Zod validation", () => {
  it("weigert niet-UUID meetingId", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(true);
    const result = await runDevDetectorAction({ meetingId: "not-a-uuid" });
    expect(result).toHaveProperty("error");
    expect(mockRunDetector).not.toHaveBeenCalled();
  });
});

describe("runDevDetectorAction — not-found path", () => {
  it("returnt error wanneer meeting niet bestaat", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(true);
    mockGetMeeting.mockResolvedValue(null);
    const result = await runDevDetectorAction({ meetingId: MEETING_ID });
    expect(result).toEqual({ error: "Meeting niet gevonden of niet verified" });
    expect(mockRunDetector).not.toHaveBeenCalled();
  });
});

describe("runDevDetectorAction — happy path", () => {
  it("geeft detectorOutput + meeting context + themes-lookup terug", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(true);
    mockRunDetector.mockResolvedValue({
      identified_themes: [
        {
          themeId: THEME_ID,
          confidence: "high",
          relevance_quote: "quote",
          theme_summary: "samenvatting",
          substantialityEvidence: { extractionCount: 3, reason: "veel" },
        },
      ],
      proposed_themes: [],
    });

    const result = await runDevDetectorAction({ meetingId: MEETING_ID });

    expect(result).not.toHaveProperty("error");
    if ("error" in result) return; // narrow for TS

    expect(result.detectorOutput.identified_themes).toHaveLength(1);
    expect(result.meetingContext.title).toBe("Roadmap sync");
    expect(result.meetingContext.participants).toEqual(["Stef", "Wouter"]);
    expect(result.themesLookup).toHaveLength(1);
    expect(result.themesLookup[0]).toMatchObject({
      themeId: THEME_ID,
      name: "MCP Capabilities",
    });
    expect(result.systemPrompt).toBe("SYSTEM-PROMPT");
    expect(result.model).toBe("claude-sonnet-4-6");
    expect(result.promptVersion).toBe("v1");
  });

  it("geeft negativeExamples door aan de agent via negative_examples", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(true);
    await runDevDetectorAction({ meetingId: MEETING_ID });

    expect(mockRunDetector).toHaveBeenCalledOnce();
    const call = mockRunDetector.mock.calls[0][0] as {
      negativeExamples: unknown[];
      telemetryContext?: Record<string, unknown>;
    };
    expect(call.negativeExamples).toHaveLength(1);
    expect(call.negativeExamples[0]).toMatchObject({
      themeId: THEME_ID,
      reason: "niet_substantieel",
    });
  });

  it("tagt de agent-run met dry_run + harness-context (MB-2)", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(true);
    await runDevDetectorAction({ meetingId: MEETING_ID });

    const call = mockRunDetector.mock.calls[0][0] as {
      telemetryContext?: Record<string, unknown>;
    };
    expect(call.telemetryContext).toEqual({
      context: "dev-detector-harness",
      dry_run: true,
    });
  });

  it("geeft identified_projects leeg mee (regenerate-achtige beperking)", async () => {
    mockUser.value = { id: USER_ID };
    mockIsAdmin.mockResolvedValue(true);
    await runDevDetectorAction({ meetingId: MEETING_ID });

    const call = mockRunDetector.mock.calls[0][0] as {
      meeting: { identified_projects: unknown[] };
    };
    expect(call.meeting.identified_projects).toEqual([]);
  });
});
