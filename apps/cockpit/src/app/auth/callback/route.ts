import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@repo/database/supabase/server";
import { isAdmin } from "@repo/auth/access";

/**
 * AUTH-171: Magic link / invite callback for Cockpit.
 *
 * Accepts both PKCE (`?code=`) and OTP (`?token_hash=&type=`) links, then
 * routes by role:
 *   - admin   → `next` param (if same-origin) or "/"
 *   - member  → NEXT_PUBLIC_DEVHUB_URL (members never enter cockpit)
 *
 * Errors land back on `/login?error=<code>` so the login page can surface a
 * banner and offer a resend button.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const tokenHash = req.nextUrl.searchParams.get("token_hash");
  const type = req.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = req.nextUrl.searchParams.get("next");

  if (!code && !tokenHash) {
    return NextResponse.redirect(new URL("/login?error=missing_code", req.url));
  }

  const supabase = await createClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ type: type ?? "magiclink", token_hash: tokenHash! });
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
