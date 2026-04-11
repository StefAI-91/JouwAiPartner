import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/mcp/server", () => ({
  createMcpServer: vi.fn(),
}));

vi.mock("@repo/database/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/oauth", () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js", () => {
  return {
    WebStandardStreamableHTTPServerTransport: class {
      handleRequest = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ result: "ok" }), { status: 200 }));
    },
  };
});

import { createMcpServer } from "@repo/mcp/server";
import { createClient } from "@repo/database/supabase/server";
import { verifyAccessToken } from "@/lib/oauth";
import { POST, GET, DELETE } from "../../src/app/api/mcp/route";

describe("MCP API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createMcpServer).mockReturnValue({
      connect: vi.fn(),
    } as never);
  });

  describe("POST /api/mcp", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(verifyAccessToken).mockResolvedValue(null);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      } as never);

      const req = new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method: "tools/list" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("forwards request to MCP server with Bearer auth", async () => {
      vi.mocked(verifyAccessToken).mockResolvedValue({ sub: "user-1" } as never);

      const req = new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer valid-token",
        },
        body: JSON.stringify({ method: "tools/list" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(createMcpServer).toHaveBeenCalledTimes(1);
    });

    it("forwards request to MCP server with Supabase cookie auth", async () => {
      vi.mocked(verifyAccessToken).mockResolvedValue(null);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
        },
      } as never);

      const req = new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method: "tools/call" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/mcp", () => {
    it("returns 405 (SSE not supported in stateless mode)", async () => {
      const res = await GET();
      expect(res.status).toBe(405);
    });
  });

  describe("DELETE /api/mcp", () => {
    it("returns 200 (no-op in stateless mode)", async () => {
      const res = await DELETE();
      expect(res.status).toBe(200);
    });
  });
});
