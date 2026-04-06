import { describe, it, expect } from "vitest";
import { promoteToTaskSchema, updateTaskSchema, taskIdSchema } from "../../src/validations/tasks";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("promoteToTaskSchema", () => {
  it("accepts valid input and returns correct data shape", () => {
    const result = promoteToTaskSchema.safeParse({
      extractionId: VALID_UUID,
      title: "Follow up with client",
      assignedTo: "John",
      dueDate: "2025-01-15",
      alreadyDone: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.extractionId).toBe(VALID_UUID);
      expect(result.data.title).toBe("Follow up with client");
      expect(result.data.assignedTo).toBe("John");
      expect(result.data.dueDate).toBe("2025-01-15");
      expect(result.data.alreadyDone).toBe(false);
    }
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

  it("rejects partial date format (2025-1-5)", () => {
    const result = promoteToTaskSchema.safeParse({
      extractionId: VALID_UUID,
      title: "Task",
      dueDate: "2025-1-5",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean alreadyDone", () => {
    const result = promoteToTaskSchema.safeParse({
      extractionId: VALID_UUID,
      title: "Task",
      alreadyDone: "yes",
    });
    expect(result.success).toBe(false);
  });

  it("accepts without optional fields", () => {
    const result = promoteToTaskSchema.safeParse({
      extractionId: VALID_UUID,
      title: "Minimal task",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null for assignedTo and dueDate", () => {
    const result = promoteToTaskSchema.safeParse({
      extractionId: VALID_UUID,
      title: "Task",
      assignedTo: null,
      dueDate: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("updateTaskSchema", () => {
  it("accepts valid input and returns correct data", () => {
    const result = updateTaskSchema.safeParse({
      taskId: VALID_UUID,
      assignedTo: "Jane",
      dueDate: "2025-03-01",
      title: "Updated title",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.taskId).toBe(VALID_UUID);
      expect(result.data.title).toBe("Updated title");
    }
  });

  it("rejects invalid taskId (not UUID)", () => {
    const result = updateTaskSchema.safeParse({ taskId: "invalid" });
    expect(result.success).toBe(false);
  });

  it("rejects empty title when provided", () => {
    const result = updateTaskSchema.safeParse({
      taskId: VALID_UUID,
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid dueDate format", () => {
    const result = updateTaskSchema.safeParse({
      taskId: VALID_UUID,
      dueDate: "March 1, 2025",
    });
    expect(result.success).toBe(false);
  });

  it("accepts with only taskId", () => {
    const result = updateTaskSchema.safeParse({ taskId: VALID_UUID });
    expect(result.success).toBe(true);
  });
});

describe("taskIdSchema", () => {
  it("accepts valid UUID", () => {
    const result = taskIdSchema.safeParse({ taskId: VALID_UUID });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.taskId).toBe(VALID_UUID);
    }
  });

  it("rejects empty string", () => {
    expect(taskIdSchema.safeParse({ taskId: "" }).success).toBe(false);
  });

  it("rejects non-UUID string", () => {
    expect(taskIdSchema.safeParse({ taskId: "not-a-uuid" }).success).toBe(false);
  });
});
