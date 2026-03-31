import { registerClient } from "@/lib/oauth";

// RFC 7591 Dynamic Client Registration (simplified)
export async function POST(request: Request) {
  const body = await request.json();

  const redirectUris: string[] = body.redirect_uris;
  if (!redirectUris || !Array.isArray(redirectUris) || redirectUris.length === 0) {
    return Response.json(
      { error: "invalid_client_metadata", error_description: "redirect_uris is required" },
      { status: 400 },
    );
  }

  const { clientId } = registerClient({
    redirectUris,
    name: body.client_name ?? "MCP Client",
  });

  return Response.json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      client_name: body.client_name ?? "MCP Client",
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    { status: 201 },
  );
}
