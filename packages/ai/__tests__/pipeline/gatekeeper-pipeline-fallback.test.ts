import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// T5 (PW-QC-04 QUAL-QC-034 / QUAL-QC-035):
// Als de MeetingStructurer crasht terwijl USE_MEETING_STRUCTURER="true",
// moet de legacy path (Summarizer + Extractor) automatisch draaien.
// Observable: saveExtractions (legacy) krijgt de call, saveStructuredExtractions
// krijgt 'm niet.
//
// Strategie: mock op de echte grenzen — agent-functies + DB-mutaties +
// context/gatekeeper. Geen chainable DB-mocks, geen inspectie van private state.

// Agent boundaries
vi.mock("../../src/agents/gatekeeper", () => ({
  runGatekeeper: vi.fn(),
}));
vi.mock("../../src/agents/meeting-structurer", () => ({
  runMeetingStructurer: vi.fn(),
}));
vi.mock("../../src/agents/summarizer", () => ({
  runSummarizer: vi.fn(),
  formatSummary: vi.fn((output: { briefing: string }) => `# briefing\n${output.briefing}`),
}));
vi.mock("../../src/agents/extractor", () => ({
  runExtractor: vi.fn(),
}));
vi.mock("../../src/agents/title-generator", () => ({
  generateTitleFromSummary: vi.fn(async () => "AI-gegenereerde titel"),
}));

// Save-extractions boundary (the observable we care about)
vi.mock("../../src/pipeline/save-extractions", () => ({
  saveExtractions: vi.fn(),
  saveStructuredExtractions: vi.fn(),
}));

// Downstream steps we don't care about for this behaviour — stubbed out
// so processMeeting returns without exploding.
vi.mock("../../src/pipeline/steps/transcribe", () => ({
  runTranscribeStep: vi.fn().mockResolvedValue({ success: false, transcript: null, error: null }),
}));
vi.mock("../../src/pipeline/steps/risk-specialist-experiment", () => ({
  runRiskSpecialistExperiment: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../src/pipeline/steps/tag-and-segment", () => ({
  runTagAndSegmentStep: vi.fn().mockResolvedValue({ segmentsSaved: 0, errors: [] }),
}));
vi.mock("../../src/pipeline/steps/embed", () => ({
  runEmbedStep: vi.fn().mockResolvedValue({ success: true, error: null }),
}));
vi.mock("../../src/pipeline/generate-title", () => ({
  generateMeetingTitle: vi.fn().mockResolvedValue("AI-titel"),
}));
vi.mock("../../src/pipeline/entity-resolution", () => ({
  resolveOrganization: vi.fn().mockResolvedValue({
    organization_id: "org-1",
    matched: true,
  }),
}));
vi.mock("../../src/pipeline/context-injection", () => ({
  buildEntityContext: vi.fn().mockResolvedValue({ contextString: "", projects: [] }),
}));

// Database boundaries
vi.mock("@repo/database/queries/people", () => ({
  getAllKnownPeople: vi.fn().mockResolvedValue([]),
  findPeopleByEmails: vi.fn().mockResolvedValue(new Map()),
}));
vi.mock("@repo/database/mutations/meetings", () => ({
  insertMeeting: vi.fn().mockResolvedValue({ data: { id: "meeting-uuid-1" } }),
  updateMeetingSummary: vi.fn().mockResolvedValue({ success: true }),
  updateMeetingRawFireflies: vi.fn().mockResolvedValue({ success: true }),
  updateMeetingTitle: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@repo/database/mutations/meeting-participants", () => ({
  linkMeetingParticipants: vi.fn().mockResolvedValue({ linked: 0 }),
}));

import { processMeeting } from "../../src/pipeline/gatekeeper-pipeline";
import { runMeetingStructurer } from "../../src/agents/meeting-structurer";
import { runSummarizer } from "../../src/agents/summarizer";
import { runExtractor } from "../../src/agents/extractor";
import { runGatekeeper } from "../../src/agents/gatekeeper";
import { saveExtractions, saveStructuredExtractions } from "../../src/pipeline/save-extractions";

