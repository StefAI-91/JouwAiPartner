import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";

vi.mock("@repo/ai/fireflies", () => ({
  fetchFirefliesTranscript: vi.fn(),
}));

vi.mock("@repo/ai/transcript-processor", () => ({
  chunkTranscript: vi.fn(() => [{ text: "chunk1" }]),
}));

vi.mock("@repo/database/queries/meetings", () => ({
  getMeetingByFirefliesId: vi.fn(),
  getMeetingByTitleAndDate: vi.fn(),
}));

vi.mock("@repo/ai/validations/fireflies", () => ({
  isValidDuration: vi.fn(),
}));

vi.mock("@repo/ai/pipeline/gatekeeper-pipeline", () => ({
  processMeeting: vi.fn(),
}));

import { fetchFirefliesTranscript } from "@repo/ai/fireflies";
import { getMeetingByFirefliesId, getMeetingByTitleAndDate } from "@repo/database/queries/meetings";
import { isValidDuration } from "@repo/ai/validations/fireflies";
import { processMeeting } from "@repo/ai/pipeline/gatekeeper-pipeline";
import { POST } from "../../src/app/api/webhooks/fireflies/route";
import { emptyFirefliesSummary, firefliesSentence } from "../helpers/fireflies-fixtures";

const WEBHOOK_SECRET = "test-secret-123";

function makeSignedRequest(body: Record<string, unknown>): Request {
  const rawBody = JSON.stringify(body);
  const signature = createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");

  return new Request("http://localhost/api/webhooks/fireflies", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hub-signature": signature,
    },
    body: rawBody,
  });
}

describe("POST /api/webhooks/fireflies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FIREFLIES_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  it("returns 401 when signature verification fails", async () => {
    const req = new Request("http://localhost/api/webhooks/fireflies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ meetingId: "m1" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("skips non-transcription events", async () => {
    const req = makeSignedRequest({
      meetingId: "m1",
      eventType: "Meeting started",
    });

    const res = await POST(req as never);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.skipped).toBe(true);
  });

  it("skips meetings that already exist by fireflies_id", async () => {
    vi.mocked(getMeetingByFirefliesId).mockResolvedValue({ id: "existing-1" } as never);

    const req = makeSignedRequest({
      meetingId: "m1",
      eventType: "Transcription completed",
    });

    const res = await POST(req as never);
    const data = await res.json();
    expect(data.skipped).toBe(true);
    expect(data.reason).toBe("duplicate");
  });

  it("skips meetings with duplicate title+date", async () => {
    vi.mocked(getMeetingByFirefliesId).mockResolvedValue(null);
    vi.mocked(fetchFirefliesTranscript).mockResolvedValue({
      id: "ff-dup",
      title: "Sprint planning",
      date: "1711900800000",
      participants: [],
      organizer_email: null,
      meeting_attendees: [],
      sentences: [],
      summary: emptyFirefliesSummary(),
      audio_url: null,
    });
    vi.mocked(getMeetingByTitleAndDate).mockResolvedValue({ id: "dup-1" } as never);

    const req = makeSignedRequest({
      meetingId: "m1",
      eventType: "Transcription completed",
    });

    const res = await POST(req as never);
    const data = await res.json();
    expect(data.skipped).toBe(true);
    expect(data.reason).toBe("duplicate_meeting");
  });

  it("skips meetings with invalid duration", async () => {
    vi.mocked(getMeetingByFirefliesId).mockResolvedValue(null);
    vi.mocked(fetchFirefliesTranscript).mockResolvedValue({
      id: "ff-quick",
      title: "Quick test",
      date: "",
      participants: [],
      organizer_email: null,
      meeting_attendees: [],
      sentences: [
        firefliesSentence({ text: "hi", start_time: 0, end_time: 30, speaker_name: "A" }),
      ],
      summary: emptyFirefliesSummary(),
      audio_url: null,
    });
    vi.mocked(getMeetingByTitleAndDate).mockResolvedValue(null);
    vi.mocked(isValidDuration).mockReturnValue({ valid: false, duration: 0.5 });

    const req = makeSignedRequest({
      meetingId: "m1",
      eventType: "Transcription completed",
    });

    const res = await POST(req as never);
    const data = await res.json();
    expect(data.skipped).toBe(true);
    expect(data.reason).toBe("too_short");
  });

  it("processes valid meeting through pipeline and returns success", async () => {
    vi.mocked(getMeetingByFirefliesId).mockResolvedValue(null);
    vi.mocked(fetchFirefliesTranscript).mockResolvedValue({
      id: "ff-client",
      title: "Client call",
      date: "1711900800000",
      participants: ["Stef", "Client"],
      organizer_email: "stef@jouwai.nl",
      meeting_attendees: [],
      sentences: [
        firefliesSentence({ text: "hello", start_time: 0, end_time: 600, speaker_name: "Stef" }),
      ],
      summary: { ...emptyFirefliesSummary(), notes: "Summary", topics_discussed: ["topic1"] },
      audio_url: "https://audio.url",
    });
    vi.mocked(getMeetingByTitleAndDate).mockResolvedValue(null);
    vi.mocked(isValidDuration).mockReturnValue({ valid: true, duration: 10 });
    vi.mocked(processMeeting).mockResolvedValue({
      meetingId: "new-meeting-1",
      gatekeeper: { meeting_type: "client_call", relevance_score: 0.9 },
      partyType: "client",
      extractions_saved: 3,
      embedded: true,
      elevenlabs_transcribed: false,
      summarized: true,
      errors: [],
    } as never);

    const req = makeSignedRequest({
      meetingId: "m1",
      eventType: "Transcription completed",
    });

    const res = await POST(req as never);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.meetingId).toBe("new-meeting-1");
    expect(data.extractions_saved).toBe(3);
    expect(processMeeting).toHaveBeenCalledTimes(1);
  });

  it("returns 200 even when skipping (prevents webhook retries)", async () => {
    vi.mocked(getMeetingByFirefliesId).mockResolvedValue({ id: "existing" } as never);

    const req = makeSignedRequest({
      meetingId: "m1",
      eventType: "Transcription completed",
    });

    const res = await POST(req as never);
    expect(res.status).toBe(200);
  });

  it("returns 500 when pipeline crashes", async () => {
    vi.mocked(getMeetingByFirefliesId).mockResolvedValue(null);
    vi.mocked(fetchFirefliesTranscript).mockResolvedValue({
      id: "ff-crash",
      title: "Crash test",
      date: "",
      participants: [],
      organizer_email: null,
      meeting_attendees: [],
      sentences: [],
      summary: emptyFirefliesSummary(),
      audio_url: null,
    });
    vi.mocked(isValidDuration).mockReturnValue({ valid: true, duration: 10 });
    vi.mocked(processMeeting).mockRejectedValue(new Error("Pipeline exploded"));

    const req = makeSignedRequest({
      meetingId: "m1",
      eventType: "Transcription completed",
    });

    const res = await POST(req as never);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Pipeline failed");
  });

  it("returns 502 when transcript fetch fails", async () => {
    vi.mocked(getMeetingByFirefliesId).mockResolvedValue(null);
    vi.mocked(fetchFirefliesTranscript).mockResolvedValue(null);

    const req = makeSignedRequest({
      meetingId: "m1",
      eventType: "Transcription completed",
    });

    const res = await POST(req as never);
    expect(res.status).toBe(502);
  });
});
