import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/agents/meeting-structurer", () => ({
  runMeetingStructurer: vi.fn(),
}));
vi.mock("@repo/database/mutations/meetings", () => ({
  updateMeetingSummary: vi.fn(),
  updateMeetingRawFireflies: vi.fn(),
  linkAllMeetingProjects: vi.fn(),
}));
vi.mock("@repo/database/mutations/extractions", () => ({
  insertExtractions: vi.fn(),
}));

import { runStructureStep, isMeetingStructurerEnabled } from "../../src/pipeline/steps/structure";
import { runMeetingStructurer } from "../../src/agents/meeting-structurer";
import {
  updateMeetingSummary,
  updateMeetingRawFireflies,
  linkAllMeetingProjects,
} from "@repo/database/mutations/meetings";
import { insertExtractions } from "@repo/database/mutations/extractions";
import type { MeetingStructurerOutput } from "../../src/validations/meeting-structurer";

const mockRunStructurer = runMeetingStructurer as ReturnType<typeof vi.fn>;
const mockUpdateSummary = updateMeetingSummary as ReturnType<typeof vi.fn>;
const mockUpdateRaw = updateMeetingRawFireflies as ReturnType<typeof vi.fn>;
const mockLinkProjects = linkAllMeetingProjects as ReturnType<typeof vi.fn>;
const mockInsertExtractions = insertExtractions as ReturnType<typeof vi.fn>;

const MEETING_ID = "meeting-uuid-1";

const baseContext = {
  title: "CAI Studio sync",
  meeting_type: "status_update",
  party_type: "client",
  meeting_date: "2026-04-18",
  participants: ["Stef", "Wouter"],
  speakerContext: null,
  entityContext: "",
};

function makeOutput(): MeetingStructurerOutput {
  return {
    briefing: "Stef en Wouter bespraken de deploy.",
    kernpunten: [
      {
        type: "decision",
        content: "Supabase Auth wordt gebruikt.",
        theme: "Auth",
        theme_project: "CAI Studio",
        source_quote: "We gaan met Supabase Auth werken.",
        project: "CAI Studio",
        confidence: 0.9,
        metadata: { status: "open" },
      },
      {
        type: "action_item",
        content: "Joris mailen voor credentials",
        theme: "Deploy",
        theme_project: "CAI Studio",
        source_quote: "We moeten Joris even mailen.",
        project: "CAI Studio",
        confidence: 0.95,
        metadata: {
          category: "wachten_op_extern",
          follow_up_contact: "Joris",
          assignee: "Wouter",
          deadline: "2026-04-22",
          scope: "project",
        },
      },
    ],
    deelnemers: [{ name: "Stef", role: "Lead", organization: "JAIP", stance: null }],
    entities: { clients: ["CAI"], people: ["Joris"] },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateSummary.mockResolvedValue({ success: true });
  mockUpdateRaw.mockResolvedValue({ success: true });
  mockLinkProjects.mockResolvedValue({ linked: 1, errors: [] });
  mockInsertExtractions.mockResolvedValue({ success: true, count: 0 });
});