const mockStructurer = runMeetingStructurer as ReturnType<typeof vi.fn>;
const mockSummarizer = runSummarizer as ReturnType<typeof vi.fn>;
const mockExtractor = runExtractor as ReturnType<typeof vi.fn>;
const mockGatekeeper = runGatekeeper as ReturnType<typeof vi.fn>;
const mockSaveExtractions = saveExtractions as ReturnType<typeof vi.fn>;
const mockSaveStructuredExtractions = saveStructuredExtractions as ReturnType<typeof vi.fn>;

const sampleInput = {
  fireflies_id: "ff-1",
  title: "Status sync",
  // insertMeeting does `new Date(Number(input.date))`, so feed a ms-epoch string.
  date: "1745136000000",
  participants: ["stef@jaip.nl"],
  meeting_attendees: [{ displayName: "Stef", email: "stef@jaip.nl", name: "Stef" }],
  sentences: [{ speaker_name: "Stef" }],
  summary: "Korte samenvatting",
  topics: ["deploy"],
  transcript: "Dit is het transcript van de meeting.",
};

const originalFlag = process.env.USE_MEETING_STRUCTURER;

beforeEach(() => {
  vi.clearAllMocks();

  mockGatekeeper.mockResolvedValue({
    meeting_type: "status_update",
    relevance_score: 0.8,
    organization_name: "JAIP",
    identified_projects: [],
  });

  mockSummarizer.mockResolvedValue({
    briefing: "Legacy briefing",
    kernpunten: ["### [Algemeen] Thema", "**Besluit:** iets"],
    vervolgstappen: [],
    deelnemers: [],
  });

  mockExtractor.mockResolvedValue({
    extractions: [],
    entities: { clients: [] },
  });

  mockSaveExtractions.mockResolvedValue({
    extractions_saved: 0,
    projects_linked: 0,
  });
});

afterEach(() => {
  if (originalFlag === undefined) {
    delete process.env.USE_MEETING_STRUCTURER;
  } else {
    process.env.USE_MEETING_STRUCTURER = originalFlag;
  }
});

describe("processMeeting fallback (PW-QC-04 QUAL-QC-034 / QUAL-QC-035)", () => {
  it("valt terug op legacy Summarizer + Extractor wanneer MeetingStructurer crasht (flag on)", async () => {
    process.env.USE_MEETING_STRUCTURER = "true";
    mockStructurer.mockRejectedValue(new Error("Anthropic 429 rate limited"));

    const result = await processMeeting(sampleInput);

    // Observable 1: legacy agents werden gedraaid (fallback getriggerd).
    expect(mockSummarizer).toHaveBeenCalled();
    expect(mockExtractor).toHaveBeenCalled();

    // Observable 2: de DB-persist ging via het legacy save-pad, niet
    // via het structured-save-pad (dat pad is immers gecrasht).
    expect(mockSaveExtractions).toHaveBeenCalled();
    expect(mockSaveStructuredExtractions).not.toHaveBeenCalled();

    // Observable 3: de gecapture error staat in de return-errors, zodat
    // de caller 'm kan surface'n in Vercel-logs / retry-tabel.
    expect(result.errors.some((e) => e.includes("Anthropic 429"))).toBe(true);
  });

  it("draait de legacy pair direct als de flag uit staat (geen structurer-call)", async () => {
    delete process.env.USE_MEETING_STRUCTURER;

    await processMeeting(sampleInput);

    expect(mockStructurer).not.toHaveBeenCalled();
    expect(mockSummarizer).toHaveBeenCalled();
    expect(mockExtractor).toHaveBeenCalled();
    expect(mockSaveExtractions).toHaveBeenCalled();
    expect(mockSaveStructuredExtractions).not.toHaveBeenCalled();
  });
});
