import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@repo/database/supabase/server";
import { getProfileRole } from "@repo/database/queries/team";

/**
 * AUTH-171: Magic link / invite callback for DevHub.
 *
 * Accepts both PKCE (`?code=`) and OTP (`?token_hash=&type=`) links. Anyone
 * with devhub access (admin or member) lands on `next` (if same-origin) or
 * "/". Client users are bounced to the portal — they should never see devhub.
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

  const role = await getProfileRole(user.id, supabase);

  if (role === "client") {
    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL;
    if (portalUrl) return NextResponse.redirect(new URL(portalUrl));
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=no_access", req.url));
  }

  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(new URL(target, req.url));
}
