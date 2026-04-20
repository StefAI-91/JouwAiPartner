import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockAuthenticated, createServerMock } from "../helpers/mock-auth";
import { TEST_IDS } from "../../../../packages/database/__tests__/helpers/seed";

vi.mock("@repo/database/supabase/server", () => createServerMock());
vi.mock("@repo/auth/access", () => ({
  isAdmin: vi.fn().mockResolvedValue(true),
  requireAdminInAction: vi.fn(),
}));

// Grens-mocks: de action leest via query-functies uit @repo/database/queries/*,
// dus we vervangen alleen die boundary. Geen chainable DB-mocks meer
// (PW-QC-04 QUAL-QC-030 / RULE-QC-031).
const mockGetMeeting = vi.fn();
const mockGetExtractions = vi.fn();
vi.mock("@repo/database/queries/meetings", () => ({
  getMeetingForDevExtractor: (...args: unknown[]) => mockGetMeeting(...args),
}));
vi.mock("@repo/database/queries/extractions", () => ({
  getExtractionsForMeetingByType: (...args: unknown[]) => mockGetExtractions(...args),
}));

const mockRunStructurer = vi.fn();
vi.mock("@repo/ai/agents/meeting-structurer", () => ({
  runMeetingStructurer: (...args: unknown[]) => mockRunStructurer(...args),
  MEETING_STRUCTURER_SYSTEM_PROMPT: "test prompt",
}));

// Write-path mutations worden gemockt om te asserteren dat ze NOOIT
// worden aangeroepen (dev-harness is strikt read-only).
const mockInsertExtractions = vi.fn();
const mockUpdateMeetingSummary = vi.fn();
vi.mock("@repo/database/mutations/extractions", () => ({
  insertExtractions: (...args: unknown[]) => mockInsertExtractions(...args),
}));
vi.mock("@repo/database/mutations/meetings", () => ({
  updateMeetingSummary: (...args: unknown[]) => mockUpdateMeetingSummary(...args),
  updateMeetingRawFireflies: vi.fn(),
  linkAllMeetingProjects: vi.fn(),
}));

import {
  runDevExtractorAction,
  getMeetingStructurerPromptAction,
} from "../../src/actions/dev-extractor";
import { requireAdminInAction } from "@repo/auth/access";

const VALID_MEETING_ID = "00000000-0000-4000-8000-000000000001";

const baseMeeting = {
  id: VALID_MEETING_ID,
  title: "CAI sync",
  date: "2026-04-18",
  meeting_type: "status_update",
  party_type: "client",
  transcript: "Dit is het transcript. We moeten Joris nog mailen.",
  transcript_elevenlabs: null as string | null,
  participants: ["Stef", "Wouter"],
};

const baseExtractionRows = [
  {
    id: "ex-1",
    content: "Legacy risk item",
    confidence: 0.8,
    metadata: { severity: "medium" },
    created_at: "2026-04-18T10:00:00Z",
  },
];

