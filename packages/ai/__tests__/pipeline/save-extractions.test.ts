import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database/mutations/meetings", () => ({
  linkAllMeetingProjects: vi.fn(),
}));
vi.mock("@repo/database/mutations/extractions", () => ({
  insertExtractions: vi.fn(),
}));

import { saveExtractions } from "../../src/pipeline/save-extractions";
import { linkAllMeetingProjects } from "@repo/database/mutations/meetings";
import { insertExtractions } from "@repo/database/mutations/extractions";
import type { ExtractorOutput } from "../../src/validations/extractor";
import type { IdentifiedProject } from "../../src/validations/gatekeeper";

const mockLinkProjects = linkAllMeetingProjects as ReturnType<typeof vi.fn>;
const mockInsertExtractions = insertExtractions as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

const MEETING_ID = "meeting-uuid-1";

const baseExtraction = {
  type: "action_item" as const,
  content: "Stef maakt tickets aan",
  confidence: 0.9,
  transcript_ref: "quote from transcript",
  category: "wachten_op_extern" as const,
  follow_up_contact: "Jan",
  assignee: "Stef",
  deadline: null,
  suggested_deadline: "2026-04-15",
  effort_estimate: "small" as const,
  deadline_reasoning: "Standaard 5 werkdagen",
  scope: "project" as const,
  project: null,
};

describe("saveExtractions", () => {
  it("linkt alle identified_projects via linkAllMeetingProjects met correcte meeting_id", async () => {
    const projects: IdentifiedProject[] = [
      { project_name: "Project A", project_id: "proj-1", confidence: 0.9 },
      { project_name: "Project B", project_id: "proj-2", confidence: 0.7 },
    ];

    mockLinkProjects.mockResolvedValue({ linked: 2, errors: [] });
    mockInsertExtractions.mockResolvedValue({ success: true, count: 0 });

    const output: ExtractorOutput = { extractions: [], entities: { clients: [] } };
    await saveExtractions(output, MEETING_ID, projects);

    expect(mockLinkProjects).toHaveBeenCalledWith(MEETING_ID, projects);
  });

  it("mapt extraction items naar juiste project_id op basis van naam-match", async () => {
    const projects: IdentifiedProject[] = [
      { project_name: "Klantportaal", project_id: "proj-1", confidence: 0.9 },
    ];

    mockLinkProjects.mockResolvedValue({ linked: 1, errors: [] });
    mockInsertExtractions.mockResolvedValue({ success: true, count: 1 });

    const output: ExtractorOutput = {
      extractions: [{ ...baseExtraction, project: "Klantportaal" }],
      entities: { clients: [] },
    };

    await saveExtractions(output, MEETING_ID, projects);

    const insertedRows = mockInsertExtractions.mock.calls[0][0];
    expect(insertedRows[0].project_id).toBe("proj-1");
  });

  it("fallback: items zonder expliciet project krijgen primary project (hoogste confidence)", async () => {
    const projects: IdentifiedProject[] = [
      { project_name: "Low Conf", project_id: "proj-low", confidence: 0.5 },
      { project_name: "High Conf", project_id: "proj-high", confidence: 0.95 },
    ];

    mockLinkProjects.mockResolvedValue({ linked: 2, errors: [] });
    mockInsertExtractions.mockResolvedValue({ success: true, count: 1 });

    const output: ExtractorOutput = {
      extractions: [{ ...baseExtraction, project: null, scope: "project" }],
      entities: { clients: [] },
    };

    await saveExtractions(output, MEETING_ID, projects);

    const insertedRows = mockInsertExtractions.mock.calls[0][0];
    expect(insertedRows[0].project_id).toBe("proj-high");
  });

  it("personal scope (scope: 'personal') krijgt altijd project_id: null", async () => {
    const projects: IdentifiedProject[] = [
      { project_name: "Project A", project_id: "proj-1", confidence: 0.9 },
    ];

    mockLinkProjects.mockResolvedValue({ linked: 1, errors: [] });
    mockInsertExtractions.mockResolvedValue({ success: true, count: 1 });

    const output: ExtractorOutput = {
      extractions: [{ ...baseExtraction, scope: "personal", project: null }],
      entities: { clients: [] },
    };

    await saveExtractions(output, MEETING_ID, projects);

    const insertedRows = mockInsertExtractions.mock.calls[0][0];
    expect(insertedRows[0].project_id).toBeNull();
  });

  it("retourneert { extractions_saved: N, projects_linked: N } bij succes", async () => {
    const projects: IdentifiedProject[] = [
      { project_name: "Project A", project_id: "proj-1", confidence: 0.9 },
    ];

    mockLinkProjects.mockResolvedValue({ linked: 1, errors: [] });
    mockInsertExtractions.mockResolvedValue({ success: true, count: 2 });

    const output: ExtractorOutput = {
      extractions: [
        { ...baseExtraction, project: "Project A" },
        { ...baseExtraction, content: "Tweede item", project: "Project A" },
      ],
      entities: { clients: [] },
    };

    const result = await saveExtractions(output, MEETING_ID, projects);

    expect(result.extractions_saved).toBe(2);
    expect(result.projects_linked).toBe(1);
  });

  it("retourneert { extractions_saved: 0 } bij lege extractie-input", async () => {
    mockLinkProjects.mockResolvedValue({ linked: 0, errors: [] });

    const output: ExtractorOutput = { extractions: [], entities: { clients: [] } };
    const result = await saveExtractions(output, MEETING_ID, []);

    expect(result.extractions_saved).toBe(0);
    expect(mockInsertExtractions).not.toHaveBeenCalled();
  });

  it("logt fout maar crasht niet als linkAllMeetingProjects faalt", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockLinkProjects.mockResolvedValue({
      linked: 0,
      errors: ["Foreign key violation"],
    });
    mockInsertExtractions.mockResolvedValue({ success: true, count: 1 });

    const output: ExtractorOutput = {
      extractions: [baseExtraction],
      entities: { clients: [] },
    };

    const result = await saveExtractions(output, MEETING_ID, []);

    expect(result.extractions_saved).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith("Failed to link some projects:", [
      "Foreign key violation",
    ]);

    consoleSpy.mockRestore();
  });

  it("retourneert extractions_saved: 0 bij insertExtractions error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockLinkProjects.mockResolvedValue({ linked: 1, errors: [] });
    mockInsertExtractions.mockResolvedValue({ error: "DB insert failed" });

    const output: ExtractorOutput = {
      extractions: [baseExtraction],
      entities: { clients: [] },
    };

    const projects: IdentifiedProject[] = [
      { project_name: "Project A", project_id: "proj-1", confidence: 0.9 },
    ];

    const result = await saveExtractions(output, MEETING_ID, projects);

    expect(result.extractions_saved).toBe(0);
    expect(result.projects_linked).toBe(1);

    consoleSpy.mockRestore();
  });
});
