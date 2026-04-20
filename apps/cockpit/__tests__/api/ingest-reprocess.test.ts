import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/ai/fireflies", () => ({
  fetchFirefliesTranscript: vi.fn(),
}));

vi.mock("@repo/ai/transcript-processor", () => ({
  chunkTranscript: vi.fn(() => [{ text: "chunk1" }]),
}));

vi.mock("@repo/ai/pipeline/steps/transcribe", () => ({
  runTranscribeStep: vi.fn(),
}));

vi.mock("@repo/ai/pipeline/steps/summarize", () => ({
  runSummarizeStep: vi.fn(),
}));

vi.mock("@repo/ai/pipeline/steps/risk-specialist", () => ({
  runRiskSpecialistStep: vi.fn(),
}));

vi.mock("@repo/ai/pipeline/embed-pipeline", () => ({
  embedMeetingWithExtractions: vi.fn(),
}));

vi.mock("@repo/database/mutations/meetings", () => ({
  markMeetingEmbeddingStale: vi.fn(),
}));

vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(),
}));

vi.mock("@repo/database/queries/meetings", () => ({
  getMeetingByFirefliesIdForReprocess: vi.fn(),
}));

vi.mock("@repo/ai/pipeline/context-injection", () => ({
  buildEntityContext: vi.fn(() => ({ projects: [], organizations: [], people: [] })),
}));

vi.mock("@repo/ai/pipeline/tagger", () => ({
  runTagger: vi.fn(() => []),
}));

vi.mock("@repo/ai/pipeline/segment-builder", () => ({
  buildSegments: vi.fn(() => []),
}));

vi.mock("@repo/database/mutations/meeting-project-summaries", () => ({
  insertMeetingProjectSummaries: vi.fn(),
  updateSegmentEmbedding: vi.fn(),
}));

vi.mock("@repo/ai/embeddings", () => ({
  embedBatch: vi.fn(),
}));

vi.mock("@repo/database/queries/ignored-entities", () => ({
  getIgnoredEntityNames: vi.fn(() => new Set()),
}));

import { fetchFirefliesTranscript } from "@repo/ai/fireflies";
import { runTranscribeStep } from "@repo/ai/pipeline/steps/transcribe";
import { runSummarizeStep } from "@repo/ai/pipeline/steps/summarize";
import { runRiskSpecialistStep } from "@repo/ai/pipeline/steps/risk-specialist";
import { getMeetingByFirefliesIdForReprocess } from "@repo/database/queries/meetings";
import { POST } from "../../src/app/api/ingest/reprocess/route";
import { emptyFirefliesSummary, firefliesSentence } from "../helpers/fireflies-fixtures";

const CRON_SECRET = "test-cron-secret";

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/ingest/reprocess", {
    method: "POST",
    headers: {
      authorization: `Bearer ${CRON_SECRET}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ingest/reprocess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
  });

  it("returns 401 without valid auth", async () => {
    const req = new Request("http://localhost/api/ingest/reprocess", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fireflies_id: "ff-1" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("returns 400 when fireflies_id is missing", async () => {
    const req = makeRequest({});
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 404 when meeting is not found", async () => {
    vi.mocked(getMeetingByFirefliesIdForReprocess).mockResolvedValue(null);

    const req = makeRequest({ fireflies_id: "nonexistent" });
    const res = await POST(req as never);
    expect(res.status).toBe(404);
  });

  it("draait summarizer + RiskSpecialist in de reprocess-flow (Extractor is verwijderd)", async () => {
    const mockMeeting = {
      id: "m1",
      title: "Test meeting",
      date: "2026-01-15",
      meeting_type: "internal",
      party_type: "internal",
      participants: ["Stef"],
      organization_id: null,
      raw_fireflies: null,
    };

    vi.mocked(getMeetingByFirefliesIdForReprocess).mockResolvedValue(mockMeeting);

    vi.mocked(fetchFirefliesTranscript).mockResolvedValue({
      id: "ff-1",
      title: "Test meeting",
      date: "1711900800000",
      participants: ["Stef"],
      organizer_email: null,
      meeting_attendees: [],
      sentences: [
        firefliesSentence({ text: "hello", start_time: 0, end_time: 600, speaker_name: "Stef" }),
      ],
      summary: { ...emptyFirefliesSummary(), notes: "Summary notes" },
      audio_url: "https://audio.url/file.mp3",
    });

    vi.mocked(runTranscribeStep).mockResolvedValue({
      success: true,
      transcript: "Transcribed text",
    } as never);
    vi.mocked(runSummarizeStep).mockResolvedValue({
      success: true,
      richSummary: "Rich summary",
      kernpunten: ["point 1"],
      vervolgstappen: ["step 1"],
    } as never);
    vi.mocked(runRiskSpecialistStep).mockResolvedValue(undefined);

    const req = makeRequest({ fireflies_id: "ff-1" });
    const res = await POST(req as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(runRiskSpecialistStep).toHaveBeenCalledTimes(1);
    const args = vi.mocked(runRiskSpecialistStep).mock.calls[0];
    expect(args[0]).toBe("m1");
    expect(data.meeting_id).toBe("m1");
    expect(data.risk_specialist.success).toBe(true);
  });

  it("returns 502 when Fireflies transcript fetch fails", async () => {
    vi.mocked(getMeetingByFirefliesIdForReprocess).mockResolvedValue({
      id: "m1",
      title: "Test",
      date: null,
      meeting_type: null,
      party_type: null,
      participants: null,
      organization_id: null,
      raw_fireflies: null,
    });
    vi.mocked(fetchFirefliesTranscript).mockResolvedValue(null);

    const req = makeRequest({ fireflies_id: "ff-1" });
    const res = await POST(req as never);
    expect(res.status).toBe(502);
  });

  it("returns 422 when no audio_url available", async () => {
    vi.mocked(getMeetingByFirefliesIdForReprocess).mockResolvedValue({
      id: "m1",
      title: "Test",
      date: null,
      meeting_type: null,
      party_type: null,
      participants: null,
      organization_id: null,
      raw_fireflies: null,
    });
    vi.mocked(fetchFirefliesTranscript).mockResolvedValue({
      id: "ff-1",
      title: "Test",
      date: "",
      participants: [],
      organizer_email: null,
      meeting_attendees: [],
      sentences: [],
      summary: emptyFirefliesSummary(),
      audio_url: null,
    });

    const req = makeRequest({ fireflies_id: "ff-1" });
    const res = await POST(req as never);
    expect(res.status).toBe(422);
  });
});
