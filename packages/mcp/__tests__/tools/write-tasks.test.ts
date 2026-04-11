import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(),
}));

vi.mock("@repo/database/mutations/tasks", () => ({
  createTaskFromExtraction: vi.fn(),
  updateTask: vi.fn(),
  completeTask: vi.fn(),
  dismissTask: vi.fn(),
}));

vi.mock("@repo/database/queries/people", () => ({
  findProfileIdByName: vi.fn(),
}));

import { getAdminClient } from "@repo/database/supabase/admin";
import {
  createTaskFromExtraction,
  updateTask,
  completeTask,
  dismissTask,
} from "@repo/database/mutations/tasks";
import { findProfileIdByName } from "@repo/database/queries/people";
import { registerWriteTaskTools } from "../../src/tools/write-tasks";
import { createMockSupabase, captureToolHandlers, getText } from "./_helpers";

const handlers = captureToolHandlers(registerWriteTaskTools);
const createHandler = handlers["create_task"];
const completeHandler = handlers["complete_task"];
const updateHandler = handlers["update_task"];
const dismissHandler = handlers["dismiss_task"];

describe("create_task", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers the tool", () => {
    expect(createHandler).toBeDefined();
  });

  it("creates a task from an extraction", async () => {
    vi.mocked(findProfileIdByName).mockResolvedValueOnce("uid-stef"); // created_by
    vi.mocked(createTaskFromExtraction).mockResolvedValue({ id: "task-1" });

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await createHandler({
      extraction_id: "e1",
      title: "Deploy feature X",
      created_by_name: "Stef",
      already_done: false,
    });
    const text = getText(result);

    expect(createTaskFromExtraction).toHaveBeenCalledWith(
      expect.objectContaining({
        extraction_id: "e1",
        title: "Deploy feature X",
        created_by: "uid-stef",
      }),
    );
    expect(text).toContain("Taak aangemaakt");
    expect(text).toContain("Deploy feature X");
    expect(text).toContain("task-1");
  });

  it("resolves assigned_to name to profile ID", async () => {
    vi.mocked(findProfileIdByName)
      .mockResolvedValueOnce("uid-stef") // created_by
      .mockResolvedValueOnce("uid-wouter"); // assigned_to
    vi.mocked(createTaskFromExtraction).mockResolvedValue({ id: "task-1" });

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await createHandler({
      extraction_id: "e1",
      title: "Task",
      assigned_to_name: "Wouter",
      due_date: "2026-03-01",
      created_by_name: "Stef",
      already_done: false,
    });
    const text = getText(result);

    expect(createTaskFromExtraction).toHaveBeenCalledWith(
      expect.objectContaining({
        assigned_to: "uid-wouter",
        due_date: "2026-03-01",
      }),
    );
    expect(text).toContain("Wouter");
    expect(text).toContain("2026-03-01");
  });

  it("returns error when created_by profile not found", async () => {
    vi.mocked(findProfileIdByName).mockResolvedValue(null);

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await createHandler({
      extraction_id: "e1",
      title: "Task",
      created_by_name: "Ghost",
      already_done: false,
    });
    const text = getText(result);

    expect(text).toContain('Profiel voor "Ghost" niet gevonden');
  });

  it("returns error when assigned_to profile not found", async () => {
    vi.mocked(findProfileIdByName)
      .mockResolvedValueOnce("uid-stef") // created_by OK
      .mockResolvedValueOnce(null); // assigned_to NOT FOUND

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await createHandler({
      extraction_id: "e1",
      title: "Task",
      assigned_to_name: "Ghost",
      created_by_name: "Stef",
      already_done: false,
    });
    const text = getText(result);

    expect(text).toContain('Profiel voor toegewezen persoon "Ghost" niet gevonden');
  });

  it("returns error when createTaskFromExtraction fails", async () => {
    vi.mocked(findProfileIdByName).mockResolvedValue("uid-stef");
    vi.mocked(createTaskFromExtraction).mockResolvedValue({ error: "Duplicate extraction" });

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await createHandler({
      extraction_id: "e1",
      title: "Task",
      created_by_name: "Stef",
      already_done: false,
    });
    const text = getText(result);

    expect(text).toContain("Fout bij aanmaken taak: Duplicate extraction");
  });

  it("creates task with already_done=true", async () => {
    vi.mocked(findProfileIdByName).mockResolvedValue("uid-stef");
    vi.mocked(createTaskFromExtraction).mockResolvedValue({ id: "task-2" });

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await createHandler({
      extraction_id: "e1",
      title: "Done task",
      created_by_name: "Stef",
      already_done: true,
    });
    const text = getText(result);

    expect(createTaskFromExtraction).toHaveBeenCalledWith(
      expect.objectContaining({
        already_done: true,
      }),
    );
    expect(text).toContain("Status:** done");
  });
});

