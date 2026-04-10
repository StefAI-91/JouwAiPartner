import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database/mutations/embeddings", () => ({
  updateRowEmbedding: vi.fn(),
  batchUpdateEmbeddings: vi.fn(),
}));
vi.mock("@repo/database/queries/meetings", () => ({
  getMeetingExtractions: vi.fn(),
  getMeetingForEmbedding: vi.fn(),
  getExtractionIdsAndContent: vi.fn(),
}));
vi.mock("../../src/embeddings", () => ({
  embedText: vi.fn(),
  embedBatch: vi.fn(),
}));
vi.mock("../../src/pipeline/embed-text", () => ({
  buildMeetingEmbedText: vi.fn(),
}));

import { embedMeetingWithExtractions } from "../../src/pipeline/embed-pipeline";
import { updateRowEmbedding, batchUpdateEmbeddings } from "@repo/database/mutations/embeddings";
import {
  getMeetingExtractions,
  getMeetingForEmbedding,
  getExtractionIdsAndContent,
} from "@repo/database/queries/meetings";
import { embedText, embedBatch } from "../../src/embeddings";
import { buildMeetingEmbedText } from "../../src/pipeline/embed-text";

const mockGetMeeting = getMeetingForEmbedding as ReturnType<typeof vi.fn>;
const mockGetExtractions = getMeetingExtractions as ReturnType<typeof vi.fn>;
const mockGetExtractionIds = getExtractionIdsAndContent as ReturnType<typeof vi.fn>;
const mockEmbedText = embedText as ReturnType<typeof vi.fn>;
const mockEmbedBatch = embedBatch as ReturnType<typeof vi.fn>;
const mockUpdateRow = updateRowEmbedding as ReturnType<typeof vi.fn>;
const mockBatchUpdate = batchUpdateEmbeddings as ReturnType<typeof vi.fn>;
const mockBuildText = buildMeetingEmbedText as ReturnType<typeof vi.fn>;

const MEETING_ID = "meeting-uuid-1";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("embedMeetingWithExtractions", () => {
  const meetingData = {
    title: "Weekly standup",
    participants: ["Alice", "Bob"],
    summary: "Sprint voortgang besproken",
  };

  const extractions = [
    { type: "decision", content: "We kiezen Next.js" },
    { type: "action_item", content: "Stef maakt tickets" },
  ];

  function setupHappyPath() {
    mockGetMeeting.mockResolvedValue(meetingData);
    mockGetExtractions.mockResolvedValue(extractions);
    mockBuildText.mockReturnValue("Meeting: Weekly standup\n\nBesluiten:\n- We kiezen Next.js");
    mockEmbedText.mockResolvedValue([0.1, 0.2, 0.3]);
    mockUpdateRow.mockResolvedValue({ success: true });
    mockGetExtractionIds.mockResolvedValue([
      { id: "ext-1", content: "We kiezen Next.js" },
      { id: "ext-2", content: "Stef maakt tickets" },
    ]);
    mockEmbedBatch.mockResolvedValue([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
    mockBatchUpdate.mockResolvedValue({ success: true });
  }

  it("haalt meeting + extractions op via queries", async () => {
    setupHappyPath();

    await embedMeetingWithExtractions(MEETING_ID);

    expect(mockGetMeeting).toHaveBeenCalledWith(MEETING_ID);
    expect(mockGetExtractions).toHaveBeenCalledWith(MEETING_ID);
  });

  it("roept buildMeetingEmbedText aan met meeting data", async () => {
    setupHappyPath();

    await embedMeetingWithExtractions(MEETING_ID);

    expect(mockBuildText).toHaveBeenCalledWith(meetingData, extractions);
  });

  it("schrijft meeting embedding via updateRowEmbedding", async () => {
    setupHappyPath();

    await embedMeetingWithExtractions(MEETING_ID);

    expect(mockUpdateRow).toHaveBeenCalledWith("meetings", MEETING_ID, [0.1, 0.2, 0.3]);
  });

  it("schrijft extraction embeddings via batchUpdateEmbeddings", async () => {
    setupHappyPath();

    await embedMeetingWithExtractions(MEETING_ID);

    expect(mockBatchUpdate).toHaveBeenCalledWith(
      "extractions",
      ["ext-1", "ext-2"],
      [
        [0.1, 0.2],
        [0.3, 0.4],
      ],
    );
  });

  it("gooit error als meeting niet gevonden wordt", async () => {
    mockGetMeeting.mockResolvedValue(null);

    await expect(embedMeetingWithExtractions(MEETING_ID)).rejects.toThrow(
      `Failed to fetch meeting ${MEETING_ID} for embedding`,
    );
  });

  it("gooit error als meeting embedding faalt", async () => {
    mockGetMeeting.mockResolvedValue(meetingData);
    mockGetExtractions.mockResolvedValue([]);
    mockBuildText.mockReturnValue("Meeting text");
    mockEmbedText.mockResolvedValue([0.1]);
    mockUpdateRow.mockResolvedValue({ error: "DB write failed" });

    await expect(embedMeetingWithExtractions(MEETING_ID)).rejects.toThrow(
      "Failed to save meeting embedding: DB write failed",
    );
  });

  it("logt maar gooit niet bij batch extraction embedding failure", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockGetMeeting.mockResolvedValue(meetingData);
    mockGetExtractions.mockResolvedValue(extractions);
    mockBuildText.mockReturnValue("text");
    mockEmbedText.mockResolvedValue([0.1]);
    mockUpdateRow.mockResolvedValue({ success: true });
    mockGetExtractionIds.mockResolvedValue([{ id: "ext-1", content: "content" }]);
    mockEmbedBatch.mockResolvedValue([[0.1]]);
    mockBatchUpdate.mockResolvedValue({ error: "Batch write failed" });

    // Should NOT throw
    await embedMeetingWithExtractions(MEETING_ID);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to batch embed extractions"),
    );

    consoleSpy.mockRestore();
  });

  it("slaat batch embedding over als er geen extractions zijn", async () => {
    mockGetMeeting.mockResolvedValue(meetingData);
    mockGetExtractions.mockResolvedValue([]);
    mockBuildText.mockReturnValue("text");
    mockEmbedText.mockResolvedValue([0.1]);
    mockUpdateRow.mockResolvedValue({ success: true });
    mockGetExtractionIds.mockResolvedValue([]);

    await embedMeetingWithExtractions(MEETING_ID);

    expect(mockEmbedBatch).not.toHaveBeenCalled();
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });
});
