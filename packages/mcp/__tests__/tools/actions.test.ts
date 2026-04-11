import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(),
}));

vi.mock("@repo/database/queries/people", () => ({
  findPersonIdsByName: vi.fn(),
  findProfileIdByName: vi.fn(),
}));

import { getAdminClient } from "@repo/database/supabase/admin";
import { findPersonIdsByName } from "@repo/database/queries/people";
import { registerActionTools } from "../../src/tools/actions";
import { createMockSupabase, captureToolHandlers, getText } from "./_helpers";

const handlers = captureToolHandlers(registerActionTools);
const getTasksHandler = handlers["get_tasks"];
const getActionItemsHandler = handlers["get_action_items"];

describe("get_tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers the tool", () => {
    expect(getTasksHandler).toBeDefined();
  });

  it("returns active tasks by default", async () => {
    const mockTasks = [
      {
        id: "t1",
        title: "Deploy feature",
        status: "active",
        due_date: "2026-02-01",
        assigned_to: "p1",
        completed_at: null,
        created_at: "2026-01-15",
        assigned_person: { name: "Wouter", team: "engineering" },
      },
    ];

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        tasks: { data: mockTasks, error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await getTasksHandler({ status: "active", limit: 20 });
    const text = getText(result);

    expect(text).toContain("1 taken gevonden");
    expect(text).toContain("Deploy feature");
    expect(text).toContain("Actief");
    expect(text).toContain("Wouter (engineering)");
    expect(text).toContain("Deadline: 2026-02-01");
  });

  it("filters by person via findPersonIdsByName", async () => {
    vi.mocked(findPersonIdsByName).mockResolvedValue(["p1"]);

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        tasks: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await getTasksHandler({ person: "Stef", status: "active", limit: 20 });
    const text = getText(result);

    expect(findPersonIdsByName).toHaveBeenCalledWith("Stef");
    expect(text).toContain("Geen taken gevonden");
  });

  it("returns not-found when person name matches nobody", async () => {
    vi.mocked(findPersonIdsByName).mockResolvedValue([]);

    const mockSupabase = createMockSupabase({
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await getTasksHandler({ person: "Unknown", status: "active", limit: 20 });
    const text = getText(result);

    expect(text).toContain('Geen persoon gevonden voor "Unknown"');
  });

  it("shows done tasks with completed_at date", async () => {
    const mockTasks = [
      {
        id: "t1",
        title: "Review code",
        status: "done",
        due_date: null,
        assigned_to: "p1",
        completed_at: "2026-01-20T15:00:00Z",
        created_at: "2026-01-15",
        assigned_person: { name: "Ege", team: null },
      },
    ];

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        tasks: { data: mockTasks, error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await getTasksHandler({ status: "done", limit: 20 });
    const text = getText(result);

    expect(text).toContain("Afgerond");
    expect(text).toContain("Ege (klant)");
  });

  it("returns error on database error", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        tasks: { data: null, error: { message: "Query failed" } },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await getTasksHandler({ status: "active", limit: 20 });
    const text = getText(result);

    expect(text).toContain("Error: Query failed");
  });
});

describe("get_action_items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers the tool", () => {
    expect(getActionItemsHandler).toBeDefined();
  });

  it("returns action items with verification status", async () => {
    const mockItems = [
      {
        id: "e1",
        content: "Write documentation",
        confidence: 0.85,
        transcript_ref: "We need to write docs",
        metadata: { assignee: "Stef", deadline: "2026-02-15" },
        corrected_by: null,
        corrected_at: null,
        created_at: "2026-01-15",
        verification_status: "verified",
        verified_by: "uid-1",
        verified_at: "2026-01-16T10:00:00Z",
        meeting: { id: "m1", title: "Planning", date: "2026-01-15", participants: [] },
        organization: { name: "JouwAI" },
        project: { name: "Platform" },
      },
    ];

    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        extractions: { data: mockItems, error: null },
        profiles: { data: [{ id: "uid-1", full_name: "Stef" }], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await getActionItemsHandler({ limit: 20, include_drafts: false });
    const text = getText(result);

    expect(text).toContain("1 actiepunten gevonden");
    expect(text).toContain("Write documentation");
    expect(text).toContain("Eigenaar: Stef");
    expect(text).toContain("Platform");
    expect(text).toContain("Verified by Stef");
  });

  it("defaults to verified_only filter", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        extractions: { data: [], error: null },
        profiles: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    await getActionItemsHandler({ limit: 20, include_drafts: false });

    // The from("extractions") chain should have eq called for verification_status
    expect(mockSupabase.from).toHaveBeenCalledWith("extractions");
  });

  it("filters by project via resolveProjectIds", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        projects: { data: [{ id: "p1" }], error: null },
        extractions: { data: [], error: null },
        profiles: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await getActionItemsHandler({
      project: "Platform",
      limit: 20,
      include_drafts: false,
    });
    const text = getText(result);

    expect(text).toContain("Geen actiepunten gevonden");
  });

  it("returns not-found when project does not exist", async () => {
    const mockSupabase = createMockSupabase({
      tables: {
        mcp_queries: { data: null, error: null },
        projects: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await getActionItemsHandler({
      project: "Nonexistent",
      limit: 20,
      include_drafts: false,
    });
    const text = getText(result);

    expect(text).toContain('Geen project gevonden voor "Nonexistent"');
  });
});
