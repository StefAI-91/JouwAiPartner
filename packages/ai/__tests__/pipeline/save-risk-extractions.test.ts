import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database/mutations/meetings", () => ({
  linkAllMeetingProjects: vi.fn(),
}));
vi.mock("@repo/database/mutations/extractions", () => ({
  deleteExtractionsByMeetingAndType: vi.fn(),
  insertExtractions: vi.fn(),
}));

import { saveRiskExtractions } from "../../src/pipeline/save-risk-extractions";
import { linkAllMeetingProjects } from "@repo/database/mutations/meetings";
import {
  deleteExtractionsByMeetingAndType,
  insertExtractions,
} from "@repo/database/mutations/extractions";
import type { IdentifiedProject } from "../../src/validations/gatekeeper";
import type { RiskSpecialistItem } from "../../src/validations/risk-specialist";

const mockLink = linkAllMeetingProjects as ReturnType<typeof vi.fn>;
const mockDelete = deleteExtractionsByMeetingAndType as ReturnType<typeof vi.fn>;
const mockInsert = insertExtractions as ReturnType<typeof vi.fn>;

const MEETING_ID = "meeting-uuid-1";

function risk(overrides: Partial<RiskSpecialistItem> = {}): RiskSpecialistItem {
  return {
    content: "Stef dreigt vast te lopen op projectuitvoering",
    theme: "Capaciteit",
    theme_project: null,
    source_quote: "ik ben bang dat jij te snel vast gaat lopen",
    project: null,
    confidence: 0.9,
    metadata: {
      severity: "high",
      category: "team",
      jaip_impact_area: "delivery",
      raised_by: "Wouter",
    },
    reasoning: "Expliciete waarschuwing door Wouter; raakt kernkwetsbaarheid 1.",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLink.mockResolvedValue({ linked: 0, errors: [] });
  mockDelete.mockResolvedValue({ success: true });
  mockInsert.mockResolvedValue({ success: true, count: 0 });
});

describe("saveRiskExtractions", () => {
  it("wist bestaande risk-rijen vóór insert (idempotent per meeting)", async () => {
    mockInsert.mockResolvedValue({ success: true, count: 1 });

    await saveRiskExtractions({ risks: [risk()] }, MEETING_ID, []);

    expect(mockDelete).toHaveBeenCalledWith(MEETING_ID, "risk");
    // Volgorde: delete vóór insert.
    const deleteCallOrder = mockDelete.mock.invocationCallOrder[0];
    const insertCallOrder = mockInsert.mock.invocationCallOrder[0];
    expect(deleteCallOrder).toBeLessThan(insertCallOrder);
  });

  it("schrijft rij met type='risk', content, confidence en source_quote als transcript_ref", async () => {
    mockInsert.mockResolvedValue({ success: true, count: 1 });

    await saveRiskExtractions({ risks: [risk()] }, MEETING_ID, []);

    const rows = mockInsert.mock.calls[0][0];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      meeting_id: MEETING_ID,
      type: "risk",
      content: "Stef dreigt vast te lopen op projectuitvoering",
      confidence: 0.9,
      transcript_ref: "ik ben bang dat jij te snel vast gaat lopen",
      verification_status: "draft",
      embedding_stale: true,
      reasoning: "Expliciete waarschuwing door Wouter; raakt kernkwetsbaarheid 1.",
    });
  });

  it("bouwt metadata met severity/category/jaip_impact_area/raised_by en laat null-velden weg", async () => {
    mockInsert.mockResolvedValue({ success: true, count: 1 });

    await saveRiskExtractions(
      {
        risks: [
          risk({
            metadata: {
              severity: "critical",
              category: null,
              jaip_impact_area: null,
              raised_by: null,
            },
            theme: "Team-overload",
          }),
        ],
      },
      MEETING_ID,
      [],
    );

    const rows = mockInsert.mock.calls[0][0];
    expect(rows[0].metadata).toEqual({
      severity: "critical",
      theme: "Team-overload",
    });
    expect(rows[0].metadata).not.toHaveProperty("category");
    expect(rows[0].metadata).not.toHaveProperty("jaip_impact_area");
  });

  it("mapt project_id via identifiedProjects als risk een project-naam heeft", async () => {
    mockInsert.mockResolvedValue({ success: true, count: 1 });

    const projects: IdentifiedProject[] = [
      { project_name: "Klantportaal", project_id: "proj-1", confidence: 0.9 },
    ];

    await saveRiskExtractions({ risks: [risk({ project: "Klantportaal" })] }, MEETING_ID, projects);

    const rows = mockInsert.mock.calls[0][0];
    expect(rows[0].project_id).toBe("proj-1");
  });

  it("fallback naar primary project (hoogste confidence) als risk geen project heeft", async () => {
    mockInsert.mockResolvedValue({ success: true, count: 1 });

    const projects: IdentifiedProject[] = [
      { project_name: "Laag", project_id: "proj-low", confidence: 0.4 },
      { project_name: "Hoog", project_id: "proj-high", confidence: 0.9 },
    ];

    await saveRiskExtractions({ risks: [risk({ project: null })] }, MEETING_ID, projects);

    const rows = mockInsert.mock.calls[0][0];
    expect(rows[0].project_id).toBe("proj-high");
  });

  it("skipt insert wanneer risks leeg is maar wist wel oude rijen", async () => {
    await saveRiskExtractions({ risks: [] }, MEETING_ID, []);

    expect(mockDelete).toHaveBeenCalledWith(MEETING_ID, "risk");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("skipt insert wanneer delete faalt (voorkomt duplicaten)", async () => {
    mockDelete.mockResolvedValue({ error: "DB down" });

    const result = await saveRiskExtractions({ risks: [risk()] }, MEETING_ID, []);

    expect(mockInsert).not.toHaveBeenCalled();
    expect(result.extractions_saved).toBe(0);
  });
});
