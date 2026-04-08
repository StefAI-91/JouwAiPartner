import { describe, it, expect } from "vitest";
import { ExtractionItemSchema, ExtractorOutputSchema } from "../../src/validations/extractor";

const validItem = {
  type: "action_item" as const,
  category: "wachten_op_extern" as const,
  content: "Opvolgen bij Jan (Acme): levert projectplan aan — nodig voor kickoff",
  confidence: 0.9,
  transcript_ref: null,
  follow_up_contact: "Jan van Acme",
  assignee: null,
  deadline: null,
  suggested_deadline: null,
  effort_estimate: "small" as const,
  deadline_reasoning: "Geen expliciete deadline. Default +5 werkdagen vanaf meeting.",
  scope: null,
  project: null,
};

describe("ExtractionItemSchema", () => {
  it("accepts valid item and returns correct data", () => {
    const result = ExtractionItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("action_item");
      expect(result.data.content).toBe(
        "Opvolgen bij Jan (Acme): levert projectplan aan — nodig voor kickoff",
      );
    }
  });

  it("rejects invalid type (only action_item allowed)", () => {
    expect(ExtractionItemSchema.safeParse({ ...validItem, type: "decision" }).success).toBe(false);
  });

  it("requires confidence to be a number", () => {
    expect(ExtractionItemSchema.safeParse({ ...validItem, confidence: "high" }).success).toBe(
      false,
    );
  });

  it("rejects missing required fields", () => {
    expect(ExtractionItemSchema.safeParse({}).success).toBe(false);
    expect(ExtractionItemSchema.safeParse({ type: "action_item" }).success).toBe(false);
  });

  it("rejects invalid scope enum value", () => {
    expect(ExtractionItemSchema.safeParse({ ...validItem, scope: "global" }).success).toBe(false);
  });

  it("accepts valid scope values", () => {
    for (const scope of ["project", "personal"]) {
      expect(ExtractionItemSchema.safeParse({ ...validItem, scope }).success).toBe(true);
    }
  });

  it("accepts valid category values", () => {
    for (const category of ["wachten_op_extern", "wachten_op_beslissing"]) {
      expect(ExtractionItemSchema.safeParse({ ...validItem, category }).success).toBe(true);
    }
  });

  it("rejects invalid category (including legacy values)", () => {
    expect(ExtractionItemSchema.safeParse({ ...validItem, category: "other" }).success).toBe(false);
    expect(ExtractionItemSchema.safeParse({ ...validItem, category: "wij_leveren" }).success).toBe(
      false,
    );
    expect(
      ExtractionItemSchema.safeParse({ ...validItem, category: "wij_volgen_op" }).success,
    ).toBe(false);
  });

  it("requires follow_up_contact", () => {
    const { follow_up_contact, ...withoutContact } = validItem;
    expect(ExtractionItemSchema.safeParse(withoutContact).success).toBe(false);
  });

  it("accepts valid effort_estimate values", () => {
    for (const effort_estimate of ["small", "medium", "large"]) {
      expect(ExtractionItemSchema.safeParse({ ...validItem, effort_estimate }).success).toBe(true);
    }
  });

  it("requires deadline_reasoning", () => {
    const { deadline_reasoning, ...withoutReasoning } = validItem;
    expect(ExtractionItemSchema.safeParse(withoutReasoning).success).toBe(false);
  });

  it("accepts all nullable fields as null", () => {
    const result = ExtractionItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
  });

  it("accepts non-null values for nullable fields", () => {
    const result = ExtractionItemSchema.safeParse({
      ...validItem,
      transcript_ref: "We need to complete the report",
      assignee: "Stef",
      deadline: "2025-02-01",
      suggested_deadline: "2025-02-05",
      scope: "project",
      project: "Platform v2",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assignee).toBe("Stef");
      expect(result.data.scope).toBe("project");
    }
  });
});

describe("ExtractorOutputSchema", () => {
  it("accepts valid output with extractions and entities (clients only)", () => {
    const result = ExtractorOutputSchema.safeParse({
      extractions: [validItem],
      entities: {
        clients: ["Acme Corp"],
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entities.clients).toContain("Acme Corp");
    }
  });

  it("accepts empty extractions and clients", () => {
    const result = ExtractorOutputSchema.safeParse({
      extractions: [],
      entities: { clients: [] },
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing entities", () => {
    expect(
      ExtractorOutputSchema.safeParse({
        extractions: [],
      }).success,
    ).toBe(false);
  });

  it("no longer requires projects or primary_project", () => {
    // Verify projects and primary_project are not in the schema
    const result = ExtractorOutputSchema.safeParse({
      extractions: [],
      entities: { clients: [] },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("primary_project");
      expect(result.data.entities).not.toHaveProperty("projects");
    }
  });
});
