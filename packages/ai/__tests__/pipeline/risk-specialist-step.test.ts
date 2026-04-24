import { describe, it, expect, vi, beforeEach } from "vitest";

// Q3b §3b: GRENS-mocks alleen.
// - `runRiskSpecialist` wraps an LLM-call → grens.
// - `insertExperimentalRiskExtraction` + extractions/meetings mutations →
//   DB-grens.
// - `saveRiskExtractions` is een interne pipeline-helper → NIET mocken.
//   We laten hem echt draaien en observeren via de DB-mutation calls.

vi.mock("../../src/agents/risk-specialist", async () => {
  const actual = await vi.importActual<typeof import("../../src/agents/risk-specialist")>(
    "../../src/agents/risk-specialist",
  );
  return {
    ...actual,
    runRiskSpecialist: vi.fn(),
  };
});
vi.mock("@repo/database/mutations/extractions/experimental-risks", () => ({
  insertExperimentalRiskExtraction: vi.fn(),
}));
vi.mock("@repo/database/mutations/extractions", () => ({
  deleteExtractionsByMeetingAndType: vi.fn(async () => ({ success: true })),
  insertExtractions: vi.fn(async () => ({ count: 0 })),
}));
vi.mock("@repo/database/mutations/meetings", () => ({
  linkAllMeetingProjects: vi.fn(async () => ({ linked: 0, errors: [] })),
}));

import { runRiskSpecialistStep } from "../../src/pipeline/steps/risk-specialist";
import {
  runRiskSpecialist,
  RISK_SPECIALIST_MODEL,
  RISK_SPECIALIST_PROMPT_VERSION,
} from "../../src/agents/risk-specialist";
import { insertExperimentalRiskExtraction } from "@repo/database/mutations/extractions/experimental-risks";
import {
  deleteExtractionsByMeetingAndType,
  insertExtractions,
} from "@repo/database/mutations/extractions";
import type { RiskSpecialistOutput } from "../../src/validations/risk-specialist";
import type { IdentifiedProject } from "../../src/validations/gatekeeper";

const mockRun = runRiskSpecialist as ReturnType<typeof vi.fn>;
const mockAuditInsert = insertExperimentalRiskExtraction as ReturnType<typeof vi.fn>;
const mockDeleteExtractions = deleteExtractionsByMeetingAndType as ReturnType<typeof vi.fn>;
const mockInsertExtractions = insertExtractions as ReturnType<typeof vi.fn>;

const MEETING_ID = "meeting-uuid-1";

const baseContext = {
  title: "Strategy sync",
  meeting_type: "strategy",
  party_type: "internal",
  meeting_date: "2026-04-18",
  participants: ["Stef", "Wouter"],
  speakerContext: null,
  entityContext: "",
};

const identifiedProjects: IdentifiedProject[] = [
  { project_name: "Klantportaal", project_id: "proj-1", confidence: 0.9 },
];

