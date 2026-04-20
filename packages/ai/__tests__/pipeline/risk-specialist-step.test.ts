import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/agents/risk-specialist", async () => {
  const actual = await vi.importActual<typeof import("../../src/agents/risk-specialist")>(
    "../../src/agents/risk-specialist",
  );
  return {
    ...actual,
    runRiskSpecialist: vi.fn(),
  };
});
vi.mock("@repo/database/mutations/experimental-risk-extractions", () => ({
  insertExperimentalRiskExtraction: vi.fn(),
}));
vi.mock("../../src/pipeline/save-risk-extractions", () => ({
  saveRiskExtractions: vi.fn(),
}));

import { runRiskSpecialistStep } from "../../src/pipeline/steps/risk-specialist";
import {
  runRiskSpecialist,
  RISK_SPECIALIST_MODEL,
  RISK_SPECIALIST_PROMPT_VERSION,
} from "../../src/agents/risk-specialist";
import { insertExperimentalRiskExtraction } from "@repo/database/mutations/experimental-risk-extractions";
import { saveRiskExtractions } from "../../src/pipeline/save-risk-extractions";
import type { RiskSpecialistOutput } from "../../src/validations/risk-specialist";
import type { IdentifiedProject } from "../../src/validations/gatekeeper";

const mockRun = runRiskSpecialist as ReturnType<typeof vi.fn>;
const mockAuditInsert = insertExperimentalRiskExtraction as ReturnType<typeof vi.fn>;
const mockSave = saveRiskExtractions as ReturnType<typeof vi.fn>;

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
  mockSave.mockResolvedValue({ extractions_saved: 0, projects_linked: 0 });
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
    mockSave.mockResolvedValue({ extractions_saved: 3, projects_linked: 1 });

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

    // Productie-pad (UI)
    expect(mockSave).toHaveBeenCalledTimes(1);
    const saveArgs = mockSave.mock.calls[0];
    expect(saveArgs[0].risks).toHaveLength(3);
    expect(saveArgs[1]).toBe(MEETING_ID);
    expect(saveArgs[2]).toEqual(identifiedProjects);
  });

  it("faalt extractions-save zelfstandig zonder audit te blokkeren", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockRun.mockResolvedValue({
      output: makeOutput(1),
      metrics: { latency_ms: 1000, input_tokens: 100, output_tokens: 50, reasoning_tokens: 20 },
    });
    mockAuditInsert.mockResolvedValue({ success: true, id: "exp-2" });
    mockSave.mockRejectedValue(new Error("DB down"));

    await expect(
      runRiskSpecialistStep(MEETING_ID, "transcript", baseContext, identifiedProjects),
    ).resolves.toBeUndefined();

    expect(mockAuditInsert).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it("faalt audit-save zelfstandig zonder de extractions-save te blokkeren", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockRun.mockResolvedValue({
      output: makeOutput(1),
      metrics: { latency_ms: 1000, input_tokens: 100, output_tokens: 50, reasoning_tokens: 20 },
    });
    mockAuditInsert.mockRejectedValue(new Error("audit table down"));
    mockSave.mockResolvedValue({ extractions_saved: 1, projects_linked: 0 });

    await expect(
      runRiskSpecialistStep(MEETING_ID, "transcript", baseContext, identifiedProjects),
    ).resolves.toBeUndefined();

    expect(mockSave).toHaveBeenCalledTimes(1);
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
    // Bij agent-failure is er niks om in extractions te schrijven.
    expect(mockSave).not.toHaveBeenCalled();

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
    mockSave.mockResolvedValue({ extractions_saved: 0, projects_linked: 0 });

    await runRiskSpecialistStep(MEETING_ID, "transcript", baseContext, identifiedProjects);

    expect(mockAuditInsert.mock.calls[0][0].risks).toEqual([]);
    // Save wordt toch aangeroepen om de idempotency-delete te laten lopen
    // (bestaande risks wissen als agent nu 0 zegt).
    expect(mockSave).toHaveBeenCalledTimes(1);
  });
});