describe("complete_task", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers the tool", () => {
    expect(completeHandler).toBeDefined();
  });

  it("marks a task as done", async () => {
    vi.mocked(completeTask).mockResolvedValue({ success: true });

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await completeHandler({ task_id: "task-1" });
    const text = getText(result);

    expect(completeTask).toHaveBeenCalledWith("task-1");
    expect(text).toContain("Taak afgerond");
    expect(text).toContain("done");
  });

  it("returns error on failure", async () => {
    vi.mocked(completeTask).mockResolvedValue({ error: "Task not found" });

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await completeHandler({ task_id: "nonexistent" });
    const text = getText(result);

    expect(text).toContain("Fout bij afronden taak: Task not found");
  });
});

describe("update_task", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers the tool", () => {
    expect(updateHandler).toBeDefined();
  });

  it("performs a partial update", async () => {
    vi.mocked(updateTask).mockResolvedValue({ success: true });

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await updateHandler({
      task_id: "task-1",
      title: "New title",
      due_date: "2026-04-01",
    });
    const text = getText(result);

    expect(updateTask).toHaveBeenCalledWith(
      "task-1",
      expect.objectContaining({
        title: "New title",
        due_date: "2026-04-01",
      }),
    );
    expect(text).toContain("Taak bijgewerkt");
    expect(text).toContain("New title");
    expect(text).toContain("2026-04-01");
  });

  it("resolves assigned_to_name to profile ID", async () => {
    vi.mocked(findProfileIdByName).mockResolvedValue("uid-ege");
    vi.mocked(updateTask).mockResolvedValue({ success: true });

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await updateHandler({
      task_id: "task-1",
      assigned_to_name: "Ege",
    });
    const text = getText(result);

    expect(updateTask).toHaveBeenCalledWith("task-1", { assigned_to: "uid-ege" });
    expect(text).toContain("Ege");
  });

  it("returns error when assigned_to profile not found", async () => {
    vi.mocked(findProfileIdByName).mockResolvedValue(null);

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await updateHandler({
      task_id: "task-1",
      assigned_to_name: "Ghost",
    });
    const text = getText(result);

    expect(text).toContain('Profiel voor "Ghost" niet gevonden');
  });

  it("returns message when no fields provided", async () => {
    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await updateHandler({ task_id: "task-1" });
    const text = getText(result);

    expect(text).toContain("Geen wijzigingen opgegeven");
  });

  it("returns error on update failure", async () => {
    vi.mocked(updateTask).mockResolvedValue({ error: "Not found" });

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await updateHandler({
      task_id: "task-1",
      title: "new",
    });
    const text = getText(result);

    expect(text).toContain("Fout bij bijwerken taak: Not found");
  });
});

describe("dismiss_task", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers the tool", () => {
    expect(dismissHandler).toBeDefined();
  });

  it("marks a task as dismissed", async () => {
    vi.mocked(dismissTask).mockResolvedValue({ success: true });

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await dismissHandler({ task_id: "task-1" });
    const text = getText(result);

    expect(dismissTask).toHaveBeenCalledWith("task-1");
    expect(text).toContain("Taak afgewezen");
    expect(text).toContain("dismissed");
  });

  it("returns error on dismiss failure", async () => {
    vi.mocked(dismissTask).mockResolvedValue({ error: "Already dismissed" });

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await dismissHandler({ task_id: "task-1" });
    const text = getText(result);

    expect(text).toContain("Fout bij afwijzen taak: Already dismissed");
  });
});
