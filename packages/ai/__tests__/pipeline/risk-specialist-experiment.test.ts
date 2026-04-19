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

import { runRiskSpecialistExperiment } from "../../src/pipeline/steps/risk-specialist-experiment";
import {
  runRiskSpecialist,
  RISK_SPECIALIST_PROMPT_VERSION,
} from "../../src/agents/risk-specialist";
import { insertExperimentalRiskExtraction } from "@repo/database/mutations/experimental-risk-extractions";
import type { RiskSpecialistOutput } from "../../src/validations/risk-specialist";

const mockRun = runRiskSpecialist as ReturnType<typeof vi.fn>;
const mockInsert = insertExperimentalRiskExtraction as ReturnType<typeof vi.fn>;

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
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runRiskSpecialistExperiment", () => {
  it("slaat risks + metrics op bij success", async () => {
    mockRun.mockResolvedValue({
      output: makeOutput(3),
      metrics: {
        latency_ms: 2500,
        input_tokens: 8000,
        output_tokens: 1200,
        reasoning_tokens: 900,
      },
    });
    mockInsert.mockResolvedValue({ success: true, id: "exp-1" });

    await runRiskSpecialistExperiment(MEETING_ID, "transcript", baseContext);

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const payload = mockInsert.mock.calls[0][0];
    expect(payload.meeting_id).toBe(MEETING_ID);
    expect(payload.model).toBe("claude-haiku-4-5-20251001");
    expect(payload.prompt_version).toBe(RISK_SPECIALIST_PROMPT_VERSION);
    expect(payload.risks).toHaveLength(3);
    expect(payload.latency_ms).toBe(2500);
    expect(payload.input_tokens).toBe(8000);
    expect(payload.output_tokens).toBe(1200);
    expect(payload.reasoning_tokens).toBe(900);
    expect(payload.error).toBeNull();
  });

  it("slaat failure-row op bij agent-fout en throwt niet (non-blocking)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockRun.mockRejectedValue(new Error("Anthropic 429"));
    mockInsert.mockResolvedValue({ success: true, id: "exp-err" });

    // Verwacht: functie throwt NIET — hoofdpipeline mag niet afbreken.
    await expect(
      runRiskSpecialistExperiment(MEETING_ID, "transcript", baseContext),
    ).resolves.toBeUndefined();

    const payload = mockInsert.mock.calls[0][0];
    expect(payload.meeting_id).toBe(MEETING_ID);
    expect(payload.error).toContain("Anthropic 429");
    expect(payload.risks).toEqual([]);

    consoleSpy.mockRestore();
  });

  it("slikt save-fout (double-fault) zonder throw — pipeline-stabiliteit primeert", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockRun.mockRejectedValue(new Error("Anthropic 500"));
    mockInsert.mockRejectedValue(new Error("DB down"));

    await expect(
      runRiskSpecialistExperiment(MEETING_ID, "transcript", baseContext),
    ).resolves.toBeUndefined();

    consoleSpy.mockRestore();
  });

  it("werkt ook als agent 0 risks returnt (lege array != failure)", async () => {
    mockRun.mockResolvedValue({
      output: { risks: [] },
      metrics: {
        latency_ms: 1200,
        input_tokens: 3000,
        output_tokens: 200,
        reasoning_tokens: 400,
      },
    });
    mockInsert.mockResolvedValue({ success: true, id: "exp-0" });

    await runRiskSpecialistExperiment(MEETING_ID, "transcript", baseContext);

    const payload = mockInsert.mock.calls[0][0];
    expect(payload.risks).toEqual([]);
    expect(payload.error).toBeNull();
  });
});
