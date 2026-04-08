import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@repo/ai/google-oauth";
import { createClient } from "@repo/database/supabase/server";

/**
 * GET /api/email/auth
 * Redirects to Google OAuth consent screen for Gmail access.
 * User must be authenticated.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const authUrl = getGoogleAuthUrl(user.id);
    return NextResponse.redirect(authUrl);
  } catch (err) {
    return NextResponse.json({ error: `Google OAuth not configured: ${err}` }, { status: 500 });
  }
}