describe("runStructureStep", () => {
  it("persists the rendered summary + briefing via updateMeetingSummary", async () => {
    mockRunStructurer.mockResolvedValue(makeOutput());

    const result = await runStructureStep(
      MEETING_ID,
      "transcript here",
      baseContext,
      {},
      "elevenlabs",
      [{ project_name: "CAI Studio", project_id: "proj-cai", confidence: 0.95 }],
    );

    expect(result.success).toBe(true);
    expect(mockUpdateSummary).toHaveBeenCalledTimes(1);
    const [savedMeetingId, savedSummary, savedBriefing] = mockUpdateSummary.mock.calls[0];
    expect(savedMeetingId).toBe(MEETING_ID);
    expect(savedSummary).toContain("## Kernpunten");
    expect(savedSummary).toContain("### [CAI Studio] Auth");
    expect(savedSummary).toContain("**Besluit:** Supabase Auth wordt gebruikt.");
    expect(savedBriefing).toBe("Stef en Wouter bespraken de deploy.");
  });

  it("stores pipeline metadata with meeting_structurer stamp", async () => {
    mockRunStructurer.mockResolvedValue(makeOutput());

    await runStructureStep(
      MEETING_ID,
      "transcript",
      baseContext,
      { pipeline: { earlier_stage: true } } as Record<string, unknown>,
      "fireflies",
      [],
    );

    const [, raw] = mockUpdateRaw.mock.calls[0];
    const pipeline = (raw as { pipeline: { meeting_structurer: { transcript_source: string } } })
      .pipeline;
    expect(pipeline.meeting_structurer.transcript_source).toBe("fireflies");
    expect(pipeline.meeting_structurer.kernpunten_count).toBe(2);
    // Existing pipeline keys are preserved (no wipe).
    expect((pipeline as unknown as { earlier_stage: boolean }).earlier_stage).toBe(true);
  });

  it("returns legacy-shape kernpunten + vervolgstappen arrays for the tagger", async () => {
    mockRunStructurer.mockResolvedValue(makeOutput());

    const result = await runStructureStep(
      MEETING_ID,
      "transcript",
      baseContext,
      {},
      "elevenlabs",
      [],
    );

    expect(result.kernpunten).toEqual([
      "### [CAI Studio] Auth",
      "**Besluit:** Supabase Auth wordt gebruikt.",
    ]);
    expect(result.vervolgstappen).toEqual([
      "[CAI Studio] Joris mailen voor credentials — Wouter, 2026-04-22",
    ]);
  });

  it("calls saveStructuredExtractions which persists all kernpunten", async () => {
    mockRunStructurer.mockResolvedValue(makeOutput());
    mockInsertExtractions.mockResolvedValue({ success: true, count: 2 });

    const result = await runStructureStep(MEETING_ID, "transcript", baseContext, {}, "elevenlabs", [
      { project_name: "CAI Studio", project_id: "proj-cai", confidence: 0.95 },
    ]);

    expect(result.extractionsSaved).toBe(2);
    const rows = mockInsertExtractions.mock.calls[0][0];
    expect(rows.map((r: { type: string }) => r.type)).toEqual(["decision", "action_item"]);
  });

  it("returns success=false with error when the agent throws — no DB writes", async () => {
    mockRunStructurer.mockRejectedValue(new Error("Anthropic 429"));

    const result = await runStructureStep(
      MEETING_ID,
      "transcript",
      baseContext,
      {},
      "elevenlabs",
      [],
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Anthropic 429");
    expect(mockUpdateSummary).not.toHaveBeenCalled();
    expect(mockInsertExtractions).not.toHaveBeenCalled();
  });

  it("returns success=false when updateMeetingSummary errors (does not swallow)", async () => {
    mockRunStructurer.mockResolvedValue(makeOutput());
    mockUpdateSummary.mockResolvedValue({ error: "DB down" });

    const result = await runStructureStep(
      MEETING_ID,
      "transcript",
      baseContext,
      {},
      "elevenlabs",
      [],
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("DB down");
  });
});

describe("isMeetingStructurerEnabled", () => {
  const originalEnv = process.env.USE_MEETING_STRUCTURER;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.USE_MEETING_STRUCTURER;
    } else {
      process.env.USE_MEETING_STRUCTURER = originalEnv;
    }
  });

  it("returns false by default (unset)", () => {
    delete process.env.USE_MEETING_STRUCTURER;
    expect(isMeetingStructurerEnabled()).toBe(false);
  });

  it("returns false for falsy-looking string values", () => {
    for (const value of ["false", "0", "no", ""]) {
      process.env.USE_MEETING_STRUCTURER = value;
      expect(isMeetingStructurerEnabled()).toBe(false);
    }
  });

  it("returns true only for the exact string 'true'", () => {
    process.env.USE_MEETING_STRUCTURER = "true";
    expect(isMeetingStructurerEnabled()).toBe(true);
  });

  it("is case-sensitive: 'True' and 'TRUE' count as off (strict opt-in)", () => {
    for (const value of ["True", "TRUE", "yes", "1"]) {
      process.env.USE_MEETING_STRUCTURER = value;
      expect(isMeetingStructurerEnabled()).toBe(false);
    }
  });
});
