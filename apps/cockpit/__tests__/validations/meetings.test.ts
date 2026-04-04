import { describe, it, expect } from "vitest";
import {
  updateTitleSchema,
  updateMeetingTypeSchema,
  meetingProjectSchema,
  meetingParticipantSchema,
  createOrganizationSchema,
  createProjectSchema,
  createPersonSchema,
} from "../../src/validations/meetings";

describe("updateTitleSchema", () => {
  it("accepts valid input", () => {
    const result = updateTitleSchema.safeParse({
      meetingId: "abc123",
      title: "Sprint Review",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = updateTitleSchema.safeParse({
      meetingId: "abc123",
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title longer than 500 characters", () => {
    const result = updateTitleSchema.safeParse({
      meetingId: "abc123",
      title: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts title of exactly 500 characters", () => {
    const result = updateTitleSchema.safeParse({
      meetingId: "abc123",
      title: "a".repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty meetingId", () => {
    const result = updateTitleSchema.safeParse({
      meetingId: "",
      title: "Valid title",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateMeetingTypeSchema", () => {
  it("accepts all valid enum values", () => {
    const types = [
      "strategy", "one_on_one", "team_sync", "discovery",
      "sales", "project_kickoff", "status_update", "collaboration", "other",
    ];
    for (const meetingType of types) {
      const result = updateMeetingTypeSchema.safeParse({
        meetingId: "abc123",
        meetingType,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid meeting type", () => {
    const result = updateMeetingTypeSchema.safeParse({
      meetingId: "abc123",
      meetingType: "invalid_type",
    });
    expect(result.success).toBe(false);
  });
});

describe("meetingProjectSchema", () => {
  it("accepts valid input", () => {
    const result = meetingProjectSchema.safeParse({
      meetingId: "abc123",
      projectId: "proj456",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty meetingId", () => {
    const result = meetingProjectSchema.safeParse({
      meetingId: "",
      projectId: "proj456",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty projectId", () => {
    const result = meetingProjectSchema.safeParse({
      meetingId: "abc123",
      projectId: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("meetingParticipantSchema", () => {
  it("accepts valid input", () => {
    const result = meetingParticipantSchema.safeParse({
      meetingId: "abc123",
      personId: "person789",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty meetingId", () => {
    const result = meetingParticipantSchema.safeParse({
      meetingId: "",
      personId: "person789",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty personId", () => {
    const result = meetingParticipantSchema.safeParse({
      meetingId: "abc123",
      personId: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("createOrganizationSchema", () => {
  it("accepts valid input with name and optional type", () => {
    const result = createOrganizationSchema.safeParse({
      name: "New Corp",
      type: "client",
    });
    expect(result.success).toBe(true);
  });

  it("accepts without type", () => {
    const result = createOrganizationSchema.safeParse({ name: "New Corp" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createOrganizationSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

describe("createProjectSchema", () => {
  it("accepts valid input with name and optional organizationId", () => {
    const result = createProjectSchema.safeParse({
      name: "New Project",
      organizationId: "some-id",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null for organizationId", () => {
    const result = createProjectSchema.safeParse({
      name: "Project",
      organizationId: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("createPersonSchema", () => {
  it("accepts valid input with all fields", () => {
    const result = createPersonSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      role: "Developer",
      organizationId: "org-123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", () => {
    const result = createPersonSchema.safeParse({
      name: "Jane",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null for email", () => {
    const result = createPersonSchema.safeParse({
      name: "Jane",
      email: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts with only name", () => {
    const result = createPersonSchema.safeParse({ name: "Jane" });
    expect(result.success).toBe(true);
  });
});
