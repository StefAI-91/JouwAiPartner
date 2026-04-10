import { describe, it, expect, vi, beforeEach } from "vitest";

// Responses that the mock DB will return, keyed by a pattern
let queryResponses: Map<string, unknown>;

// Track calls to identify which query is being made
function createMockDb() {
  const from = vi.fn((table: string) => {
    const select = vi.fn((_cols: string, opts?: { count?: string; head?: boolean }) => {
      const isCountQuery = opts?.count === "exact" && opts?.head === true;

      const eq = vi.fn((col1: string, val1: unknown): unknown => {
        // Build a key to look up the response
        const baseKey = `${table}.${col1}=${val1}`;

        // Return another chainable eq
        const innerEq = vi.fn((col2: string, val2: unknown) => {
          const fullKey = `${baseKey}.${col2}=${val2}`;
          if (isCountQuery) {
            return queryResponses.get(fullKey) ?? { count: 0 };
          }
          return queryResponses.get(fullKey) ?? { data: null, error: null };
        });

        // Also support .single(), .order(), .not(), .in()
        const result: Record<string, unknown> = {
          eq: innerEq,
          single: vi.fn(
            () => queryResponses.get(baseKey + ".single") ?? { data: null, error: null },
          ),
          not: vi.fn(() => queryResponses.get(baseKey + ".not") ?? { data: null, error: null }),
          in: vi.fn(
            (_c: string, _v: unknown[]) =>
              queryResponses.get(baseKey + ".in") ?? { data: null, error: null },
          ),
          order: vi.fn(() => queryResponses.get(baseKey + ".order") ?? { data: null, error: null }),
        };

        // For terminal count queries
        if (isCountQuery) {
          return result;
        }

        return result;
      });

      return {
        eq,
        not: vi.fn((_c: string, _op: string, _v: unknown) => {
          return queryResponses.get(`${table}.select.not`) ?? { data: null, error: null };
        }),
        in: vi.fn((_c: string, _v: unknown[]) => ({
          data: (queryResponses.get(`${table}.in`) as { data: unknown } | undefined)?.data ?? null,
          error: null,
        })),
      };
    });

    return { select };
  });

  return { from };
}

let mockDb: ReturnType<typeof createMockDb>;

vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(() => mockDb),
}));
vi.mock("@repo/database/mutations/extractions", () => ({
  insertExtractions: vi.fn(),
}));
vi.mock("../../src/agents/needs-scanner", () => ({
  runNeedsScanner: vi.fn(),
}));

import { scanMeetingNeeds } from "../../src/pipeline/scan-needs";
import { insertExtractions } from "@repo/database/mutations/extractions";
import { runNeedsScanner } from "../../src/agents/needs-scanner";

const mockInsertExtractions = insertExtractions as ReturnType<typeof vi.fn>;
const mockNeedsScanner = runNeedsScanner as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  queryResponses = new Map();
  mockDb = createMockDb();
});

// Helper: set up the "already scanned" check
// meetingAlreadyScanned: from("extractions").select("id", {count,head}).eq("meeting_id", id).eq("type", "need")
function setAlreadyScanned(meetingId: string, count: number) {
  queryResponses.set(`extractions.meeting_id=${meetingId}.type=need`, { count });
}

// Helper: set up the meeting fetch
// getMeetingForNeedsScan: from("meetings").select(...).eq("id", meetingId).single()
function setMeeting(meetingId: string, data: Record<string, unknown> | null) {
  queryResponses.set(`meetings.id=${meetingId}.single`, {
    data,
    error: data ? null : { message: "not found" },
  });
}

