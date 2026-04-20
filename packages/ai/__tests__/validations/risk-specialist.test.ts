import { describe, it, expect } from "vitest";
import { RiskSpecialistRawOutputSchema } from "../../src/validations/risk-specialist";

const validRaw = {
  risks: [
    {
      content: "Bus-factor op Stef: single point of failure op pipeline-beheer.",
      theme: "Bus-factor",
      theme_project: "Algemeen",
      source_quote: "als ik omval valt alles stil",
      project: "",
      confidence: 0.8,
      metadata: {
        severity: "high",
        category: "team",
        jaip_impact_area: "delivery",
        raised_by: "Wouter",
      },
      reasoning:
        "Zelfkritiek van Stef met concrete quote; herhaald patroon over bus-factor. Overwogen als signal maar JAIP-delivery-dreiging maakt het risk.",
    },
  ],
};

describe("RiskSpecialistRawOutputSchema", () => {
  it("accepteert een minimaal valide output", () => {
    expect(RiskSpecialistRawOutputSchema.safeParse(validRaw).success).toBe(true);
  });

  it("rejects een onbekende severity", () => {
    const bad = {
      risks: [
        {
          ...validRaw.risks[0],
          metadata: { ...validRaw.risks[0].metadata, severity: "catastrophic" },
        },
      ],
    };
    expect(RiskSpecialistRawOutputSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects een ontbrekend metadata-veld", () => {
    const bad = {
      risks: [
        {
          ...validRaw.risks[0],
          metadata: { severity: "high", category: "team", jaip_impact_area: "delivery" },
        },
      ],
    };
    expect(RiskSpecialistRawOutputSchema.safeParse(bad).success).toBe(false);
  });

  it("accepteert lege risks-array", () => {
    expect(RiskSpecialistRawOutputSchema.safeParse({ risks: [] }).success).toBe(true);
  });

  it("accepteert 'n/a'-sentinels en lege strings", () => {
    const withSentinels = {
      risks: [
        {
          content: "Onzekere risk zonder quote.",
          theme: "",
          theme_project: "",
          source_quote: "",
          project: "",
          confidence: 0.0,
          metadata: {
            severity: "n/a",
            category: "n/a",
            jaip_impact_area: "n/a",
            raised_by: "",
          },
          reasoning: "",
        },
      ],
    };
    expect(RiskSpecialistRawOutputSchema.safeParse(withSentinels).success).toBe(true);
  });
});
