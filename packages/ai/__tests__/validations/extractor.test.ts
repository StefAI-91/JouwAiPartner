import { describe, it, expect } from "vitest";
import { ExtractionItemSchema, ExtractorOutputSchema } from "../../src/validations/extractor";

const validItem = {
  type: "action_item" as const,
  content: "Follow up with client about proposal",
  confidence: 0.9,
  transcript_ref: null,
  assignee: null,
  deadline: null,
  scope: null,
  project: null,
};

describe("ExtractionItemSchema", () => {
  it("accepts valid item and returns correct data", () => {
    const result = ExtractionItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("action_item");
      expect(result.data.content).toBe("Follow up with client about proposal");
    }
  });

  it("rejects invalid type (only action_item allowed)", () => {
    expect(
      ExtractionItemSchema.safeParse({ ...validItem, type: "decision" }).success,
    ).toBe(false);
  });

  it("requires confidence to be a number", () => {
    expect(
      ExtractionItemSchema.safeParse({ ...validItem, confidence: "high" }).success,
    ).toBe(false);
  });

  it("rejects missing required fields", () => {
    expect(ExtractionItemSchema.safeParse({}).success).toBe(false);
    expect(ExtractionItemSchema.safeParse({ type: "action_item" }).success).toBe(false);
  });

  it("rejects invalid scope enum value", () => {
    expect(
      ExtractionItemSchema.safeParse({ ...validItem, scope: "global" }).success,
    ).toBe(false);
  });

  it("accepts valid scope values", () => {
    for (const scope of ["project", "personal"]) {
      expect(ExtractionItemSchema.safeParse({ ...validItem, scope }).success).toBe(true);
    }
  });

  it("accepts all nullable fields as null", () => {
    const result = ExtractionItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
  });

  it("accepts non-null values for nullable fields", () => {
    const result = ExtractionItemSchema.safeParse({
      ...validItem,
      transcript_ref: "We need to complete the report",
      assignee: "John",
      deadline: "2025-02-01",
      scope: "project",
      project: "Platform v2",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assignee).toBe("John");
      expect(result.data.scope).toBe("project");
    }
  });
});

describe("ExtractorOutputSchema", () => {
  it("accepts valid output with extractions and entities", () => {
    const result = ExtractorOutputSchema.safeParse({
      extractions: [validItem],
      entities: {
        projects: ["Platform v2"],
        clients: ["Acme Corp"],
      },
      primary_project: "Platform v2",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.primary_project).toBe("Platform v2");
      expect(result.data.entities.projects).toContain("Platform v2");
    }
  });

  it("accepts null for primary_project", () => {
    const result = ExtractorOutputSchema.safeParse({
      extractions: [],
      entities: { projects: [], clients: [] },
      primary_project: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing entities", () => {
    expect(
      ExtractorOutputSchema.safeParse({
        extractions: [],
        primary_project: null,
      }).success,
    ).toBe(false);
  });
});