beforeEach(() => {
  mockAuthenticated(TEST_IDS.userId);
  mockRunStructurer.mockReset();
  mockInsertExtractions.mockReset();
  mockUpdateMeetingSummary.mockReset();
  mockGetMeeting.mockReset();
  mockGetExtractions.mockReset();

  mockGetMeeting.mockResolvedValue(baseMeeting);
  mockGetExtractions.mockResolvedValue(baseExtractionRows);

  (requireAdminInAction as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id: TEST_IDS.userId, email: "admin@example.com" },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runDevExtractorAction", () => {
  it("blocks non-admin callers", async () => {
    (requireAdminInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ error: "Geen toegang" });

    const result = await runDevExtractorAction({ meetingId: VALID_MEETING_ID, type: "risk" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe("Geen toegang");
    expect(mockRunStructurer).not.toHaveBeenCalled();
    expect(mockGetMeeting).not.toHaveBeenCalled();
  });

  // QUAL-QC-001: auth blokkeert vóór Zod-parse (defense-in-depth).
  it("blocks non-admin callers EVEN with invalid input (auth gate runs first)", async () => {
    (requireAdminInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ error: "Geen toegang" });

    const result = await runDevExtractorAction({
      meetingId: "not-a-uuid",
      // @ts-expect-error — bewust ongeldig type
      type: "garbage",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe("Geen toegang");
  });

  it("rejects invalid UUID meetingId", async () => {
    const result = await runDevExtractorAction({
      meetingId: "not-a-uuid",
      type: "risk",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe("Ongeldige invoer");
    expect(mockGetMeeting).not.toHaveBeenCalled();
  });

  it("rejects unknown extraction type", async () => {
    const result = await runDevExtractorAction({
      meetingId: VALID_MEETING_ID,
      // @ts-expect-error — testing runtime rejection
      type: "totally_made_up",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe("Ongeldige invoer");
  });

  it("returns 'Meeting niet gevonden' when the meeting lookup returns null", async () => {
    mockGetMeeting.mockResolvedValue(null);
    const result = await runDevExtractorAction({ meetingId: VALID_MEETING_ID, type: "risk" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe("Meeting niet gevonden");
  });

  it("returns 'Geen transcript beschikbaar' when both transcripts are null", async () => {
    mockGetMeeting.mockResolvedValue({
      ...baseMeeting,
      transcript: null,
      transcript_elevenlabs: null,
    });
    const result = await runDevExtractorAction({ meetingId: VALID_MEETING_ID, type: "risk" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe("Geen transcript beschikbaar voor deze meeting");
  });

  // QUAL-QC-002: success-path retourneert { success: true, data: … }.
  it("filters fresh output to the requested type and returns it alongside DB rows", async () => {
    mockRunStructurer.mockResolvedValue({
      briefing: "Korte briefing.",
      kernpunten: [
        {
          type: "risk",
          content: "Credentials zijn 4 dagen oud.",
          theme: "Deploy",
          theme_project: "CAI",
          source_quote: "4 dagen geleden",
          project: "CAI",
          confidence: 0.9,
          metadata: { severity: "high" },
        },
        {
          type: "decision",
          content: "Dit item moet niet verschijnen (andere type).",
          theme: "Auth",
          theme_project: "CAI",
          source_quote: null,
          project: "CAI",
          confidence: 0.9,
          metadata: { status: "open" },
        },
      ],
      deelnemers: [],
      entities: { clients: ["CAI"], people: [] },
    });

    const result = await runDevExtractorAction({ meetingId: VALID_MEETING_ID, type: "risk" });
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.freshOutput).toHaveLength(1);
    expect(result.data.freshOutput[0].type).toBe("risk");
    expect(result.data.freshOutput[0].content).toBe("Credentials zijn 4 dagen oud.");
    expect(result.data.freshBriefing).toBe("Korte briefing.");
    expect(result.data.currentInDb).toHaveLength(1);
    expect(result.data.currentInDb[0].id).toBe("ex-1");
    expect(result.data.transcript).toContain("Joris");
  });

  it("contract: never writes to the database (ephemeral tuning tool)", async () => {
    mockRunStructurer.mockResolvedValue({
      briefing: "x",
      kernpunten: [],
      deelnemers: [],
      entities: { clients: [], people: [] },
    });

    await runDevExtractorAction({ meetingId: VALID_MEETING_ID, type: "risk" });

    expect(mockInsertExtractions).not.toHaveBeenCalled();
    expect(mockUpdateMeetingSummary).not.toHaveBeenCalled();
  });

  it("surfaces structurer failure as an error string instead of throwing", async () => {
    mockRunStructurer.mockRejectedValue(new Error("Rate limited"));

    const result = await runDevExtractorAction({ meetingId: VALID_MEETING_ID, type: "risk" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("Rate limited");
  });
});

describe("getMeetingStructurerPromptAction", () => {
  it("returns the prompt for admins", async () => {
    const result = await getMeetingStructurerPromptAction();
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.prompt).toBe("test prompt");
  });

  it("denies non-admins", async () => {
    (requireAdminInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ error: "Geen toegang" });
    const result = await getMeetingStructurerPromptAction();
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe("Geen toegang");
  });
});
