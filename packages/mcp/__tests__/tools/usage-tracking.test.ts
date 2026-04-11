import { describe, it, expect, vi } from "vitest";
import { trackMcpQuery } from "../../src/tools/usage-tracking";
import { createChainMock } from "./_helpers";

describe("trackMcpQuery", () => {
  it("logs query to mcp_queries table", async () => {
    const insertMock = vi.fn(() => createChainMock({ data: null, error: null }));
    const fromMock = vi.fn(() => ({ insert: insertMock }));
    const mockSupabase = { from: fromMock } as never;

    await trackMcpQuery(mockSupabase, "search_knowledge", "test query");

    expect(fromMock).toHaveBeenCalledWith("mcp_queries");
    expect(insertMock).toHaveBeenCalledWith({
      tool: "search_knowledge",
      query: "test query",
    });
  });

  it("stores null query when no query string provided", async () => {
    const insertMock = vi.fn(() => createChainMock({ data: null, error: null }));
    const fromMock = vi.fn(() => ({ insert: insertMock }));
    const mockSupabase = { from: fromMock } as never;

    await trackMcpQuery(mockSupabase, "get_people");

    expect(insertMock).toHaveBeenCalledWith({
      tool: "get_people",
      query: null,
    });
  });

  it("fails silently on database error (no throw)", async () => {
    const fromMock = vi.fn(() => ({
      insert: vi.fn(() => {
        throw new Error("DB connection lost");
      }),
    }));
    const mockSupabase = { from: fromMock } as never;

    // Should not throw
    await expect(trackMcpQuery(mockSupabase, "search_knowledge", "test")).resolves.toBeUndefined();
  });
});
