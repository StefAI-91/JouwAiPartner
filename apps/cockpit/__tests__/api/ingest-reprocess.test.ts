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

vi.mock("@repo/ai/agents/extractor", () => ({
  runExtractor: vi.fn(),
}));

vi.mock("@repo/ai/pipeline/save-extractions", () => ({
  saveExtractions: vi.fn(),
}));

vi.mock("@repo/ai/pipeline/embed-pipeline", () => ({
  embedMeetingWithExtractions: vi.fn(),
}));

vi.mock("@repo/database/mutations/extractions", () => ({
  deleteExtractionsByMeetingId: vi.fn(),
}));

vi.mock("@repo/database/mutations/meetings", () => ({
  markMeetingEmbeddingStale: vi.fn(),
}));

vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(),
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
import { runExtractor } from "@repo/ai/agents/extractor";
import { saveExtractions } from "@repo/ai/pipeline/save-extractions";
import { deleteExtractionsByMeetingId } from "@repo/database/mutations/extractions";
import { getAdminClient } from "@repo/database/supabase/admin";
import { POST } from "../../src/app/api/ingest/reprocess/route";
import { emptyFirefliesSummary, firefliesSentence } from "../helpers/fireflies-fixtures";

const CRON_SECRET = "test-cron-secret";

function createChainMock(resolveWith: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "single", "from"];
  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(resolveWith);
  return chain;
}

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
    const mockSupabase = createChainMock({
      data: null,
      error: { message: "Not found" },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const req = makeRequest({ fireflies_id: "nonexistent" });
    const res = await POST(req as never);
    expect(res.status).toBe(404);
  });

  it("deletes old extractions and re-runs pipeline", async () => {
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

    const mockSupabase = createChainMock({ data: mockMeeting, error: null });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

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
    vi.mocked(deleteExtractionsByMeetingId).mockResolvedValue(undefined as never);
    vi.mocked(runExtractor).mockResolvedValue({
      decisions: [],
      action_items: [],
      insights: [],
      needs: [],
      entities: {},
    } as never);
    vi.mocked(saveExtractions).mockResolvedValue({
      extractions_saved: 5,
      projects_linked: 1,
    } as never);

    const req = makeRequest({ fireflies_id: "ff-1" });
    const res = await POST(req as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(deleteExtractionsByMeetingId).toHaveBeenCalledWith("m1");
    expect(runExtractor).toHaveBeenCalledTimes(1);
    expect(data.meeting_id).toBe("m1");
    expect(data.extractor.success).toBe(true);
    expect(data.extractor.extractions_saved).toBe(5);
  });

  it("returns 502 when Fireflies transcript fetch fails", async () => {
    const mockSupabase = createChainMock({
      data: { id: "m1", title: "Test", raw_fireflies: null },
      error: null,
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);
    vi.mocked(fetchFirefliesTranscript).mockResolvedValue(null);

    const req = makeRequest({ fireflies_id: "ff-1" });
    const res = await POST(req as never);
    expect(res.status).toBe(502);
  });

  it("returns 422 when no audio_url available", async () => {
    const mockSupabase = createChainMock({
      data: { id: "m1", title: "Test", raw_fireflies: null },
      error: null,
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);
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
