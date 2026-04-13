import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@repo/database/supabase/server";
import { isAdmin } from "@repo/auth/access";

/**
 * AUTH-171: Magic link callback for Cockpit.
 *
 * Exchanges the OTP code for a session, then routes by role:
 *   - admin   → `next` param (if same-origin) or "/"
 *   - member  → NEXT_PUBLIC_DEVHUB_URL (members never enter cockpit)
 *
 * Errors land back on `/login?error=<code>` so the login page can surface a
 * banner and offer a resend button.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", req.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", req.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=session", req.url));
  }

  if (await isAdmin(user.id)) {
    // Only honour same-origin `next` to avoid open-redirect abuse.
    const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    return NextResponse.redirect(new URL(target, req.url));
  }

  const devhubUrl = process.env.NEXT_PUBLIC_DEVHUB_URL;
  if (devhubUrl) return NextResponse.redirect(new URL(devhubUrl));

  // Fallback: no devhub URL configured — sign out and send back to login.
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login?error=no_access", req.url));
}
