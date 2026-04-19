import { describe, it, expect } from "vitest";
import {
  MeetingStructurerOutputSchema,
  KernpuntSchema,
  validateKernpuntMetadata,
  TYPE_METADATA_SCHEMAS,
} from "../../src/validations/meeting-structurer";
import { ALL_EXTRACTION_TYPES, TIER_1_TYPES, TIER_2_TYPES } from "../../src/extraction-types";

// Raw shape die Anthropic produceert: alle metadata-velden required,
// sentinels "n/a" / "" voor "niet van toepassing". Past bij de nieuwe
// strict schema (onder Anthropic's 16-union limiet).
const fullMetadata = {
  effort_estimate: "n/a",
  impact_area: "technical",
  severity: "n/a",
  jaip_impact_area: "n/a",
  party: "n/a",
  horizon: "n/a",
  sentiment: "n/a",
  signal_type: "n/a",
  sensitive: false,
  category: "n/a",
  scope: "n/a",
  status: "open",
  urgency: "n/a",
  direction: "n/a",
  domain: "n/a",
  follow_up_contact: "",
  assignee: "",
  deadline: "",
  decided_by: "Stef",
  raised_by: "",
  committer: "",
  committed_to: "",
  needs_answer_from: "",
  jaip_category: "",
  contact_channel: "",
  relationship_context: "",
};

const baseKernpunt = {
  type: "decision" as const,
  content: "Besloten om Supabase Auth te gebruiken voor CAI Studio.",
  theme: "Authenticatie",
  theme_project: "CAI Studio",
  source_quote: "We gaan met Supabase Auth werken.",
  project: "CAI Studio",
  confidence: 0.9,
  follow_up_context: "",
  reasoning: "Expliciet besluit genomen door Stef; eenduidige quote, geen ander type overwogen.",
  metadata: fullMetadata,
};

const baseOutput = {
  briefing: "Stef en Wouter bespraken auth-strategie voor CAI Studio.",
  kernpunten: [baseKernpunt],
  deelnemers: [{ name: "Stef", role: "Lead", organization: "JAIP", stance: "" }],
  entities: { clients: ["CAI"], people: [] },
};

describe("MeetingStructurerOutputSchema", () => {
  it("accepts a minimal valid output", () => {
    const result = MeetingStructurerOutputSchema.safeParse(baseOutput);
    expect(result.success).toBe(true);
  });

  it("rejects missing briefing", () => {
    const { briefing: _, ...rest } = baseOutput;
    expect(MeetingStructurerOutputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects unknown extraction type", () => {
    const bad = {
      ...baseOutput,
      kernpunten: [{ ...baseKernpunt, type: "totally_made_up" }],
    };
    expect(MeetingStructurerOutputSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts all 14 declared types in kernpunten", () => {
    const kernpunten = ALL_EXTRACTION_TYPES.map((type) => ({
      ...baseKernpunt,
      type,
    }));
    const result = MeetingStructurerOutputSchema.safeParse({ ...baseOutput, kernpunten });
    expect(result.success).toBe(true);
  });

  it("requires entities.clients and entities.people", () => {
    const bad = { ...baseOutput, entities: { clients: ["CAI"] } };
    expect(MeetingStructurerOutputSchema.safeParse(bad).success).toBe(false);
  });
});

describe("KernpuntSchema", () => {
  it("requires source_quote to be a string (no undefined)", () => {
    const { source_quote: _, ...rest } = baseKernpunt;
    expect(KernpuntSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects incomplete metadata (strict schema voor Anthropic 16-union limiet)", () => {
    // Schema is nu strict: alle 23 metadata-velden verplicht. Dit voorkomt
    // dat Anthropic de schema afwijst met "too many parameters with union
    // types". De TS publieke Kernpunt-type is losser (Partial) en wordt
    // door de agent gevuld uit "n/a"/"" sentinels.
    const k = { ...baseKernpunt, metadata: { whatever: "the agent emits" } };
    expect(KernpuntSchema.safeParse(k).success).toBe(false);
  });
});

describe("TYPE_METADATA_SCHEMAS coverage", () => {
  it("declares a metadata schema for every extraction type", () => {
    for (const t of ALL_EXTRACTION_TYPES) {
      expect(TYPE_METADATA_SCHEMAS[t]).toBeDefined();
    }
  });

  it("contains exactly the 9 Tier-1 types", () => {
    expect(TIER_1_TYPES).toHaveLength(9);
  });

  it("contains exactly the 5 Tier-2 types", () => {
    expect(TIER_2_TYPES).toHaveLength(5);
  });
});

describe("validateKernpuntMetadata", () => {
  it("returns ok=true for a valid risk metadata", () => {
    const result = validateKernpuntMetadata({
      type: "risk",
      metadata: { severity: "high", category: "technical" },
    });
    expect(result.ok).toBe(true);
  });

  it("returns ok=false when severity is not in the enum", () => {
    const result = validateKernpuntMetadata({
      type: "risk",
      metadata: { severity: "catastrophic", category: "technical" },
    });
    expect(result.ok).toBe(false);
  });

  it("accepts an empty metadata object for vision (all fields nullable)", () => {
    const result = validateKernpuntMetadata({ type: "vision", metadata: {} });
    expect(result.ok).toBe(true);
  });

  it("accepts an empty metadata object for tier-2 milestone", () => {
    const result = validateKernpuntMetadata({ type: "milestone", metadata: {} });
    expect(result.ok).toBe(true);
  });
});
