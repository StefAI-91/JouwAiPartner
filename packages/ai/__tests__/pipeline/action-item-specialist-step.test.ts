import { describe, it, expect, vi, beforeEach } from "vitest";

// Q3b §3b: GRENS-mocks alleen.
// - `runActionItemSpecialist` wraps LLM-calls → grens.
// - DB-mutations (extractions + experimental-action-items + meetings) → grens.
// - `saveActionItemExtractions` is interne pipeline-helper → NIET mocken.
//   We laten 'm echt draaien en observeren via DB-mutation calls.

vi.mock("../../src/agents/action-item-specialist", async () => {
  const actual = await vi.importActual<typeof import("../../src/agents/action-item-specialist")>(
    "../../src/agents/action-item-specialist",
  );
  return {
    ...actual,
    runActionItemSpecialist: vi.fn(),
  };
});
vi.mock("@repo/database/mutations/extractions/experimental-action-items", () => ({
  insertExperimentalActionItemExtraction: vi.fn(),
}));
vi.mock("@repo/database/mutations/extractions", () => ({
  deleteExtractionsByMeetingTypeAndSource: vi.fn(async () => ({ success: true, count: 0 })),
  insertExtractions: vi.fn(async () => ({ success: true, count: 0 })),
}));
vi.mock("@repo/database/mutations/meetings", () => ({
  linkAllMeetingProjects: vi.fn(async () => ({ linked: 0, errors: [] })),
}));

import { runActionItemSpecialistStep } from "../../src/pipeline/steps/action-item-specialist";
import {
  runActionItemSpecialist,
  ACTION_ITEM_SPECIALIST_MODEL,
  type ActionItemSpecialistContext,
} from "../../src/agents/action-item-specialist";
import { insertExperimentalActionItemExtraction } from "@repo/database/mutations/extractions/experimental-action-items";
import {
  deleteExtractionsByMeetingTypeAndSource,
  insertExtractions,
} from "@repo/database/mutations/extractions";
import type { ActionItemSpecialistItem } from "../../src/validations/action-item-specialist";
import type { IdentifiedProject } from "../../src/validations/gatekeeper";

const mockRun = runActionItemSpecialist as ReturnType<typeof vi.fn>;
const mockAuditInsert = insertExperimentalActionItemExtraction as ReturnType<typeof vi.fn>;
const mockDeleteExtractions = deleteExtractionsByMeetingTypeAndSource as ReturnType<typeof vi.fn>;
const mockInsertExtractions = insertExtractions as ReturnType<typeof vi.fn>;

const MEETING_ID = "meeting-uuid-1";

const baseContext: ActionItemSpecialistContext = {
  title: "Sandra prospect",
  meeting_type: "sales",
  party_type: "external_lead",
  meeting_date: "2026-04-25",
  participants: [
    { name: "Stef", role: "CEO", organization: "JAIP", organization_type: "internal" },
    { name: "Sandra", role: "founder", organization: "Acme BV", organization_type: "client" },
  ],
};

const identifiedProjects: IdentifiedProject[] = [
  { project_name: "Booktalk V2", project_id: "proj-bt", confidence: 0.9 },
];

function makeItem(overrides: Partial<ActionItemSpecialistItem> = {}): ActionItemSpecialistItem {
  return {
    content: "Stef stuurt offerte naar Sandra",
    follow_up_contact: "Sandra",
    assignee: "Stef",
    source_quote: "ik stuur morgen offerte",
    project_context: "Booktalk V2",
    deadline: "2026-04-29",
    follow_up_date: "2026-04-28",
    type_werk: "B",
    category: null,
    confidence: 0.85,
    reasoning: "Expliciete toezegging.",
    recipient_per_quote: "from_jaip",
    jaip_followup_quote: null,
    jaip_followup_action: "n/a",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDeleteExtractions.mockResolvedValue({ success: true, count: 0 });
  mockInsertExtractions.mockResolvedValue({ success: true, count: 0 });
});

