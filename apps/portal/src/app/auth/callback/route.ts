import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@repo/database/supabase/server";

/**
 * Magic link / invite callback for the portal.
 *
 * Accepts both PKCE (`?code=`) and OTP (`?token_hash=&type=`) links.
 * - Client → land op `next` (same-origin) of "/"
 * - Admin  → land ook op "/" (admins mogen het portaal previewen)
 * - Member → doorsturen naar devhub; members horen hier niet
 * - Geen profiel of onbekend → signOut + /login?error=no_access
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? null;

  if (role === "client" || role === "admin") {
    const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    return NextResponse.redirect(new URL(target, req.url));
  }

  if (role === "member") {
    const devhubUrl = process.env.NEXT_PUBLIC_DEVHUB_URL;
    if (devhubUrl) return NextResponse.redirect(new URL(devhubUrl));
  }

  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login?error=no_access", req.url));
}
