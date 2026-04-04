import { describe, it, expect } from "vitest";
import {
  promoteToTaskSchema,
  updateTaskSchema,
  taskIdSchema,
} from "../../src/validations/tasks";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("promoteToTaskSchema", () => {
  it("accepts valid input with all fields", () => {
    const result = promoteToTaskSchema.safeParse({
      extractionId: VALID_UUID,
      title: "Follow up with client",
      assignedTo: "John",
      dueDate: "2025-01-15",
      alreadyDone: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid extractionId (not UUID)", () => {
    const result = promoteToTaskSchema.safeParse({
      extractionId: "not-a-uuid",
      title: "Some task",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = promoteToTaskSchema.safeParse({
      extractionId: VALID_UUID,
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format in dueDate", () => {
    const result = promoteToTaskSchema.safeParse({
      extractionId: VALID_UUID,
      title: "Task",
      dueDate: "15-01-2025",
    });
    expect(result.success).toBe(false);
  });

  it("accepts without optional fields (assignedTo, dueDate, alreadyDone)", () => {
    const result = promoteToTaskSchema.safeParse({
      extractionId: VALID_UUID,
      title: "Minimal task",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null for assignedTo", () => {
    const result = promoteToTaskSchema.safeParse({
      extractionId: VALID_UUID,
      title: "Task",
      assignedTo: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts null for dueDate", () => {
    const result = promoteToTaskSchema.safeParse({
      extractionId: VALID_UUID,
      title: "Task",
      dueDate: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("updateTaskSchema", () => {
  it("accepts valid input with taskId", () => {
    const result = updateTaskSchema.safeParse({
      taskId: VALID_UUID,
      assignedTo: "Jane",
      dueDate: "2025-03-01",
      title: "Updated title",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid taskId (not UUID)", () => {
    const result = updateTaskSchema.safeParse({
      taskId: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts with only taskId (all other fields optional)", () => {
    const result = updateTaskSchema.safeParse({
      taskId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });
});

describe("taskIdSchema", () => {
  it("accepts valid UUID", () => {
    const result = taskIdSchema.safeParse({ taskId: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it("rejects empty string", () => {
    const result = taskIdSchema.safeParse({ taskId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID string", () => {
    const result = taskIdSchema.safeParse({ taskId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});
