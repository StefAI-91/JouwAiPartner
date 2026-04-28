import { describe, it, expect, vi, beforeEach } from "vitest";

// Q3b §3b: alleen DB-grens mocken. saveActionItemExtractions is een interne
// helper die we echt willen draaien om de payload te observeren.
vi.mock("@repo/database/mutations/meetings", () => ({
  linkAllMeetingProjects: vi.fn(),
}));
vi.mock("@repo/database/mutations/extractions", () => ({
  deleteExtractionsByMeetingTypeAndSource: vi.fn(),
  insertExtractions: vi.fn(),
}));

import {
  saveActionItemExtractions,
  ACTION_ITEM_SPECIALIST_SOURCE,
} from "../../src/pipeline/saves/action-item-extractions";
import { linkAllMeetingProjects } from "@repo/database/mutations/meetings";
import {
  deleteExtractionsByMeetingTypeAndSource,
  insertExtractions,
} from "@repo/database/mutations/extractions";
import type { IdentifiedProject } from "../../src/validations/gatekeeper";
import type { ActionItemSpecialistItem } from "../../src/validations/action-item-specialist";

const mockLink = linkAllMeetingProjects as ReturnType<typeof vi.fn>;
const mockDelete = deleteExtractionsByMeetingTypeAndSource as ReturnType<typeof vi.fn>;
const mockInsert = insertExtractions as ReturnType<typeof vi.fn>;

const MEETING_ID = "meeting-uuid-1";

function item(overrides: Partial<ActionItemSpecialistItem> = {}): ActionItemSpecialistItem {
  return {
    content: "Stef stuurt offerte naar Sandra voor Booktalk V2",
    follow_up_contact: "Sandra",
    assignee: "Stef",
    source_quote: "Stef: ik stuur de offerte morgen",
    project_context: "Booktalk V2",
    deadline: "2026-04-29",
    follow_up_date: "2026-04-28",
    type_werk: "B",
    category: null,
    confidence: 0.85,
    reasoning: "Stef geeft expliciet toezegging om offerte te sturen.",
    recipient_per_quote: "from_jaip",
    jaip_followup_quote: null,
    jaip_followup_action: "n/a",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLink.mockResolvedValue({ linked: 0, errors: [] });
  mockDelete.mockResolvedValue({ success: true, count: 0 });
  mockInsert.mockResolvedValue({ success: true, count: 0 });
});

describe("saveActionItemExtractions", () => {
  it("delete vóór insert, gefilterd op meetingId + type + specialist-source", async () => {
    mockInsert.mockResolvedValue({ success: true, count: 1 });

    await saveActionItemExtractions({ items: [item()] }, MEETING_ID, []);

    expect(mockDelete).toHaveBeenCalledWith(
      MEETING_ID,
      "action_item",
      ACTION_ITEM_SPECIALIST_SOURCE,
    );
    const deleteOrder = mockDelete.mock.invocationCallOrder[0];
    const insertOrder = mockInsert.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(insertOrder);
  });

  it("schrijft type='action_item' rij met content/confidence/source_quote/reasoning", async () => {
    mockInsert.mockResolvedValue({ success: true, count: 1 });

    await saveActionItemExtractions({ items: [item()] }, MEETING_ID, []);

    const rows = mockInsert.mock.calls[0][0];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      meeting_id: MEETING_ID,
      type: "action_item",
      content: "Stef stuurt offerte naar Sandra voor Booktalk V2",
      confidence: 0.85,
      transcript_ref: "Stef: ik stuur de offerte morgen",
      verification_status: "draft",
      embedding_stale: true,
      reasoning: "Stef geeft expliciet toezegging om offerte te sturen.",
    });
  });

  it("metadata heeft source-marker + alle gevulde velden, null-velden weggelaten", async () => {
    mockInsert.mockResolvedValue({ success: true, count: 1 });

    await saveActionItemExtractions(
      {
        items: [
          item({
            assignee: null,
            deadline: null,
            follow_up_date: null,
            category: null,
            jaip_followup_quote: null,
            project_context: null,
          }),
        ],
      },
      MEETING_ID,
      [],
    );

    const rows = mockInsert.mock.calls[0][0];
    expect(rows[0].metadata).toEqual({
      source: ACTION_ITEM_SPECIALIST_SOURCE,
      type_werk: "B",
      follow_up_contact: "Sandra",
      recipient_per_quote: "from_jaip",
      jaip_followup_action: "n/a",
    });
    expect(rows[0].metadata).not.toHaveProperty("assignee");
    expect(rows[0].metadata).not.toHaveProperty("deadline");
    expect(rows[0].metadata).not.toHaveProperty("category");
    expect(rows[0].metadata).not.toHaveProperty("project_context");
  });

  it("metadata.assignee + deadline matchen wat MCP get_action_items leest", async () => {
    // MCP `get_action_items` filtert op metadata->>assignee + metadata->>deadline.
    // Deze keys MOETEN bestaan zodra ze in de output zitten — anders breekt MCP
    // backwards compat.
    mockInsert.mockResolvedValue({ success: true, count: 1 });

    await saveActionItemExtractions({ items: [item()] }, MEETING_ID, []);

    const rows = mockInsert.mock.calls[0][0];
    expect(rows[0].metadata.assignee).toBe("Stef");
    expect(rows[0].metadata.deadline).toBe("2026-04-29");
  });

  it("mapt project_id via identifiedProjects op project_context (case-insensitive)", async () => {
    mockInsert.mockResolvedValue({ success: true, count: 1 });

    const projects: IdentifiedProject[] = [
      { project_name: "Booktalk V2", project_id: "proj-bt", confidence: 0.9 },
    ];

    await saveActionItemExtractions(
      { items: [item({ project_context: "booktalk v2" })] },
      MEETING_ID,
      projects,
    );

    expect(mockInsert.mock.calls[0][0][0].project_id).toBe("proj-bt");
  });

  it("fallback naar primary project (hoogste confidence) als project_context leeg is", async () => {
    mockInsert.mockResolvedValue({ success: true, count: 1 });

    const projects: IdentifiedProject[] = [
      { project_name: "Laag", project_id: "proj-low", confidence: 0.4 },
      { project_name: "Hoog", project_id: "proj-high", confidence: 0.9 },
    ];

    await saveActionItemExtractions(
      { items: [item({ project_context: null })] },
      MEETING_ID,
      projects,
    );

    expect(mockInsert.mock.calls[0][0][0].project_id).toBe("proj-high");
  });

  it("skipt insert wanneer items leeg, maar wist wel oude specialist-rijen", async () => {
    mockDelete.mockResolvedValue({ success: true, count: 2 });

    const result = await saveActionItemExtractions({ items: [] }, MEETING_ID, []);

    expect(mockDelete).toHaveBeenCalledWith(
      MEETING_ID,
      "action_item",
      ACTION_ITEM_SPECIALIST_SOURCE,
    );
    expect(mockInsert).not.toHaveBeenCalled();
    expect(result.extractions_saved).toBe(0);
    expect(result.extractions_replaced).toBe(2);
  });

  it("skipt insert wanneer delete faalt (voorkomt duplicaten)", async () => {
    mockDelete.mockResolvedValue({ error: "DB down" });

    const result = await saveActionItemExtractions({ items: [item()] }, MEETING_ID, []);

    expect(mockInsert).not.toHaveBeenCalled();
    expect(result.extractions_saved).toBe(0);
  });
});
