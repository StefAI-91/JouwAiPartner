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

  // ==========================================================================
  // Contract / invariant tests — wat MOET altijd waar zijn over elke rij.
  //
  // Deze tests dekken stille regressies af die niet via een bug-rapport naar
  // boven komen. Als één van deze breekt, zitten er stille gaten in de
  // kennisbasis of komen ongeverifieerde feiten op productie.
  // ==========================================================================

  it("contract: elke rij krijgt verification_status='draft' (AI-output is nooit auto-verified)", async () => {
    // RULE-002 / vision: alles moet eerst door een mens. Als deze regel stil
    // breekt, lekken ongeverifieerde AI-feiten zonder review de MCP in.
    mockLinkProjects.mockResolvedValue({ linked: 0, errors: [] });
    mockInsertExtractions.mockResolvedValue({ success: true, count: 2 });

    const output: ExtractorOutput = {
      extractions: [baseExtraction, { ...baseExtraction, content: "Tweede" }],
      entities: { clients: [] },
    };
    await saveExtractions(output, MEETING_ID, []);

    const rows = mockInsertExtractions.mock.calls[0][0];
    for (const row of rows) {
      expect(row.verification_status).toBe("draft");
    }
  });

  it("contract: elke rij krijgt embedding_stale=true (re-embed worker pakt hem op)", async () => {
    mockLinkProjects.mockResolvedValue({ linked: 0, errors: [] });
    mockInsertExtractions.mockResolvedValue({ success: true, count: 1 });

    const output: ExtractorOutput = {
      extractions: [baseExtraction],
      entities: { clients: [] },
    };
    await saveExtractions(output, MEETING_ID, []);

    const row = mockInsertExtractions.mock.calls[0][0][0];
    expect(row.embedding_stale).toBe(true);
  });

  it("contract: transcript_ref blijft behouden (kern van 'geen antwoord zonder bron')", async () => {
    // Zonder transcript_ref kan de MCP prompt z'n belofte niet waarmaken.
    // Als deze propagatie stuk gaat verliezen we alle traceability.
    mockLinkProjects.mockResolvedValue({ linked: 0, errors: [] });
    mockInsertExtractions.mockResolvedValue({ success: true, count: 1 });

    const output: ExtractorOutput = {
      extractions: [{ ...baseExtraction, transcript_ref: "Stef: specs volgende week" }],
      entities: { clients: [] },
    };
    await saveExtractions(output, MEETING_ID, []);

    const row = mockInsertExtractions.mock.calls[0][0][0];
    expect(row.transcript_ref).toBe("Stef: specs volgende week");
  });

  it("contract: deadline/effort_estimate/assignee/category verhuizen naar metadata JSONB", async () => {
    // Deze velden bestaan niet als DB-kolom. Als deze mapping stil breekt
    // verdwijnen deadlines en effort estimates uit de reviewer UI.
    mockLinkProjects.mockResolvedValue({ linked: 0, errors: [] });
    mockInsertExtractions.mockResolvedValue({ success: true, count: 1 });

    const output: ExtractorOutput = {
      extractions: [
        {
          ...baseExtraction,
          deadline: "2025-12-01",
          effort_estimate: "medium",
          assignee: "Wouter",
          category: "wachten_op_beslissing",
        },
      ],
      entities: { clients: [] },
    };
    await saveExtractions(output, MEETING_ID, []);

    const row = mockInsertExtractions.mock.calls[0][0][0];
    expect(row.metadata.deadline).toBe("2025-12-01");
    expect(row.metadata.effort_estimate).toBe("medium");
    expect(row.metadata.assignee).toBe("Wouter");
    expect(row.metadata.category).toBe("wachten_op_beslissing");
  });

  it("defensief: expliciete project-naam die NIET in Gatekeeper-map staat → project_id=null (geen fabricatie)", async () => {
    // "Verzin geen match -- liever null dan een foute koppeling" (gatekeeper
    // systeem-prompt). Als de fallback hier stil verandert naar 'primary',
    // worden action_items aan het verkeerde project gekoppeld.
    const projects: IdentifiedProject[] = [
      { project_name: "Project Alpha", project_id: "proj-alpha", confidence: 0.9 },
    ];
    mockLinkProjects.mockResolvedValue({ linked: 1, errors: [] });
    mockInsertExtractions.mockResolvedValue({ success: true, count: 1 });

    const output: ExtractorOutput = {
      extractions: [{ ...baseExtraction, project: "Onbekend Project Beta" }],
      entities: { clients: [] },
    };
    await saveExtractions(output, MEETING_ID, projects);

    const row = mockInsertExtractions.mock.calls[0][0][0];
    expect(row.project_id).toBeNull();
  });

  it("defensief: primary-selectie negeert projecten met project_id=null", async () => {
    // Een niet-geresolveerd project (project_id=null) mag nooit als primary
    // fallback gelden — ook niet als z'n confidence het hoogst is.
    const projects: IdentifiedProject[] = [
      { project_name: "Ongezien", project_id: null, confidence: 0.95 },
      { project_name: "Alpha", project_id: "proj-alpha", confidence: 0.5 },
    ];
    mockLinkProjects.mockResolvedValue({ linked: 1, errors: [] });
    mockInsertExtractions.mockResolvedValue({ success: true, count: 1 });

    const output: ExtractorOutput = {
      extractions: [{ ...baseExtraction, project: null, scope: "project" }],
      entities: { clients: [] },
    };
    await saveExtractions(output, MEETING_ID, projects);

    const row = mockInsertExtractions.mock.calls[0][0][0];
    expect(row.project_id).toBe("proj-alpha");
  });
});