describe("scanMeetingNeeds", () => {
  it("skipt met skipped_reason: 'already_scanned' als meeting al need-extracties heeft", async () => {
    setAlreadyScanned("meeting-1", 3);

    const result = await scanMeetingNeeds("meeting-1");

    expect(result.scanned).toBe(false);
    expect(result.skipped_reason).toBe("already_scanned");
  });

  it("skipt met skipped_reason: 'meeting_not_found' als meeting niet bestaat", async () => {
    setAlreadyScanned("meeting-1", 0);
    setMeeting("meeting-1", null);

    const result = await scanMeetingNeeds("meeting-1");

    expect(result.scanned).toBe(false);
    expect(result.skipped_reason).toBe("meeting_not_found");
  });

  it("skipt met skipped_reason: 'not_internal_team_sync' als meeting niet intern team_sync is", async () => {
    setAlreadyScanned("meeting-1", 0);
    setMeeting("meeting-1", {
      id: "meeting-1",
      title: "Sales call",
      date: "2026-04-10",
      meeting_type: "sales",
      party_type: "client",
      summary: "Sales gesprek gehad",
      participants: ["Alice"],
      meeting_participants: [],
    });

    const result = await scanMeetingNeeds("meeting-1");

    expect(result.scanned).toBe(false);
    expect(result.skipped_reason).toBe("not_internal_team_sync");
  });

  it("skipt met skipped_reason: 'no_summary' als meeting geen summary heeft", async () => {
    setAlreadyScanned("meeting-1", 0);
    setMeeting("meeting-1", {
      id: "meeting-1",
      title: "Team sync",
      date: "2026-04-10",
      meeting_type: "team_sync",
      party_type: "internal",
      summary: null,
      participants: ["Alice"],
      meeting_participants: [],
    });

    const result = await scanMeetingNeeds("meeting-1");

    expect(result.scanned).toBe(false);
    expect(result.skipped_reason).toBe("no_summary");
  });

  it("voert scan uit en insert needs als extractions bij geldige meeting", async () => {
    setAlreadyScanned("meeting-1", 0);
    setMeeting("meeting-1", {
      id: "meeting-1",
      title: "Team sync",
      date: "2026-04-10",
      meeting_type: "team_sync",
      party_type: "internal",
      summary: "We hebben CI/CD tooling nodig",
      participants: ["Stef", "Wouter"],
      meeting_participants: [],
    });

    mockNeedsScanner.mockResolvedValue({
      needs: [
        {
          content: "CI/CD tooling nodig",
          category: "tooling",
          priority: "hoog",
          context: "Team mist geautomatiseerde deployment",
          source_quote: "We hebben tooling nodig",
        },
      ],
      scan_notes: null,
    });
    mockInsertExtractions.mockResolvedValue({ success: true, count: 1 });

    const result = await scanMeetingNeeds("meeting-1");

    expect(result.scanned).toBe(true);
    expect(result.needs_found).toBe(1);
    expect(mockNeedsScanner).toHaveBeenCalled();
    expect(mockInsertExtractions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          meeting_id: "meeting-1",
          type: "need",
          content: "CI/CD tooling nodig",
          confidence: 1.0,
          verification_status: "verified",
        }),
      ]),
    );
  });

  it("retourneert { scanned: true, needs_found: N } bij succes", async () => {
    setAlreadyScanned("meeting-1", 0);
    setMeeting("meeting-1", {
      id: "meeting-1",
      title: "Team sync",
      date: "2026-04-10",
      meeting_type: "team_sync",
      party_type: "internal",
      summary: "Diverse behoeften besproken",
      participants: ["Stef"],
      meeting_participants: [],
    });

    mockNeedsScanner.mockResolvedValue({
      needs: [
        {
          content: "Need 1",
          category: "tooling",
          priority: "hoog",
          context: "ctx",
          source_quote: null,
        },
        {
          content: "Need 2",
          category: "kennis",
          priority: "midden",
          context: "ctx",
          source_quote: null,
        },
      ],
      scan_notes: null,
    });
    mockInsertExtractions.mockResolvedValue({ success: true, count: 2 });

    const result = await scanMeetingNeeds("meeting-1");

    expect(result.scanned).toBe(true);
    expect(result.needs_found).toBe(2);
  });
});