describe("runActionItemSpecialistStep", () => {
  it("schrijft bij success naar ZOWEL extractions ALS audit-tabel", async () => {
    mockRun.mockResolvedValue({
      output: { items: [makeItem(), makeItem({ content: "Tweede item" })] },
      gated: [],
      metrics: {
        latency_ms: 3100,
        input_tokens: 12000,
        output_tokens: 1500,
        reasoning_tokens: 800,
      },
      promptVersion: "v5",
    });
    mockAuditInsert.mockResolvedValue({ success: true, id: "exp-1" });
    mockInsertExtractions.mockResolvedValue({ success: true, count: 2 });

    await runActionItemSpecialistStep(
      MEETING_ID,
      "Stef: ik stuur morgen offerte",
      baseContext,
      identifiedProjects,
    );

    expect(mockAuditInsert).toHaveBeenCalledTimes(1);
    const auditPayload = mockAuditInsert.mock.calls[0][0];
    expect(auditPayload.meeting_id).toBe(MEETING_ID);
    expect(auditPayload.model).toBe(ACTION_ITEM_SPECIALIST_MODEL);
    expect(auditPayload.prompt_version).toBe("v5");
    expect(auditPayload.mode).toBe("single");
    expect(auditPayload.items).toHaveLength(2);
    expect(auditPayload.accept_count).toBe(2);
    expect(auditPayload.gate_count).toBe(0);
    expect(auditPayload.latency_ms).toBe(3100);
    expect(auditPayload.error).toBeNull();

    expect(mockDeleteExtractions).toHaveBeenCalledWith(
      MEETING_ID,
      "action_item",
      "action_item_specialist",
    );
    expect(mockInsertExtractions).toHaveBeenCalledTimes(1);
    const insertedRows = mockInsertExtractions.mock.calls[0][0];
    expect(insertedRows).toHaveLength(2);
    expect(insertedRows[0].type).toBe("action_item");
    expect(insertedRows[0].metadata.source).toBe("action_item_specialist");
  });

  it("draait runActionItemSpecialist met v5 + validateAction:true", async () => {
    mockRun.mockResolvedValue({
      output: { items: [] },
      gated: [],
      metrics: { latency_ms: 100, input_tokens: 0, output_tokens: 0, reasoning_tokens: 0 },
      promptVersion: "v5",
    });
    mockAuditInsert.mockResolvedValue({ success: true, id: "exp-cfg" });

    await runActionItemSpecialistStep(MEETING_ID, "transcript", baseContext, []);

    expect(mockRun).toHaveBeenCalledWith("transcript", baseContext, {
      promptVersion: "v5",
      validateAction: true,
    });
  });

  it("logt gated-items in audit-payload zodat false-positive-rationalisaties zichtbaar blijven", async () => {
    const gatedItem = makeItem({ type_werk: "C", recipient_per_quote: "third_party" });
    mockRun.mockResolvedValue({
      output: { items: [makeItem()] },
      gated: [{ item: gatedItem, reason: "auto-gate: recipient_per_quote=third_party" }],
      metrics: { latency_ms: 1000, input_tokens: 100, output_tokens: 50, reasoning_tokens: 20 },
      promptVersion: "v5",
    });
    mockAuditInsert.mockResolvedValue({ success: true, id: "exp-g" });
    mockInsertExtractions.mockResolvedValue({ success: true, count: 1 });

    await runActionItemSpecialistStep(MEETING_ID, "transcript", baseContext, []);

    const payload = mockAuditInsert.mock.calls[0][0];
    expect(payload.gated).toHaveLength(1);
    expect(payload.gate_count).toBe(1);
    expect(payload.accept_count).toBe(1);
    // Productie-pad krijgt alleen passed items, niet gegate items
    expect(mockInsertExtractions.mock.calls[0][0]).toHaveLength(1);
  });

  it("skipt agent + save-pad bij leeg transcript en logt 'no transcript'-error", async () => {
    mockAuditInsert.mockResolvedValue({ success: true, id: "exp-skip" });

    await runActionItemSpecialistStep(MEETING_ID, "", baseContext, []);

    expect(mockRun).not.toHaveBeenCalled();
    expect(mockInsertExtractions).not.toHaveBeenCalled();
    expect(mockAuditInsert).toHaveBeenCalledTimes(1);
    expect(mockAuditInsert.mock.calls[0][0].error).toBe("no transcript");
  });

  it("schrijft failure-row bij agent-crash en throwt niet (non-blocking)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockRun.mockRejectedValue(new Error("Anthropic 429"));
    mockAuditInsert.mockResolvedValue({ success: true, id: "exp-err" });

    await expect(
      runActionItemSpecialistStep(MEETING_ID, "transcript", baseContext, []),
    ).resolves.toBeUndefined();

    const payload = mockAuditInsert.mock.calls[0][0];
    expect(payload.error).toContain("Anthropic 429");
    expect(payload.items).toEqual([]);
    expect(payload.gated).toEqual([]);
    expect(mockDeleteExtractions).not.toHaveBeenCalled();
    expect(mockInsertExtractions).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("audit-failure blokkeert productie-save niet", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockRun.mockResolvedValue({
      output: { items: [makeItem()] },
      gated: [],
      metrics: { latency_ms: 1000, input_tokens: 100, output_tokens: 50, reasoning_tokens: 20 },
      promptVersion: "v5",
    });
    mockAuditInsert.mockRejectedValue(new Error("audit table down"));
    mockInsertExtractions.mockResolvedValue({ success: true, count: 1 });

    await expect(
      runActionItemSpecialistStep(MEETING_ID, "transcript", baseContext, []),
    ).resolves.toBeUndefined();

    expect(mockDeleteExtractions).toHaveBeenCalled();
    expect(mockInsertExtractions).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("save-failure blokkeert audit niet", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockRun.mockResolvedValue({
      output: { items: [makeItem()] },
      gated: [],
      metrics: { latency_ms: 1000, input_tokens: 100, output_tokens: 50, reasoning_tokens: 20 },
      promptVersion: "v5",
    });
    mockAuditInsert.mockResolvedValue({ success: true, id: "exp-ok" });
    mockInsertExtractions.mockRejectedValue(new Error("DB down"));

    await expect(
      runActionItemSpecialistStep(MEETING_ID, "transcript", baseContext, []),
    ).resolves.toBeUndefined();

    expect(mockAuditInsert).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it("0 accepted items → audit-rij geschreven, delete draait alsnog (intent: geen action_items)", async () => {
    mockRun.mockResolvedValue({
      output: { items: [] },
      gated: [],
      metrics: { latency_ms: 800, input_tokens: 5000, output_tokens: 100, reasoning_tokens: 200 },
      promptVersion: "v5",
    });
    mockAuditInsert.mockResolvedValue({ success: true, id: "exp-0" });

    await runActionItemSpecialistStep(MEETING_ID, "transcript", baseContext, []);

    expect(mockAuditInsert.mock.calls[0][0].accept_count).toBe(0);
    expect(mockDeleteExtractions).toHaveBeenCalled();
    expect(mockInsertExtractions).not.toHaveBeenCalled();
  });
});
