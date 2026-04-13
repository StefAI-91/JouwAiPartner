import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@repo/database/supabase/server";
import { isAdmin } from "@repo/auth/access";

/**
 * AUTH-171: Magic link / invite callback for DevHub.
 *
 * Accepts both PKCE (`?code=`) and OTP (`?token_hash=&type=`) links, then
 * routes by role:
 *   - admin   → NEXT_PUBLIC_COCKPIT_URL (admins primarily live in cockpit)
 *   - member  → `next` param (if same-origin) or "/"
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
    const cockpitUrl = process.env.NEXT_PUBLIC_COCKPIT_URL;
    if (cockpitUrl) return NextResponse.redirect(new URL(cockpitUrl));
    // No cockpit URL configured → stay on devhub.
    return NextResponse.redirect(new URL("/", req.url));
  }

  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(new URL(target, req.url));
}
