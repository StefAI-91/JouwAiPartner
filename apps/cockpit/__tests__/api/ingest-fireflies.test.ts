import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/ai/fireflies", () => ({
  listFirefliesTranscripts: vi.fn(),
  fetchFirefliesTranscript: vi.fn(),
}));

vi.mock("@repo/ai/transcript-processor", () => ({
  chunkTranscript: vi.fn(() => [{ text: "chunk1" }]),
}));

vi.mock("@repo/database/queries/meetings", () => ({
  getExistingFirefliesIds: vi.fn(),
  getExistingMeetingsByTitleDates: vi.fn(),
}));

vi.mock("@repo/ai/validations/fireflies", () => ({
  isValidDuration: vi.fn(),
}));

vi.mock("@repo/ai/pipeline/gatekeeper", () => ({
  processMeeting: vi.fn(),
}));

vi.mock("@repo/ai/pipeline/embed/re-embed-worker", () => ({
  runReEmbedWorker: vi.fn(),
}));

import { listFirefliesTranscripts, fetchFirefliesTranscript } from "@repo/ai/fireflies";
import {
  getExistingFirefliesIds,
  getExistingMeetingsByTitleDates,
} from "@repo/database/queries/meetings";
import { isValidDuration } from "@repo/ai/validations/fireflies";
import { processMeeting } from "@repo/ai/pipeline/gatekeeper";
import { runReEmbedWorker } from "@repo/ai/pipeline/embed/re-embed-worker";
import { GET, POST } from "@/app/api/ingest/fireflies/route";
import { emptyFirefliesSummary, firefliesSentence } from "../helpers/fireflies-fixtures";

const CRON_SECRET = "test-cron-secret";

