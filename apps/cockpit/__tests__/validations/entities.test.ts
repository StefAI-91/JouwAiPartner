import { describe, it, expect } from "vitest";
import {
  updateOrganizationSchema,
  updateProjectSchema,
  updatePersonSchema,
  createExtractionSchema,
  updateExtractionSchema,
  deleteSchema,
} from "../../src/validations/entities";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("updateOrganizationSchema", () => {
  it("accepts valid input with id and optional fields", () => {
    const result = updateOrganizationSchema.safeParse({
      id: VALID_UUID,
      name: "Acme Corp",
      type: "client",
      status: "active",
      contact_person: "John Doe",
      email: "john@acme.com",
    });
    expect(result.success).toBe(true);
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

  it("accepts null for email", () => {
    const result = updateOrganizationSchema.safeParse({
      id: VALID_UUID,
      email: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid type enum values", () => {
    for (const type of ["client", "partner", "supplier", "other"]) {
      const result = updateOrganizationSchema.safeParse({ id: VALID_UUID, type });
      expect(result.success).toBe(true);
    }
  });
});

describe("updateProjectSchema", () => {
  it("accepts valid input with all status enum values", () => {
    const statuses = [
      "lead", "discovery", "proposal", "negotiation", "won",
      "kickoff", "in_progress", "review", "completed",
      "on_hold", "lost", "maintenance", "active",
    ];
    for (const status of statuses) {
      const result = updateProjectSchema.safeParse({ id: VALID_UUID, status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    const result = updateProjectSchema.safeParse({
      id: VALID_UUID,
      status: "invalid_status",
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
  it("accepts valid input with optional fields", () => {
    const result = updatePersonSchema.safeParse({
      id: VALID_UUID,
      name: "Jane Doe",
      email: "jane@example.com",
      role: "Developer",
      team: "Engineering",
      organization_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
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

  it("rejects invalid email format", () => {
    const result = updatePersonSchema.safeParse({
      id: VALID_UUID,
      email: "bad-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("createExtractionSchema", () => {
  it("accepts valid input with all type enum values", () => {
    for (const type of ["decision", "action_item", "need", "insight"]) {
      const result = createExtractionSchema.safeParse({
        meeting_id: VALID_UUID,
        type,
        content: "Some extraction content",
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects empty content", () => {
    const result = createExtractionSchema.safeParse({
      meeting_id: VALID_UUID,
      type: "decision",
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null for transcript_ref", () => {
    const result = createExtractionSchema.safeParse({
      meeting_id: VALID_UUID,
      type: "decision",
      content: "Content",
      transcript_ref: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("updateExtractionSchema", () => {
  it("accepts valid input with optional fields", () => {
    const result = updateExtractionSchema.safeParse({
      id: VALID_UUID,
      content: "Updated content",
      type: "need",
      transcript_ref: "some ref",
      meetingId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it("accepts with only id", () => {
    const result = updateExtractionSchema.safeParse({ id: VALID_UUID });
    expect(result.success).toBe(true);
  });
});

describe("deleteSchema", () => {
  it("accepts valid UUID", () => {
    const result = deleteSchema.safeParse({ id: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID", () => {
    const result = deleteSchema.safeParse({ id: "not-uuid" });
    expect(result.success).toBe(false);
  });
});
