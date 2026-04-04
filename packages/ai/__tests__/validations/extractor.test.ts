import { describe, it, expect } from "vitest";
import { ExtractionItemSchema, ExtractorOutputSchema } from "../../src/validations/extractor";

describe("ExtractionItemSchema", () => {
  it("accepts valid item with all type values", () => {
    for (const type of ["decision", "action_item", "need", "insight"] as const) {
      const result = ExtractionItemSchema.safeParse({
        type,
        content: "Some extracted content",
        confidence: 0.9,
        transcript_ref: "Quote from transcript",
        assignee: null,
        deadline: null,
        scope: null,
        project: null,
        made_by: null,
        client: null,
        urgency: null,
        category: null,
      });
      expect(result.success).toBe(true);
    }
  });

  it("requires confidence to be a number", () => {
    const result = ExtractionItemSchema.safeParse({
      type: "decision",
      content: "Content",
      confidence: "high",
      transcript_ref: null,
      assignee: null,
      deadline: null,
      scope: null,
      project: null,
      made_by: null,
      client: null,
      urgency: null,
      category: null,
    });
    expect(result.success).toBe(false);
  });

  it("accepts nullable fields (transcript_ref, assignee, deadline, scope, project, made_by, client, urgency, category)", () => {
    const result = ExtractionItemSchema.safeParse({
      type: "action_item",
      content: "Follow up",
      confidence: 0.85,
      transcript_ref: null,
      assignee: null,
      deadline: null,
      scope: null,
      project: null,
      made_by: null,
      client: null,
      urgency: null,
      category: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts non-null values for nullable fields", () => {
    const result = ExtractionItemSchema.safeParse({
      type: "action_item",
      content: "Complete report",
      confidence: 0.95,
      transcript_ref: "We need to complete the report",
      assignee: "John",
      deadline: "2025-02-01",
      scope: "project",
      project: "Platform v2",
      made_by: null,
      client: null,
      urgency: "high",
      category: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("ExtractorOutputSchema", () => {
  it("accepts valid output with extractions and entities", () => {
    const result = ExtractorOutputSchema.safeParse({
      extractions: [
        {
          type: "decision",
          content: "We decided to use Vitest",
          confidence: 0.9,
          transcript_ref: "Let's go with Vitest",
          assignee: null,
          deadline: null,
          scope: null,
          project: "Platform",
          made_by: "Stef",
          client: null,
          urgency: null,
          category: null,
        },
      ],
      entities: {
        projects: ["Platform v2"],
        clients: ["Acme Corp"],
      },
      primary_project: "Platform v2",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null for primary_project", () => {
    const result = ExtractorOutputSchema.safeParse({
      extractions: [],
      entities: { projects: [], clients: [] },
      primary_project: null,
    });
    expect(result.success).toBe(true);
  });
});
