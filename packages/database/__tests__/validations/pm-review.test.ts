import { describe, it, expect } from "vitest";
import { pmReviewActionSchema } from "../../src/validations/issues";

const VALID_UUID = "11111111-1111-4111-8111-111111111111";

// CC-001 — pmReviewActionSchema is een discriminated union met 4 paden.
// Validatie zit in de Server Action (vóór de mutation), dus deze schema
// vormt de eerste lijn tegen geknoeide form-payloads.

describe("pmReviewActionSchema — endorse", () => {
  it("accepteert minimale payload", () => {
    const result = pmReviewActionSchema.safeParse({
      action: "endorse",
      issueId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it("rejecteert ongeldige issueId", () => {
    const result = pmReviewActionSchema.safeParse({
      action: "endorse",
      issueId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});

describe("pmReviewActionSchema — decline", () => {
  it("accepteert reden van >=10 chars", () => {
    const result = pmReviewActionSchema.safeParse({
      action: "decline",
      issueId: VALID_UUID,
      declineReason: "scope-creep, niet binnen budget",
    });
    expect(result.success).toBe(true);
  });

  it("rejecteert te korte reden (<10 chars)", () => {
    const result = pmReviewActionSchema.safeParse({
      action: "decline",
      issueId: VALID_UUID,
      declineReason: "kort",
    });
    expect(result.success).toBe(false);
  });

  it("rejecteert ontbrekende reden", () => {
    const result = pmReviewActionSchema.safeParse({
      action: "decline",
      issueId: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });

  it("rejecteert te lange reden (>1000 chars)", () => {
    const result = pmReviewActionSchema.safeParse({
      action: "decline",
      issueId: VALID_UUID,
      declineReason: "x".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

describe("pmReviewActionSchema — defer", () => {
  it("accepteert minimale payload", () => {
    const result = pmReviewActionSchema.safeParse({
      action: "defer",
      issueId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });
});

describe("pmReviewActionSchema — convert", () => {
  it("accepteert vraag-body van >=10 chars", () => {
    const result = pmReviewActionSchema.safeParse({
      action: "convert",
      issueId: VALID_UUID,
      questionBody: "Kun je beschrijven welke stap precies misgaat?",
    });
    expect(result.success).toBe(true);
  });

  it("rejecteert te korte vraag-body (<10 chars)", () => {
    const result = pmReviewActionSchema.safeParse({
      action: "convert",
      issueId: VALID_UUID,
      questionBody: "kort",
    });
    expect(result.success).toBe(false);
  });
});

describe("pmReviewActionSchema — onbekende action", () => {
  it("rejecteert onbekende action", () => {
    const result = pmReviewActionSchema.safeParse({
      action: "delete",
      issueId: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });
});
