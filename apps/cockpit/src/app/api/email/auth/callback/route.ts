import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, getAuthenticatedEmail } from "@repo/ai/google-oauth";
import { upsertGoogleAccount } from "@repo/database/mutations/emails";
import { createClient } from "@repo/database/supabase/server";

/**
 * GET /api/email/auth/callback
 * Google OAuth callback — exchanges code for tokens and stores the account.
 * Uses the same dynamic redirect URI as the auth route.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(new URL("/emails?error=no_code", request.url));
  }

  // Verify user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // The state parameter contains the user_id from the auth initiation
  const userId = state ?? user.id;

  try {
    // Build the same redirect URI that was used in the auth route
    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/email/auth/callback`;

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Get the email address of the connected account
    const email = await getAuthenticatedEmail(tokens.access_token);

    if (!email) {
      return NextResponse.redirect(new URL("/emails?error=no_email", request.url));
    }

    // Store the Google account
    const result = await upsertGoogleAccount({
      user_id: userId,
      email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: new Date(tokens.expiry_date).toISOString(),
      scopes: tokens.scope.split(" "),
    });

    if ("error" in result) {
      console.error("Failed to store Google account:", result.error);
      return NextResponse.redirect(new URL("/emails?error=storage_failed", request.url));
    }

    return NextResponse.redirect(new URL("/emails?connected=true", request.url));
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(new URL("/emails?error=oauth_failed", request.url));
  }
}
