import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@repo/database/supabase/server";
import { isAdmin } from "@repo/auth/access";

/**
 * AUTH-171: Magic link callback for DevHub.
 *
 * Exchanges the OTP code for a session, then routes by role:
 *   - admin   → NEXT_PUBLIC_COCKPIT_URL (admins primarily live in cockpit)
 *   - member  → `next` param (if same-origin) or "/"
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
    const cockpitUrl = process.env.NEXT_PUBLIC_COCKPIT_URL;
    if (cockpitUrl) return NextResponse.redirect(new URL(cockpitUrl));
    // No cockpit URL configured → stay on devhub.
    return NextResponse.redirect(new URL("/", req.url));
  }

  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(new URL(target, req.url));
}
