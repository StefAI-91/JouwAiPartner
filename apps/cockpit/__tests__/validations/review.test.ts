import { describe, it, expect } from "vitest";
import {
  verifyMeetingSchema,
  verifyMeetingWithEditsSchema,
  rejectMeetingSchema,
} from "../../src/validations/review";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_UUID_2 = "660e8400-e29b-41d4-a716-446655440000";

describe("verifyMeetingSchema", () => {
  it("accepts valid UUID and returns correct data", () => {
    const result = verifyMeetingSchema.safeParse({ meetingId: VALID_UUID });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.meetingId).toBe(VALID_UUID);
    }
  });

  it("rejects non-UUID", () => {
    expect(verifyMeetingSchema.safeParse({ meetingId: "not-uuid" }).success).toBe(false);
  });

  it("rejects empty string", () => {
    expect(verifyMeetingSchema.safeParse({ meetingId: "" }).success).toBe(false);
  });
});

describe("verifyMeetingWithEditsSchema", () => {
  it("accepts valid input with all nested arrays", () => {
    const result = verifyMeetingWithEditsSchema.safeParse({
      meetingId: VALID_UUID,
      extractionEdits: [{ extractionId: VALID_UUID_2, content: "Updated content" }],
      rejectedExtractionIds: [VALID_UUID_2],
      typeChanges: [{ extractionId: VALID_UUID_2, type: "decision" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts with only meetingId", () => {
    expect(verifyMeetingWithEditsSchema.safeParse({ meetingId: VALID_UUID }).success).toBe(true);
  });

  it("rejects non-UUID meetingId", () => {
    expect(verifyMeetingWithEditsSchema.safeParse({ meetingId: "bad" }).success).toBe(false);
  });

  it("rejects non-UUID in extractionEdits.extractionId", () => {
    expect(
      verifyMeetingWithEditsSchema.safeParse({
        meetingId: VALID_UUID,
        extractionEdits: [{ extractionId: "bad" }],
      }).success,
    ).toBe(false);
  });

  it("rejects non-UUID in rejectedExtractionIds", () => {
    expect(
      verifyMeetingWithEditsSchema.safeParse({
        meetingId: VALID_UUID,
        rejectedExtractionIds: ["not-a-uuid"],
      }).success,
    ).toBe(false);
  });

  it("rejects non-UUID in typeChanges.extractionId", () => {
    expect(
      verifyMeetingWithEditsSchema.safeParse({
        meetingId: VALID_UUID,
        typeChanges: [{ extractionId: "bad", type: "decision" }],
      }).success,
    ).toBe(false);
  });

  it("rejects invalid type in typeChanges", () => {
    expect(
      verifyMeetingWithEditsSchema.safeParse({
        meetingId: VALID_UUID,
        typeChanges: [{ extractionId: VALID_UUID_2, type: "invalid_type" }],
      }).success,
    ).toBe(false);
  });

  it("accepts all valid type values in typeChanges", () => {
    for (const type of ["decision", "action_item", "need", "insight"]) {
      expect(
        verifyMeetingWithEditsSchema.safeParse({
          meetingId: VALID_UUID,
          typeChanges: [{ extractionId: VALID_UUID_2, type }],
        }).success,
      ).toBe(true);
    }
  });
});

describe("rejectMeetingSchema", () => {
  it("accepts valid input", () => {
    const result = rejectMeetingSchema.safeParse({
      meetingId: VALID_UUID,
      reason: "Low quality transcript",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe("Low quality transcript");
    }
  });

  it("rejects non-UUID meetingId", () => {
    expect(rejectMeetingSchema.safeParse({ meetingId: "bad", reason: "Reason" }).success).toBe(
      false,
    );
  });

  it("rejects empty reason", () => {
    expect(rejectMeetingSchema.safeParse({ meetingId: VALID_UUID, reason: "" }).success).toBe(
      false,
    );
  });
});
