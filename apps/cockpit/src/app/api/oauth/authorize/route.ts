import { NextRequest } from "next/server";
import { createClient } from "@repo/database/supabase/server";
import { storeAuthCode, getClient } from "@/lib/oauth";

// OAuth 2.1 Authorization Endpoint with PKCE
// Flow: Claude redirects user here → user is already logged in via Supabase
// session cookie → we issue an auth code and redirect back to Claude.

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const clientId = params.get("client_id");
  const redirectUri = params.get("redirect_uri");
  const responseType = params.get("response_type");
  const codeChallenge = params.get("code_challenge");
  const codeChallengeMethod = params.get("code_challenge_method");
  const state = params.get("state");

  // Validate required params
  if (responseType !== "code") {
    return Response.json(
      { error: "unsupported_response_type" },
      { status: 400 },
    );
  }

  if (!clientId || !redirectUri || !codeChallenge) {
    return Response.json(
      { error: "invalid_request", error_description: "Missing required parameters" },
      { status: 400 },
    );
  }

  if (codeChallengeMethod && codeChallengeMethod !== "S256") {
    return Response.json(
      { error: "invalid_request", error_description: "Only S256 code challenge method is supported" },
      { status: 400 },
    );
  }

  // Validate client (if registered)
  const client = getClient(clientId);
  if (client && !client.redirectUris.includes(redirectUri)) {
    return Response.json(
      { error: "invalid_request", error_description: "redirect_uri mismatch" },
      { status: 400 },
    );
  }

  // Check if user is authenticated via Supabase session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to login with a return URL back to this authorize endpoint
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("returnTo", request.nextUrl.toString());
    return Response.redirect(loginUrl.toString());
  }

  // User is authenticated — issue authorization code (JWT-based, serverless-safe)
  const code = await storeAuthCode("", {
    clientId,
    redirectUri,
    codeChallenge,
    userId: user.id,
  });

  // Redirect back to Claude with the auth code
  const callback = new URL(redirectUri);
  callback.searchParams.set("code", code);
  if (state) {
    callback.searchParams.set("state", state);
  }

  return Response.redirect(callback.toString());
}
