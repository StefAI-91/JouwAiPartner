import {
  consumeAuthCode,
  verifyCodeChallenge,
  signAccessToken,
} from "@/lib/oauth";

// OAuth 2.1 Token Endpoint
// Exchanges authorization code + PKCE verifier for an access token (JWT).

export async function POST(request: Request) {
  const body = await request.formData().catch(() => null);
  const params = body
    ? Object.fromEntries(body.entries())
    : await request.json().catch(() => ({}));

  const grantType = params.grant_type as string;
  const code = params.code as string;
  const redirectUri = params.redirect_uri as string;
  const clientId = params.client_id as string;
  const codeVerifier = params.code_verifier as string;

  if (grantType !== "authorization_code") {
    return Response.json(
      { error: "unsupported_grant_type" },
      { status: 400 },
    );
  }

  if (!code || !codeVerifier || !clientId) {
    return Response.json(
      { error: "invalid_request", error_description: "Missing required parameters" },
      { status: 400 },
    );
  }

  // Consume the auth code (one-time use)
  const authCode = consumeAuthCode(code);
  if (!authCode) {
    return Response.json(
      { error: "invalid_grant", error_description: "Invalid or expired authorization code" },
      { status: 400 },
    );
  }

  // Validate client_id and redirect_uri match
  if (authCode.clientId !== clientId) {
    return Response.json(
      { error: "invalid_grant", error_description: "client_id mismatch" },
      { status: 400 },
    );
  }

  if (redirectUri && authCode.redirectUri !== redirectUri) {
    return Response.json(
      { error: "invalid_grant", error_description: "redirect_uri mismatch" },
      { status: 400 },
    );
  }

  // Verify PKCE code challenge
  const valid = await verifyCodeChallenge(codeVerifier, authCode.codeChallenge);
  if (!valid) {
    return Response.json(
      { error: "invalid_grant", error_description: "PKCE verification failed" },
      { status: 400 },
    );
  }

  // Issue access token
  const accessToken = await signAccessToken({
    userId: authCode.userId,
    clientId,
  });

  return Response.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    scope: "mcp",
  });
}
