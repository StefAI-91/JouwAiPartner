import { describe, it, expect } from "vitest";
import { createSprintSchema, updateSprintSchema } from "../../src/validations/sprints";

// CP-012 — sprints introduceren een week-granulariteit (delivery_week moet
// een maandag zijn) plus de standaard create/update-asymmetrie. Deze tests
// pinnen het gedrag dat de Server Actions in cockpit/sprints vertrouwen.

const VALID_PROJECT = "11111111-1111-4111-8111-111111111111";
const MONDAY = "2026-05-04"; // 4 mei 2026 = maandag (UTC)
const TUESDAY = "2026-05-05";

describe("createSprintSchema", () => {
  it("accepteert een minimale valide sprint-payload", () => {
    const result = createSprintSchema.parse({
      project_id: VALID_PROJECT,
      name: "Sprint 1",
      delivery_week: MONDAY,
    });
    expect(result.name).toBe("Sprint 1");
    expect(result.delivery_week).toBe(MONDAY);
  });

  it("weigert een delivery_week die geen maandag is", () => {
    const result = createSprintSchema.safeParse({
      project_id: VALID_PROJECT,
      name: "Sprint 1",
      delivery_week: TUESDAY,
    });
    expect(result.success).toBe(false);
  });

  it("weigert een delivery_week in verkeerd date-format", () => {
    const result = createSprintSchema.safeParse({
      project_id: VALID_PROJECT,
      name: "Sprint 1",
      delivery_week: "04-05-2026",
    });
    expect(result.success).toBe(false);
  });

  it("weigert een ongeldige kalender-datum (31 februari)", () => {
    const result = createSprintSchema.safeParse({
      project_id: VALID_PROJECT,
      name: "Sprint 1",
      delivery_week: "2026-02-31",
    });
    expect(result.success).toBe(false);
  });

  it("weigert een lege naam", () => {
    const result = createSprintSchema.safeParse({
      project_id: VALID_PROJECT,
      name: "   ",
      delivery_week: MONDAY,
    });
    expect(result.success).toBe(false);
  });

  it("weigert een naam langer dan 80 tekens", () => {
    const result = createSprintSchema.safeParse({
      project_id: VALID_PROJECT,
      name: "x".repeat(81),
      delivery_week: MONDAY,
    });
    expect(result.success).toBe(false);
  });

  it("weigert een summary langer dan 500 tekens", () => {
    const result = createSprintSchema.safeParse({
      project_id: VALID_PROJECT,
      name: "Sprint 1",
      delivery_week: MONDAY,
      summary: "y".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepteert summary = null", () => {
    const result = createSprintSchema.parse({
      project_id: VALID_PROJECT,
      name: "Sprint 1",
      delivery_week: MONDAY,
      summary: null,
    });
    expect(result.summary).toBeNull();
  });

  it("accepteert client_test_instructions tot 5000 chars", () => {
    const result = createSprintSchema.safeParse({
      project_id: VALID_PROJECT,
      name: "Sprint 1",
      delivery_week: MONDAY,
      client_test_instructions: "x".repeat(5000),
    });
    expect(result.success).toBe(true);
  });

  it("weigert client_test_instructions langer dan 5000 chars", () => {
    const result = createSprintSchema.safeParse({
      project_id: VALID_PROJECT,
      name: "Sprint 1",
      delivery_week: MONDAY,
      client_test_instructions: "x".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("accepteert status uit de toegestane set", () => {
    for (const status of ["planned", "in_progress", "delivered"] as const) {
      const result = createSprintSchema.safeParse({
        project_id: VALID_PROJECT,
        name: "Sprint 1",
        delivery_week: MONDAY,
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it("weigert een onbekende status", () => {
    const result = createSprintSchema.safeParse({
      project_id: VALID_PROJECT,
      name: "Sprint 1",
      delivery_week: MONDAY,
      status: "shipped",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateSprintSchema", () => {
  it("accepteert een payload met alleen status", () => {
    const result = updateSprintSchema.parse({ status: "in_progress" });
    expect(result.status).toBe("in_progress");
  });

  it("accepteert een payload met alleen delivery_week (mits maandag)", () => {
    const result = updateSprintSchema.parse({ delivery_week: MONDAY });
    expect(result.delivery_week).toBe(MONDAY);
  });

  it("weigert een lege payload (refine)", () => {
    const result = updateSprintSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("weigert project_id (immutable)", () => {
    const result = updateSprintSchema.safeParse({
      project_id: VALID_PROJECT,
      name: "X",
    });
    // omit() filtert het veld weg; de overgebleven payload is geldig
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).project_id).toBeUndefined();
    }
  });
});
