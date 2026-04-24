import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(),
}));

vi.mock("@repo/database/queries/projects", () => ({
  getProjectByUserbackProjectId: vi.fn(),
}));

vi.mock("@repo/database/integrations/userback-sync", () => ({
  executeSyncPipeline: vi.fn(),
}));

vi.mock("@repo/auth/access", () => ({
  isAdmin: vi.fn(),
}));

vi.mock("@/actions/classify", () => ({
  classifyIssueBackground: vi.fn().mockResolvedValue(undefined),
}));

import { createClient } from "@repo/database/supabase/server";
import { getAdminClient } from "@repo/database/supabase/admin";
import { getProjectByUserbackProjectId } from "@repo/database/queries/projects";
import { executeSyncPipeline } from "@repo/database/integrations/userback-sync";
import { isAdmin } from "@repo/auth/access";
import { GET, POST } from "@/app/api/ingest/userback/route";

const CRON_SECRET = "test-cron-secret";

describe("GET /api/ingest/userback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    // Route-handler doet `getAdminClient()` om een admin-scoped client aan
    // `getProjectByUserbackProjectId` + `executeSyncPipeline` door te geven.
    // De helpers zelf zijn gemockt, dus we hoeven alleen een stub terug te
    // geven.
    vi.mocked(getAdminClient).mockReturnValue({} as never);
  });

  it("returns 401 without valid auth", async () => {
    const req = new Request("http://localhost/api/ingest/userback", {
      method: "GET",
    });
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it("returns 404 when no project with userback_project_id", async () => {
    vi.mocked(getProjectByUserbackProjectId).mockResolvedValue(null);

    const req = new Request("http://localhost/api/ingest/userback", {
      method: "GET",
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = await GET(req as never);
    expect(res.status).toBe(404);
  });

  it("returns sync results on success", async () => {
    vi.mocked(getProjectByUserbackProjectId).mockResolvedValue({ id: "project-1" });
    vi.mocked(executeSyncPipeline).mockResolvedValue({
      importedIds: [],
      imported: 5,
      updated: 2,
      skipped: 1,
      mediaStored: 3,
      filtered: 0,
      total: 8,
      isInitial: false,
    } as never);

    const req = new Request("http://localhost/api/ingest/userback", {
      method: "GET",
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = await GET(req as never);
    const data = await res.json();

    expect(getProjectByUserbackProjectId).toHaveBeenCalledWith("127499", expect.anything());
    expect(executeSyncPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
        limit: 100,
        filterTests: true,
      }),
    );
    expect(data.imported).toBe(5);
    expect(data.updated).toBe(2);
    expect(data.skipped).toBe(1);
  });

  it("returns 500 on sync failure", async () => {
    vi.mocked(getProjectByUserbackProjectId).mockResolvedValue({ id: "project-1" });
    vi.mocked(executeSyncPipeline).mockRejectedValue(new Error("Userback API down"));

    const req = new Request("http://localhost/api/ingest/userback", {
      method: "GET",
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = await GET(req as never);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Userback API down");
  });
});

describe("POST /api/ingest/userback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockAuth(authenticated: boolean, admin: boolean = true) {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: authenticated ? { id: "user-1" } : null },
        }),
      },
    } as never);
    vi.mocked(isAdmin).mockResolvedValue(admin);
  }

  it("returns 401 when user is not authenticated", async () => {
    mockAuth(false);

    const req = new Request("http://localhost/api/ingest/userback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: "550e8400-e29b-41d4-a716-446655440000", limit: 10 }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not admin", async () => {
    mockAuth(true, false);

    const req = new Request("http://localhost/api/ingest/userback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: "550e8400-e29b-41d4-a716-446655440000", limit: 10 }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(403);
  });

  it("returns 400 with invalid input", async () => {
    mockAuth(true);

    const req = new Request("http://localhost/api/ingest/userback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: "not-a-uuid" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("executes sync pipeline with user-provided params", async () => {
    mockAuth(true);
    const mockAdmin = {};
    vi.mocked(getAdminClient).mockReturnValue(mockAdmin as never);
    vi.mocked(executeSyncPipeline).mockResolvedValue({
      imported: 3,
      updated: 1,
      skipped: 0,
      mediaStored: 2,
      filtered: 1,
      total: 5,
      isInitial: true,
    } as never);

    const projectId = "550e8400-e29b-41d4-a716-446655440000";
    const req = new Request("http://localhost/api/ingest/userback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId, limit: 25 }),
    });
    const res = await POST(req as never);
    const data = await res.json();

    expect(executeSyncPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        limit: 25,
        filterTests: true,
      }),
    );
    expect(data.imported).toBe(3);
    expect(data.updated).toBe(1);
    expect(data.mediaStored).toBe(2);
    expect(data.isInitial).toBe(true);
  });

  it("returns counts: imported, updated, skipped", async () => {
    mockAuth(true);
    vi.mocked(getAdminClient).mockReturnValue({} as never);
    vi.mocked(executeSyncPipeline).mockResolvedValue({
      imported: 10,
      updated: 5,
      skipped: 3,
      mediaStored: 7,
      filtered: 2,
      total: 20,
      isInitial: false,
    } as never);

    const req = new Request("http://localhost/api/ingest/userback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: "550e8400-e29b-41d4-a716-446655440000" }),
    });
    const res = await POST(req as never);
    const data = await res.json();

    expect(data.imported).toBe(10);
    expect(data.updated).toBe(5);
    expect(data.skipped).toBe(3);
    expect(data.total).toBe(20);
  });

  it("returns 500 on sync failure", async () => {
    mockAuth(true);
    vi.mocked(getAdminClient).mockReturnValue({} as never);
    vi.mocked(executeSyncPipeline).mockRejectedValue(new Error("Sync crashed"));

    const req = new Request("http://localhost/api/ingest/userback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: "550e8400-e29b-41d4-a716-446655440000" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(500);
  });
});
