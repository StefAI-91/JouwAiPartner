import { describe, it, expect } from "vitest";
import {
  GatekeeperSchema,
  IdentifiedProjectSchema,
  MEETING_TYPES,
} from "../../src/validations/gatekeeper";

const validBase = {
  relevance_score: 0.8,
  reason: "Important business meeting",
  meeting_type: "team_sync" as const,
  organization_name: null,
  identified_projects: [],
};

describe("GatekeeperSchema", () => {
  it("accepts valid output with all meeting_type values", () => {
    for (const meeting_type of MEETING_TYPES) {
      const result = GatekeeperSchema.safeParse({
        ...validBase,
        meeting_type,
        organization_name: "Acme Corp",
      });
      expect(result.success).toBe(true);
    }
  });

  it("requires relevance_score to be a number", () => {
    const result = GatekeeperSchema.safeParse({
      ...validBase,
      relevance_score: "high",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null for organization_name", () => {
    const result = GatekeeperSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("rejects invalid meeting_type", () => {
    const result = GatekeeperSchema.safeParse({
      ...validBase,
      meeting_type: "invalid_type",
    });
    expect(result.success).toBe(false);
  });

  it("accepts identified_projects with known project_id", () => {
    const result = GatekeeperSchema.safeParse({
      ...validBase,
      identified_projects: [
        {
          project_name: "Klantportaal",
          project_id: "550e8400-e29b-41d4-a716-446655440000",
          confidence: 0.95,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts identified_projects with null project_id (unknown project)", () => {
    const result = GatekeeperSchema.safeParse({
      ...validBase,
      identified_projects: [
        { project_name: "Nieuw intern project", project_id: null, confidence: 0.7 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty identified_projects array", () => {
    const result = GatekeeperSchema.safeParse({
      ...validBase,
      identified_projects: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts multiple identified_projects", () => {
    const result = GatekeeperSchema.safeParse({
      ...validBase,
      identified_projects: [
        {
          project_name: "Klantportaal",
          project_id: "550e8400-e29b-41d4-a716-446655440000",
          confidence: 0.95,
        },
        { project_name: "Onbekend project", project_id: null, confidence: 0.6 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects identified_projects item without project_name", () => {
    const result = GatekeeperSchema.safeParse({
      ...validBase,
      identified_projects: [{ project_id: null, confidence: 0.5 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects identified_projects item without confidence", () => {
    const result = GatekeeperSchema.safeParse({
      ...validBase,
      identified_projects: [{ project_name: "Test", project_id: null }],
    });
    expect(result.success).toBe(false);
  });
});

describe("IdentifiedProjectSchema", () => {
  it("accepts valid identified project with id", () => {
    const result = IdentifiedProjectSchema.safeParse({
      project_name: "Klantportaal",
      project_id: "some-uuid",
      confidence: 0.9,
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid identified project with null id", () => {
    const result = IdentifiedProjectSchema.safeParse({
      project_name: "Onbekend",
      project_id: null,
      confidence: 0.5,
    });
    expect(result.success).toBe(true);
  });
});
