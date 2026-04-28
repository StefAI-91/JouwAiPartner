import { describe, it, expect, vi, beforeEach } from "vitest";

// Responses keyed by query pattern — recursive chainable mock
let queryResponses: Map<string, { data: unknown; error: unknown; count?: number }>;

function createMockDb() {
  function makeResult(key: string): Record<string, unknown> {
    const resp = queryResponses.get(key) ?? { data: null, error: null };
    return {
      ...resp,
      single: vi.fn(() => resp),
      eq: vi.fn((col: string, val: unknown) => makeResult(`${key}.${col}=${val}`)),
      not: vi.fn((_c: string, _op: string, _v: unknown) => makeResult(`${key}.not`)),
      in: vi.fn((_col: string, _vals: unknown[]) => makeResult(`${key}.in`)),
      order: vi.fn(() => resp),
    };
  }

  const from = vi.fn((table: string) => ({
    select: vi.fn((_cols: string, opts?: { count?: string; head?: boolean }) => {
      const isCountQuery = opts?.count === "exact" && opts?.head === true;
      const base = isCountQuery ? `${table}.count` : table;
      return {
        eq: vi.fn((col: string, val: unknown) => makeResult(`${base}.${col}=${val}`)),
        in: vi.fn((_col: string, _vals: unknown[]) => makeResult(`${base}.in`)),
        not: vi.fn((_c: string, _op: string, _v: unknown) => makeResult(`${base}.not`)),
      };
    }),
    insert: vi.fn(() => queryResponses.get(`insert`) ?? { error: null }),
  }));

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

import { scanMeetingNeeds, scanAllUnscannedMeetings } from "../../src/scan-needs";
import { insertExtractions } from "@repo/database/mutations/extractions";
import { runNeedsScanner } from "../../src/agents/needs-scanner";

const mockInsertExtractions = insertExtractions as ReturnType<typeof vi.fn>;
const mockNeedsScanner = runNeedsScanner as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  queryResponses = new Map();
  mockDb = createMockDb();
});

// ── Helpers for scanMeetingNeeds ──

// meetingAlreadyScanned: from("extractions").select("id", {count,head}).eq("meeting_id", id).eq("type", "need")
function setAlreadyScanned(meetingId: string, count: number) {
  queryResponses.set(`extractions.count.meeting_id=${meetingId}.type=need`, {
    data: null,
    error: null,
    count,
  });
}

// getMeetingForNeedsScan: from("meetings").select(...).eq("id", meetingId).single()
function setMeeting(meetingId: string, data: Record<string, unknown> | null) {
  queryResponses.set(`meetings.id=${meetingId}`, {
    data,
    error: data ? null : { message: "not found" },
  });
}

// ── Helpers for scanAllUnscannedMeetings ──

function makeMeeting(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: "Team sync",
    date: "2026-04-10",
    meeting_type: "team_sync",
    party_type: "internal",
    summary: "We hebben tooling nodig",
    participants: ["Stef"],
    meeting_participants: [],
    ...overrides,
  };
}

// Chain: from("meetings").select(...).eq("verification_status","verified").eq("meeting_type","team_sync").eq("party_type","internal").not(...)
function setAllMeetings(meetings: Record<string, unknown>[] | null, error: unknown = null) {
  queryResponses.set(
    "meetings.verification_status=verified.meeting_type=team_sync.party_type=internal.not",
    { data: meetings, error },
  );
}

// Chain: from("extractions").select("meeting_id").eq("type","need").in("meeting_id", ids)
function setScannedMeetingIds(scannedRows: { meeting_id: string }[]) {
  queryResponses.set("extractions.type=need.in", {
    data: scannedRows,
    error: null,
  });
}

// ── Tests: scanMeetingNeeds ──

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
    setMeeting("meeting-1", makeMeeting("meeting-1"));

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
    setMeeting("meeting-1", makeMeeting("meeting-1"));

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

// ── Tests: scanAllUnscannedMeetings ──

describe("scanAllUnscannedMeetings", () => {
  it("verwerkt meerdere meetings in batch", async () => {
    setAllMeetings([makeMeeting("m-1"), makeMeeting("m-2", { summary: "Capaciteit discussie" })]);
    setScannedMeetingIds([]); // none already scanned

    mockNeedsScanner
      .mockResolvedValueOnce({
        needs: [
          {
            content: "Need A",
            category: "tooling",
            priority: "hoog",
            context: "ctx",
            source_quote: null,
          },
        ],
        scan_notes: null,
      })
      .mockResolvedValueOnce({
        needs: [
          {
            content: "Need B",
            category: "capaciteit",
            priority: "midden",
            context: "ctx",
            source_quote: null,
          },
          {
            content: "Need C",
            category: "proces",
            priority: "laag",
            context: "ctx",
            source_quote: null,
          },
        ],
        scan_notes: null,
      });
    mockInsertExtractions.mockResolvedValue({ success: true, count: 1 });

    const result = await scanAllUnscannedMeetings();

    expect(result.total_scanned).toBe(2);
    expect(result.total_needs).toBe(3);
    expect(result.errors).toHaveLength(0);
    expect(mockNeedsScanner).toHaveBeenCalledTimes(2);
  });

  it("accumuleert errors per meeting zonder te stoppen", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    setAllMeetings([makeMeeting("m-1"), makeMeeting("m-2"), makeMeeting("m-3")]);
    setScannedMeetingIds([]);

    mockNeedsScanner
      .mockResolvedValueOnce({
        needs: [
          {
            content: "Need A",
            category: "tooling",
            priority: "hoog",
            context: "ctx",
            source_quote: null,
          },
        ],
        scan_notes: null,
      })
      .mockRejectedValueOnce(new Error("AI timeout")) // m-2 fails
      .mockResolvedValueOnce({
        needs: [
          {
            content: "Need C",
            category: "kennis",
            priority: "midden",
            context: "ctx",
            source_quote: null,
          },
        ],
        scan_notes: null,
      });
    mockInsertExtractions.mockResolvedValue({ success: true, count: 1 });

    const result = await scanAllUnscannedMeetings();

    // m-1 and m-3 succeed, m-2 fails
    expect(result.total_scanned).toBe(2);
    expect(result.total_needs).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("m-2");
    expect(result.errors[0]).toContain("AI timeout");

    consoleSpy.mockRestore();
  });

  it("retourneert totalen: { total_scanned, total_needs, errors[] }", async () => {
    setAllMeetings([makeMeeting("m-1")]);
    setScannedMeetingIds([{ meeting_id: "m-1" }]); // already scanned

    const result = await scanAllUnscannedMeetings();

    // All meetings were already scanned → nothing to do
    expect(result.total_scanned).toBe(0);
    expect(result.total_needs).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(mockNeedsScanner).not.toHaveBeenCalled();
  });

  it("retourneert error bij query failure", async () => {
    setAllMeetings(null, { message: "DB connection lost" });

    const result = await scanAllUnscannedMeetings();

    expect(result.total_scanned).toBe(0);
    expect(result.total_needs).toBe(0);
    expect(result.errors).toContain("DB connection lost");
  });
});