function makeOutput(risksLength = 2): RiskSpecialistOutput {
  return {
    risks: Array.from({ length: risksLength }, (_, i) => ({
      content: `Risk ${i + 1}`,
      theme: "Strategie",
      theme_project: "Algemeen",
      source_quote: "bewijs-quote",
      project: null,
      confidence: 0.8,
      metadata: {
        severity: "high",
        category: "strategic",
        jaip_impact_area: "strategy",
        raised_by: "Wouter",
      },
      reasoning: "test-reasoning",
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDeleteExtractions.mockResolvedValue({ success: true });
  mockInsertExtractions.mockResolvedValue({ count: 0 });
});

describe("runRiskSpecialistStep", () => {
  it("schrijft bij success naar ZOWEL extractions-tabel (UI) ALS audit-tabel", async () => {
    mockRun.mockResolvedValue({
      output: makeOutput(3),
      metrics: {
        latency_ms: 2500,
        input_tokens: 8000,
        output_tokens: 1200,
        reasoning_tokens: 900,
      },
    });
    mockAuditInsert.mockResolvedValue({ success: true, id: "exp-1" });
    mockInsertExtractions.mockResolvedValue({ count: 3 });

    await runRiskSpecialistStep(MEETING_ID, "transcript", baseContext, identifiedProjects);

    // Audit-rij (telemetrie)
    expect(mockAuditInsert).toHaveBeenCalledTimes(1);
    const auditPayload = mockAuditInsert.mock.calls[0][0];
    expect(auditPayload.meeting_id).toBe(MEETING_ID);
    expect(auditPayload.model).toBe(RISK_SPECIALIST_MODEL);
    expect(auditPayload.prompt_version).toBe(RISK_SPECIALIST_PROMPT_VERSION);
    expect(auditPayload.risks).toHaveLength(3);
    expect(auditPayload.latency_ms).toBe(2500);
    expect(auditPayload.error).toBeNull();

    // Productie-pad (UI): observable via DB-grens. Eerst delete-by-meeting,
    // daarna insert van 3 risk-rijen.
    expect(mockDeleteExtractions).toHaveBeenCalledWith(MEETING_ID, "risk");
    expect(mockInsertExtractions).toHaveBeenCalledTimes(1);
    const insertedRows = mockInsertExtractions.mock.calls[0][0];
    expect(insertedRows).toHaveLength(3);
    expect(insertedRows[0].meeting_id).toBe(MEETING_ID);
    expect(insertedRows[0].type).toBe("risk");
  });

  it("faalt extractions-save zelfstandig zonder audit te blokkeren", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockRun.mockResolvedValue({
      output: makeOutput(1),
      metrics: { latency_ms: 1000, input_tokens: 100, output_tokens: 50, reasoning_tokens: 20 },
    });
    mockAuditInsert.mockResolvedValue({ success: true, id: "exp-2" });
    // Forceer een fout aan de DB-grens van de productie-pad save.
    mockInsertExtractions.mockRejectedValue(new Error("DB down"));

    await expect(
      runRiskSpecialistStep(MEETING_ID, "transcript", baseContext, identifiedProjects),
    ).resolves.toBeUndefined();

    expect(mockAuditInsert).toHaveBeenCalledTimes(1);
    expect(mockInsertExtractions).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it("faalt audit-save zelfstandig zonder de extractions-save te blokkeren", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockRun.mockResolvedValue({
      output: makeOutput(1),
      metrics: { latency_ms: 1000, input_tokens: 100, output_tokens: 50, reasoning_tokens: 20 },
    });
    mockAuditInsert.mockRejectedValue(new Error("audit table down"));
    mockInsertExtractions.mockResolvedValue({ count: 1 });

    await expect(
      runRiskSpecialistStep(MEETING_ID, "transcript", baseContext, identifiedProjects),
    ).resolves.toBeUndefined();

    // Productie-pad: delete + insert horen alsnog te draaien ondanks audit-fout.
    expect(mockDeleteExtractions).toHaveBeenCalledWith(MEETING_ID, "risk");
    expect(mockInsertExtractions).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it("slaat failure-row op bij agent-fout en throwt niet (non-blocking)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockRun.mockRejectedValue(new Error("Anthropic 429"));
    mockAuditInsert.mockResolvedValue({ success: true, id: "exp-err" });

    await expect(
      runRiskSpecialistStep(MEETING_ID, "transcript", baseContext, identifiedProjects),
    ).resolves.toBeUndefined();

    const payload = mockAuditInsert.mock.calls[0][0];
    expect(payload.error).toContain("Anthropic 429");
    expect(payload.risks).toEqual([]);
    // Bij agent-failure is er niks om in extractions te schrijven — geen
    // delete én geen insert mag gebeuren.
    expect(mockDeleteExtractions).not.toHaveBeenCalled();
    expect(mockInsertExtractions).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("slikt save-fout (double-fault) zonder throw — pipeline-stabiliteit primeert", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockRun.mockRejectedValue(new Error("Anthropic 500"));
    mockAuditInsert.mockRejectedValue(new Error("DB down"));

    await expect(
      runRiskSpecialistStep(MEETING_ID, "transcript", baseContext, identifiedProjects),
    ).resolves.toBeUndefined();

    consoleSpy.mockRestore();
  });

  it("werkt ook als agent 0 risks returnt (lege array != failure, save wordt alsnog aangeroepen)", async () => {
    mockRun.mockResolvedValue({
      output: { risks: [] },
      metrics: { latency_ms: 1200, input_tokens: 3000, output_tokens: 200, reasoning_tokens: 400 },
    });
    mockAuditInsert.mockResolvedValue({ success: true, id: "exp-0" });

    await runRiskSpecialistStep(MEETING_ID, "transcript", baseContext, identifiedProjects);

    expect(mockAuditInsert.mock.calls[0][0].risks).toEqual([]);
    // Idempotency-delete moet alsnog draaien (bestaande risks wissen wanneer
    // agent nu 0 returnt). Insert blijft over (0 rows → geen insert).
    expect(mockDeleteExtractions).toHaveBeenCalledWith(MEETING_ID, "risk");
    expect(mockInsertExtractions).not.toHaveBeenCalled();
  });
});