function makeAuthedRequest(method: string, body?: Record<string, unknown>): Request {
  return new Request("http://localhost/api/ingest/fireflies", {
    method,
    headers: {
      authorization: `Bearer ${CRON_SECRET}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("GET /api/ingest/fireflies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
  });

  it("returns 401 without valid auth", async () => {
    const req = new Request("http://localhost/api/ingest/fireflies", {
      method: "GET",
    });
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it("returns transcript list with summary counts", async () => {
    vi.mocked(listFirefliesTranscripts).mockResolvedValue([]);
    vi.mocked(getExistingFirefliesIds).mockResolvedValue(new Set());
    vi.mocked(getExistingMeetingsByTitleDates).mockResolvedValue(new Map());

    const req = makeAuthedRequest("GET");
    const res = await GET(req as never);
    const data = await res.json();

    expect(data.summary.total).toBe(0);
    expect(data.summary.imported).toBe(0);
  });
});

describe("POST /api/ingest/fireflies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
  });

  it("returns 401 without valid auth", async () => {
    const req = new Request("http://localhost/api/ingest/fireflies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("filters already-imported fireflies_ids", async () => {
    vi.mocked(listFirefliesTranscripts).mockResolvedValue([
      { id: "ff-1", title: "Meeting 1", date: "1711900800000" },
      { id: "ff-2", title: "Meeting 2", date: "1711900800000" },
    ] as never);
    vi.mocked(getExistingFirefliesIds).mockResolvedValue(new Set(["ff-1"]));
    vi.mocked(getExistingMeetingsByTitleDates).mockResolvedValue(new Map());
    vi.mocked(fetchFirefliesTranscript).mockResolvedValue({
      id: "ff-2",
      title: "Meeting 2",
      date: "1711900800000",
      participants: [],
      organizer_email: null,
      meeting_attendees: [],
      sentences: [],
      summary: emptyFirefliesSummary(),
      audio_url: null,
    });
    vi.mocked(isValidDuration).mockReturnValue({ valid: true, duration: 10 });
    vi.mocked(processMeeting).mockResolvedValue({
      meetingId: "new-1",
      gatekeeper: { meeting_type: "internal", relevance_score: 0.5 },
      partyType: "internal",
      extractions_saved: 0,
      embedded: true,
      elevenlabs_transcribed: false,
      summarized: false,
      errors: [],
    } as never);
    vi.mocked(runReEmbedWorker).mockResolvedValue({ total: 1, byTable: {} } as never);

    const req = makeAuthedRequest("POST", { limit: 20 });
    const res = await POST(req as never);
    const data = await res.json();

    expect(data.summary.skipped).toBe(1); // ff-1 was skipped
    expect(data.summary.imported).toBe(1); // ff-2 was imported
  });

  it("filters title+date duplicates", async () => {
    vi.mocked(listFirefliesTranscripts).mockResolvedValue([
      { id: "ff-3", title: "Duplicate Meeting", date: "1711900800000" },
    ] as never);
    vi.mocked(getExistingFirefliesIds).mockResolvedValue(new Set());
    vi.mocked(getExistingMeetingsByTitleDates).mockResolvedValue(
      new Map([["duplicate meeting|2024-03-31", "existing-id"]]),
    );

    const req = makeAuthedRequest("POST", { limit: 20 });
    const res = await POST(req as never);
    const data = await res.json();

    expect(data.summary.skipped).toBe(1);
    expect(data.results[0].reason).toContain("duplicate_meeting");
  });

  it("processes new meetings via processMeeting", async () => {
    vi.mocked(listFirefliesTranscripts).mockResolvedValue([
      { id: "ff-new", title: "New Meeting", date: "1711900800000" },
    ] as never);
    vi.mocked(getExistingFirefliesIds).mockResolvedValue(new Set());
    vi.mocked(getExistingMeetingsByTitleDates).mockResolvedValue(new Map());
    vi.mocked(fetchFirefliesTranscript).mockResolvedValue({
      id: "ff-new",
      title: "New Meeting",
      date: "1711900800000",
      participants: ["Stef"],
      organizer_email: "stef@jouwai.nl",
      meeting_attendees: [],
      sentences: [
        firefliesSentence({ text: "hello", start_time: 0, end_time: 600, speaker_name: "Stef" }),
      ],
      summary: { ...emptyFirefliesSummary(), notes: "Summary" },
      audio_url: null,
    });
    vi.mocked(isValidDuration).mockReturnValue({ valid: true, duration: 10 });
    vi.mocked(processMeeting).mockResolvedValue({
      meetingId: "created-1",
      gatekeeper: { meeting_type: "internal", relevance_score: 0.7 },
      partyType: "internal",
      extractions_saved: 2,
      embedded: true,
      elevenlabs_transcribed: false,
      summarized: true,
      errors: [],
    } as never);
    vi.mocked(runReEmbedWorker).mockResolvedValue({ total: 1, byTable: {} } as never);

    const req = makeAuthedRequest("POST", { limit: 20 });
    const res = await POST(req as never);
    const data = await res.json();

    expect(processMeeting).toHaveBeenCalledTimes(1);
    expect(data.summary.imported).toBe(1);
    expect(data.results[0].status).toBe("imported");
  });

  it("runs runReEmbedWorker after importing", async () => {
    vi.mocked(listFirefliesTranscripts).mockResolvedValue([
      { id: "ff-new", title: "New", date: "1711900800000" },
    ] as never);
    vi.mocked(getExistingFirefliesIds).mockResolvedValue(new Set());
    vi.mocked(getExistingMeetingsByTitleDates).mockResolvedValue(new Map());
    vi.mocked(fetchFirefliesTranscript).mockResolvedValue({
      id: "ff-new",
      title: "New",
      date: "1711900800000",
      participants: [],
      organizer_email: null,
      meeting_attendees: [],
      sentences: [],
      summary: emptyFirefliesSummary(),
      audio_url: null,
    });
    vi.mocked(isValidDuration).mockReturnValue({ valid: true, duration: 10 });
    vi.mocked(processMeeting).mockResolvedValue({
      meetingId: "m1",
      gatekeeper: { meeting_type: "internal", relevance_score: 0.5 },
      errors: [],
    } as never);
    vi.mocked(runReEmbedWorker).mockResolvedValue({
      total: 5,
      byTable: { meetings: 3, extractions: 2 },
    } as never);

    const req = makeAuthedRequest("POST", { limit: 20 });
    const res = await POST(req as never);
    const data = await res.json();

    expect(runReEmbedWorker).toHaveBeenCalledTimes(1);
    expect(data.embeddings.processed).toBe(5);
  });

  it("returns counts: processed, skipped, errors", async () => {
    vi.mocked(listFirefliesTranscripts).mockResolvedValue([
      { id: "ff-ok", title: "OK", date: "1711900800000" },
      { id: "ff-skip", title: "Skip", date: "1711900800000" },
      { id: "ff-fail", title: "Fail", date: "1711900800000" },
    ] as never);
    vi.mocked(getExistingFirefliesIds).mockResolvedValue(new Set(["ff-skip"]));
    vi.mocked(getExistingMeetingsByTitleDates).mockResolvedValue(new Map());
    vi.mocked(fetchFirefliesTranscript)
      .mockResolvedValueOnce({
        id: "ff-ok",
        title: "OK",
        date: "1711900800000",
        participants: [],
        organizer_email: null,
        meeting_attendees: [],
        sentences: [],
        summary: emptyFirefliesSummary(),
        audio_url: null,
      })
      .mockResolvedValueOnce(null); // ff-fail: fetch fails
    vi.mocked(isValidDuration).mockReturnValue({ valid: true, duration: 10 });
    vi.mocked(processMeeting).mockResolvedValue({
      meetingId: "m1",
      gatekeeper: { meeting_type: "internal", relevance_score: 0.5 },
      errors: [],
    } as never);
    vi.mocked(runReEmbedWorker).mockResolvedValue({ total: 0, byTable: {} } as never);

    const req = makeAuthedRequest("POST", { limit: 20 });
    const res = await POST(req as never);
    const data = await res.json();

    expect(data.summary.imported).toBe(1);
    expect(data.summary.skipped).toBe(1);
    expect(data.summary.failed).toBe(1);
  });
});
