import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external dependencies
vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(),
}));

vi.mock("@repo/ai/embeddings", () => ({
  embedText: vi.fn(),
}));

import { getAdminClient } from "@repo/database/supabase/admin";
import { embedText } from "@repo/ai/embeddings";
import { registerSearchTools } from "../../src/tools/search";
import { createMockSupabase, captureToolHandlers, getText } from "./_helpers";

const mockEmbedding = [0.1, 0.2, 0.3];

const handlers = captureToolHandlers(registerSearchTools);
const searchHandler = handlers["search_knowledge"];

describe("search_knowledge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(embedText).mockResolvedValue(mockEmbedding);
  });

  it("registers the search_knowledge tool", () => {
    expect(searchHandler).toBeDefined();
    expect(typeof searchHandler).toBe("function");
  });

  it("calls embedText with the search query using search_query inputType", async () => {
    const mockSupabase = createMockSupabase({
      rpcResults: {
        search_all_content: { data: [], error: null },
      },
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    await searchHandler({ query: "test query", limit: 10, include_drafts: false });

    expect(embedText).toHaveBeenCalledWith("test query", "search_query");
  });

  it("defaults to verified_only (include_drafts=false)", async () => {
    const mockSupabase = createMockSupabase({
      rpcResults: {
        search_all_content: { data: [], error: null },
      },
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    await searchHandler({ query: "test", limit: 10, include_drafts: false });

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "search_all_content",
      expect.objectContaining({
        verified_only: true,
      }),
    );
  });

  it("passes include_drafts=true as verified_only=false", async () => {
    const mockSupabase = createMockSupabase({
      rpcResults: {
        search_all_content: { data: [], error: null },
      },
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    await searchHandler({ query: "test", limit: 10, include_drafts: true });

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "search_all_content",
      expect.objectContaining({
        verified_only: false,
      }),
    );
  });

  it("formats results with verification status and source labels", async () => {
    const mockResults = [
      {
        id: "r1",
        source_type: "decision",
        content: "We decided to use Next.js",
        title: "Architecture meeting",
        date: "2026-01-15",
        similarity: 0.85,
        confidence: 0.9,
        corrected_by: null,
        transcript_ref: "Let's go with Next.js",
        meeting_id: "m1",
        verification_status: "verified",
        verified_by: "profile-1",
        verified_at: "2026-01-16T10:00:00Z",
      },
    ];

    const mockSupabase = createMockSupabase({
      rpcResults: {
        search_all_content: { data: mockResults, error: null },
      },
      tables: {
        mcp_queries: { data: null, error: null },
        profiles: { data: [{ id: "profile-1", full_name: "Stef" }], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await searchHandler({ query: "Next.js", limit: 10, include_drafts: false });
    const text = getText(result);

    expect(text).toContain("1 resultaten gevonden");
    expect(text).toContain("Besluit");
    expect(text).toContain("similarity: 0.850");
    expect(text).toContain("We decided to use Next.js");
    expect(text).toContain("Verified by Stef");
    expect(text).toContain("Let's go with Next.js");
  });

  it("resolves profile names for verified_by ids", async () => {
    const mockResults = [
      {
        id: "r1",
        source_type: "meeting",
        content: "Test content",
        title: "Test",
        date: null,
        similarity: 0.7,
        confidence: null,
        corrected_by: null,
        transcript_ref: null,
        meeting_id: "m1",
        verification_status: "verified",
        verified_by: "profile-abc",
        verified_at: "2026-02-01T10:00:00Z",
      },
    ];

    const mockSupabase = createMockSupabase({
      rpcResults: {
        search_all_content: { data: mockResults, error: null },
      },
      tables: {
        mcp_queries: { data: null, error: null },
        profiles: { data: [{ id: "profile-abc", full_name: "Wouter" }], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await searchHandler({ query: "test", limit: 10, include_drafts: false });
    const text = getText(result);

    expect(text).toContain("Verified by Wouter");
  });

  it("handles empty search results", async () => {
    const mockSupabase = createMockSupabase({
      rpcResults: {
        search_all_content: { data: [], error: null },
      },
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await searchHandler({ query: "nonexistent", limit: 10, include_drafts: false });
    const text = getText(result);

    expect(text).toContain("Geen relevante resultaten gevonden");
  });

  it("handles null search results", async () => {
    const mockSupabase = createMockSupabase({
      rpcResults: {
        search_all_content: { data: null, error: null },
      },
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await searchHandler({ query: "nonexistent", limit: 10, include_drafts: false });
    const text = getText(result);

    expect(text).toContain("Geen relevante resultaten gevonden");
  });

  it("returns error message on RPC error", async () => {
    const mockSupabase = createMockSupabase({
      rpcResults: {
        search_all_content: { data: null, error: { message: "RPC failed" } },
      },
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await searchHandler({ query: "test", limit: 10, include_drafts: false });
    const text = getText(result);

    expect(text).toContain("Search error: RPC failed");
  });

  it("uses project segment search when project_id is provided", async () => {
    const mockSupabase = createMockSupabase({
      rpcResults: {
        search_project_segments: { data: [], error: null },
      },
      tables: { mcp_queries: { data: null, error: null } },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const projectId = "550e8400-e29b-41d4-a716-446655440000";
    await searchHandler({ query: "test", project_id: projectId, limit: 10, include_drafts: false });

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "search_project_segments",
      expect.objectContaining({
        p_project_id: projectId,
      }),
    );
  });

  it("formats project segment results with kernpunten and vervolgstappen", async () => {
    const mockSegmentResults = [
      {
        id: "seg1",
        meeting_id: "m1",
        project_id: "p1",
        project_name: "Platform",
        project_name_raw: null,
        meeting_title: "Sprint review",
        meeting_date: "2026-03-01",
        content: "Progress update",
        kernpunten: ["Feature A complete", "Bug fix deployed"],
        vervolgstappen: ["Start feature B"],
        similarity: 0.9,
        verification_status: "verified",
        verified_by: null,
        verified_at: null,
      },
    ];

    const mockSupabase = createMockSupabase({
      rpcResults: {
        search_project_segments: { data: mockSegmentResults, error: null },
      },
      tables: {
        mcp_queries: { data: null, error: null },
        profiles: { data: [], error: null },
      },
    });
    vi.mocked(getAdminClient).mockReturnValue(mockSupabase as never);

    const result = await searchHandler({
      query: "test",
      project_id: "550e8400-e29b-41d4-a716-446655440000",
      limit: 10,
      include_drafts: false,
    });
    const text = getText(result);

    expect(text).toContain("project-segmenten gevonden");
    expect(text).toContain("Platform");
    expect(text).toContain("Feature A complete");
    expect(text).toContain("Start feature B");
  });
});
