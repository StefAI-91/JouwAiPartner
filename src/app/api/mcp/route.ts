import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/lib/mcp/server";

// Stateless mode: each request gets a fresh server+transport.
// This works on Vercel serverless — no in-memory session persistence needed
// because each MCP tool call is a self-contained request/response.

async function handleMcpRequest(request: Request): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  });

  const server = createMcpServer();
  await server.connect(transport);

  const response = await transport.handleRequest(request);

  return response;
}

// POST — main MCP message handler (tool calls, initialize, etc.)
export async function POST(request: Request) {
  return handleMcpRequest(request);
}

// GET — SSE stream (not used in stateless mode, but required by spec)
export async function GET() {
  return new Response("SSE not supported in stateless mode", {
    status: 405,
    headers: { Allow: "POST, DELETE" },
  });
}

// DELETE — session termination (no-op in stateless mode)
export async function DELETE() {
  return new Response(null, { status: 200 });
}
