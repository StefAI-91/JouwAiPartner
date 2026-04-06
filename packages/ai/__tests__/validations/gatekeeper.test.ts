import { describe, it, expect } from "vitest";
import { GatekeeperSchema, MEETING_TYPES } from "../../src/validations/gatekeeper";

describe("GatekeeperSchema", () => {
  it("accepts valid output with all meeting_type values", () => {
    for (const meeting_type of MEETING_TYPES) {
      const result = GatekeeperSchema.safeParse({
        relevance_score: 0.8,
        reason: "Important business meeting",
        meeting_type,
        organization_name: "Acme Corp",
      });
      expect(result.success).toBe(true);
    }
  });

  it("requires relevance_score to be a number", () => {
    const result = GatekeeperSchema.safeParse({
      relevance_score: "high",
      reason: "Some reason",
      meeting_type: "team_sync",
      organization_name: null,
    });
    expect(result.success).toBe(false);
  });

  it("accepts null for organization_name", () => {
    const result = GatekeeperSchema.safeParse({
      relevance_score: 0.5,
      reason: "Internal meeting",
      meeting_type: "team_sync",
      organization_name: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid meeting_type", () => {
    const result = GatekeeperSchema.safeParse({
      relevance_score: 0.5,
      reason: "Reason",
      meeting_type: "invalid_type",
      organization_name: null,
    });
    expect(result.success).toBe(false);
  });
});
