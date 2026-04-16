import { describe, it, expect } from "vitest";
import {
  updateTitleSchema,
  updateMeetingTypeSchema,
  updateMeetingOrganizationSchema,
  meetingProjectSchema,
  meetingParticipantSchema,
  createOrganizationSchema,
  createProjectSchema,
  createPersonSchema,
} from "../../src/validations/meetings";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_UUID_2 = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

describe("updateTitleSchema", () => {
  it("accepts valid input and returns correct data", () => {
    const result = updateTitleSchema.safeParse({
      meetingId: VALID_UUID,
      title: "Sprint Review",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Sprint Review");
    }
  });

  it("rejects empty title", () => {
    expect(updateTitleSchema.safeParse({ meetingId: VALID_UUID, title: "" }).success).toBe(false);
  });

  it("rejects title longer than 500 characters", () => {
    expect(
      updateTitleSchema.safeParse({ meetingId: VALID_UUID, title: "a".repeat(501) }).success,
    ).toBe(false);
  });

  it("accepts title of exactly 500 characters", () => {
    expect(
      updateTitleSchema.safeParse({ meetingId: VALID_UUID, title: "a".repeat(500) }).success,
    ).toBe(true);
  });

  it("rejects empty meetingId", () => {
    expect(updateTitleSchema.safeParse({ meetingId: "", title: "Valid" }).success).toBe(false);
  });

  it("accepts non-UUID meetingId (DB enforces UUID type)", () => {
    expect(updateTitleSchema.safeParse({ meetingId: "abc123", title: "Valid" }).success).toBe(true);
  });
});

describe("updateMeetingTypeSchema", () => {
  it("accepts all valid enum values", () => {
    const types = [
      "strategy",
      "one_on_one",
      "team_sync",
      "board",
      "discovery",
      "sales",
      "project_kickoff",
      "status_update",
      "collaboration",
      "other",
    ];
    for (const meetingType of types) {
      expect(
        updateMeetingTypeSchema.safeParse({ meetingId: VALID_UUID, meetingType }).success,
      ).toBe(true);
    }
  });

  it("rejects invalid meeting type", () => {
    expect(
      updateMeetingTypeSchema.safeParse({ meetingId: VALID_UUID, meetingType: "invalid" }).success,
    ).toBe(false);
  });
});

describe("updateMeetingOrganizationSchema", () => {
  it("accepts valid input with organizationId", () => {
    const result = updateMeetingOrganizationSchema.safeParse({
      meetingId: VALID_UUID,
      organizationId: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
  });

  it("accepts null for organizationId", () => {
    expect(
      updateMeetingOrganizationSchema.safeParse({
        meetingId: VALID_UUID,
        organizationId: null,
      }).success,
    ).toBe(true);
  });

  it("rejects empty meetingId", () => {
    expect(
      updateMeetingOrganizationSchema.safeParse({
        meetingId: "",
        organizationId: null,
      }).success,
    ).toBe(false);
  });
});

describe("meetingProjectSchema", () => {
  it("accepts valid input", () => {
    expect(
      meetingProjectSchema.safeParse({ meetingId: VALID_UUID, projectId: VALID_UUID_2 }).success,
    ).toBe(true);
  });

  it("rejects empty meetingId", () => {
    expect(meetingProjectSchema.safeParse({ meetingId: "", projectId: VALID_UUID }).success).toBe(
      false,
    );
  });

  it("rejects empty projectId", () => {
    expect(meetingProjectSchema.safeParse({ meetingId: VALID_UUID, projectId: "" }).success).toBe(
      false,
    );
  });
});

describe("meetingParticipantSchema", () => {
  it("accepts valid input", () => {
    expect(
      meetingParticipantSchema.safeParse({ meetingId: VALID_UUID, personId: VALID_UUID_2 }).success,
    ).toBe(true);
  });

  it("rejects empty meetingId", () => {
    expect(
      meetingParticipantSchema.safeParse({ meetingId: "", personId: VALID_UUID }).success,
    ).toBe(false);
  });

  it("rejects empty personId", () => {
    expect(
      meetingParticipantSchema.safeParse({ meetingId: VALID_UUID, personId: "" }).success,
    ).toBe(false);
  });
});

describe("createOrganizationSchema", () => {
  it("accepts valid input and returns correct data", () => {
    const result = createOrganizationSchema.safeParse({
      name: "New Corp",
      type: "client",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("New Corp");
    }
  });

  it("accepts without type", () => {
    expect(createOrganizationSchema.safeParse({ name: "Corp" }).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(createOrganizationSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects name longer than 200 characters", () => {
    expect(createOrganizationSchema.safeParse({ name: "a".repeat(201) }).success).toBe(false);
  });

  it("rejects invalid type enum value", () => {
    expect(createOrganizationSchema.safeParse({ name: "Corp", type: "unknown" }).success).toBe(
      false,
    );
  });
});

describe("createProjectSchema", () => {
  it("accepts valid input", () => {
    expect(
      createProjectSchema.safeParse({ name: "Project", organizationId: VALID_UUID }).success,
    ).toBe(true);
  });

  it("rejects empty name", () => {
    expect(createProjectSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects name longer than 200 characters", () => {
    expect(createProjectSchema.safeParse({ name: "a".repeat(201) }).success).toBe(false);
  });

  it("accepts null for organizationId", () => {
    expect(createProjectSchema.safeParse({ name: "P", organizationId: null }).success).toBe(true);
  });
});

describe("createPersonSchema", () => {
  it("accepts valid input and returns correct data", () => {
    const result = createPersonSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      role: "Developer",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Jane Doe");
      expect(result.data.email).toBe("jane@example.com");
    }
  });

  it("rejects invalid email format", () => {
    expect(createPersonSchema.safeParse({ name: "J", email: "bad" }).success).toBe(false);
  });

  it("rejects name longer than 200 characters", () => {
    expect(createPersonSchema.safeParse({ name: "a".repeat(201) }).success).toBe(false);
  });

  it("rejects role longer than 200 characters", () => {
    expect(createPersonSchema.safeParse({ name: "J", role: "a".repeat(201) }).success).toBe(false);
  });

  it("accepts null for email", () => {
    expect(createPersonSchema.safeParse({ name: "J", email: null }).success).toBe(true);
  });

  it("accepts with only name", () => {
    expect(createPersonSchema.safeParse({ name: "Jane" }).success).toBe(true);
  });
});
