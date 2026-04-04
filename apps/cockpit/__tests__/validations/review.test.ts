import { describe, it, expect } from "vitest";
import {
  verifyMeetingSchema,
  verifyMeetingWithEditsSchema,
  rejectMeetingSchema,
} from "../../src/validations/review";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_UUID_2 = "660e8400-e29b-41d4-a716-446655440000";

describe("verifyMeetingSchema", () => {
  it("accepts valid UUID", () => {
    const result = verifyMeetingSchema.safeParse({ meetingId: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID", () => {
    const result = verifyMeetingSchema.safeParse({ meetingId: "not-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("verifyMeetingWithEditsSchema", () => {
  it("accepts valid input with extractionEdits and typeChanges", () => {
    const result = verifyMeetingWithEditsSchema.safeParse({
      meetingId: VALID_UUID,
      extractionEdits: [
        { extractionId: VALID_UUID_2, content: "Updated content" },
      ],
      rejectedExtractionIds: [VALID_UUID_2],
      typeChanges: [
        { extractionId: VALID_UUID_2, type: "decision" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts with only meetingId (all arrays optional)", () => {
    const result = verifyMeetingWithEditsSchema.safeParse({
      meetingId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid type in typeChanges", () => {
    const result = verifyMeetingWithEditsSchema.safeParse({
      meetingId: VALID_UUID,
      typeChanges: [
        { extractionId: VALID_UUID_2, type: "invalid_type" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid type values in typeChanges", () => {
    for (const type of ["decision", "action_item", "need", "insight"]) {
      const result = verifyMeetingWithEditsSchema.safeParse({
        meetingId: VALID_UUID,
        typeChanges: [{ extractionId: VALID_UUID_2, type }],
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts extractionEdits with metadata", () => {
    const result = verifyMeetingWithEditsSchema.safeParse({
      meetingId: VALID_UUID,
      extractionEdits: [
        { extractionId: VALID_UUID_2, metadata: { key: "value" } },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("rejectMeetingSchema", () => {
  it("accepts valid input", () => {
    const result = rejectMeetingSchema.safeParse({
      meetingId: VALID_UUID,
      reason: "Low quality transcript",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty reason", () => {
    const result = rejectMeetingSchema.safeParse({
      meetingId: VALID_UUID,
      reason: "",
    });
    expect(result.success).toBe(false);
  });
});
