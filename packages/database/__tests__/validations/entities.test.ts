import { describe, it, expect } from "vitest";
import {
  updateOrganizationSchema,
  updateProjectSchema,
  updatePersonSchema,
  createExtractionSchema,
  updateExtractionSchema,
  deleteSchema,
  deleteWithContextSchema,
} from "../../src/validations/entities";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("updateOrganizationSchema", () => {
  it("accepts valid input and returns correct data shape", () => {
    const result = updateOrganizationSchema.safeParse({
      id: VALID_UUID,
      name: "Acme Corp",
      type: "client",
      status: "active",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(VALID_UUID);
      expect(result.data.name).toBe("Acme Corp");
    }
  });

  it("rejects non-UUID id", () => {
    const result = updateOrganizationSchema.safeParse({
      id: "not-a-uuid",
      name: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = updateOrganizationSchema.safeParse({
      id: VALID_UUID,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type enum value", () => {
    const result = updateOrganizationSchema.safeParse({
      id: VALID_UUID,
      type: "unknown_type",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status enum value", () => {
    const result = updateOrganizationSchema.safeParse({
      id: VALID_UUID,
      status: "deleted",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 200 characters", () => {
    const result = updateOrganizationSchema.safeParse({
      id: VALID_UUID,
      name: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects contact_person longer than 200 characters", () => {
    const result = updateOrganizationSchema.safeParse({
      id: VALID_UUID,
      contact_person: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("accepts null for email and contact_person", () => {
    const result = updateOrganizationSchema.safeParse({
      id: VALID_UUID,
      email: null,
      contact_person: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid type enum values", () => {
    for (const type of ["client", "partner", "supplier", "other"]) {
      expect(updateOrganizationSchema.safeParse({ id: VALID_UUID, type }).success).toBe(true);
    }
  });

  it("accepts all valid status enum values", () => {
    for (const status of ["prospect", "active", "inactive"]) {
      expect(updateOrganizationSchema.safeParse({ id: VALID_UUID, status }).success).toBe(true);
    }
  });
});

describe("updateProjectSchema", () => {
  it("rejects non-UUID id", () => {
    const result = updateProjectSchema.safeParse({ id: "bad", status: "lead" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 200 characters", () => {
    const result = updateProjectSchema.safeParse({
      id: VALID_UUID,
      name: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name when provided", () => {
    const result = updateProjectSchema.safeParse({
      id: VALID_UUID,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid status enum values", () => {
    const statuses = [
      "lead",
      "discovery",
      "proposal",
      "negotiation",
      "won",
      "kickoff",
      "in_progress",
      "review",
      "completed",
      "on_hold",
      "lost",
      "maintenance",
      "active",
    ];
    for (const status of statuses) {
      expect(updateProjectSchema.safeParse({ id: VALID_UUID, status }).success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    expect(updateProjectSchema.safeParse({ id: VALID_UUID, status: "invalid" }).success).toBe(
      false,
    );
  });

  it("rejects non-UUID organization_id", () => {
    const result = updateProjectSchema.safeParse({
      id: VALID_UUID,
      organization_id: "not-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null for organization_id", () => {
    const result = updateProjectSchema.safeParse({
      id: VALID_UUID,
      organization_id: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("updatePersonSchema", () => {
  it("rejects non-UUID id", () => {
    expect(updatePersonSchema.safeParse({ id: "bad" }).success).toBe(false);
  });

  it("rejects invalid email format", () => {
    expect(updatePersonSchema.safeParse({ id: VALID_UUID, email: "bad" }).success).toBe(false);
  });

  it("rejects role longer than 200 characters", () => {
    expect(updatePersonSchema.safeParse({ id: VALID_UUID, role: "a".repeat(201) }).success).toBe(
      false,
    );
  });

  it("rejects team longer than 200 characters", () => {
    expect(updatePersonSchema.safeParse({ id: VALID_UUID, team: "a".repeat(201) }).success).toBe(
      false,
    );
  });

  it("rejects non-UUID organization_id", () => {
    expect(updatePersonSchema.safeParse({ id: VALID_UUID, organization_id: "bad" }).success).toBe(
      false,
    );
  });

  it("accepts null for email, role, team", () => {
    const result = updatePersonSchema.safeParse({
      id: VALID_UUID,
      email: null,
      role: null,
      team: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("createExtractionSchema", () => {
  it("accepts valid input and returns correct data", () => {
    const result = createExtractionSchema.safeParse({
      meeting_id: VALID_UUID,
      type: "decision",
      content: "Important decision",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.meeting_id).toBe(VALID_UUID);
      expect(result.data.type).toBe("decision");
    }
  });

  it("rejects non-UUID meeting_id", () => {
    expect(
      createExtractionSchema.safeParse({
        meeting_id: "bad",
        type: "decision",
        content: "Content",
      }).success,
    ).toBe(false);
  });

  it("rejects empty content", () => {
    expect(
      createExtractionSchema.safeParse({
        meeting_id: VALID_UUID,
        type: "decision",
        content: "",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid type enum value", () => {
    expect(
      createExtractionSchema.safeParse({
        meeting_id: VALID_UUID,
        type: "unknown",
        content: "Content",
      }).success,
    ).toBe(false);
  });

  it("accepts all valid type enum values", () => {
    for (const type of ["decision", "action_item", "need", "insight"]) {
      expect(
        createExtractionSchema.safeParse({
          meeting_id: VALID_UUID,
          type,
          content: "Content",
        }).success,
      ).toBe(true);
    }
  });
});

describe("updateExtractionSchema", () => {
  it("rejects non-UUID id", () => {
    expect(updateExtractionSchema.safeParse({ id: "bad" }).success).toBe(false);
  });

  it("rejects empty content when provided", () => {
    expect(updateExtractionSchema.safeParse({ id: VALID_UUID, content: "" }).success).toBe(false);
  });

  it("rejects invalid type enum", () => {
    expect(updateExtractionSchema.safeParse({ id: VALID_UUID, type: "invalid" }).success).toBe(
      false,
    );
  });

  it("rejects non-UUID meetingId", () => {
    expect(updateExtractionSchema.safeParse({ id: VALID_UUID, meetingId: "bad" }).success).toBe(
      false,
    );
  });

  it("accepts with only id", () => {
    expect(updateExtractionSchema.safeParse({ id: VALID_UUID }).success).toBe(true);
  });
});

describe("deleteSchema", () => {
  it("accepts valid UUID", () => {
    expect(deleteSchema.safeParse({ id: VALID_UUID }).success).toBe(true);
  });

  it("rejects non-UUID", () => {
    expect(deleteSchema.safeParse({ id: "not-uuid" }).success).toBe(false);
  });
});

describe("deleteWithContextSchema", () => {
  it("accepts valid id with optional meetingId", () => {
    const result = deleteWithContextSchema.safeParse({
      id: VALID_UUID,
      meetingId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid id without meetingId", () => {
    expect(deleteWithContextSchema.safeParse({ id: VALID_UUID }).success).toBe(true);
  });

  it("rejects non-UUID meetingId", () => {
    expect(deleteWithContextSchema.safeParse({ id: VALID_UUID, meetingId: "bad" }).success).toBe(
      false,
    );
  });
});
