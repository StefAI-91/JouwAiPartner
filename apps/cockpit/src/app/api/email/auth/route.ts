import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@repo/ai/google-oauth";
import { createClient } from "@repo/database/supabase/server";

/**
 * GET /api/email/auth
 * Redirects to Google OAuth consent screen for Gmail access.
 * Dynamically builds the redirect URI from the request host so it works
 * on any Vercel preview deployment.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/email/auth/callback`;
    const authUrl = getGoogleAuthUrl(redirectUri, user.id);
    return NextResponse.redirect(authUrl);
  } catch (err) {
    return NextResponse.json({ error: `Google OAuth not configured: ${err}` }, { status: 500 });
  }
}
