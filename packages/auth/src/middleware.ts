import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

interface AuthMiddlewareOptions {
  loginPath?: string;
  defaultRedirect?: string;
  /**
   * Require this role on `profiles.role` for access. When the user is
   * authenticated but does not have the required role, the request is
   * redirected to `forbiddenRedirect`.
   */
  requireRole?: "admin" | "member";
  /**
   * Absolute or relative URL used when the user is authenticated but lacks
   * the required role. Defaults to the value of `loginPath` when omitted.
   */
  forbiddenRedirect?: string;
}

/**
 * Check if auth bypass is active in middleware context.
 * Only true when BOTH conditions are met:
 *   1. NEXT_PUBLIC_DEV_BYPASS_AUTH === "true"
 *   2. VERCEL_ENV !== "production" (undefined locally = allowed, "preview" = allowed)
 *
 * WARNING: Development/preview only. Never set this in production.
 */
function isAuthBypassed(): boolean {
  return (
    process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true" && process.env.VERCEL_ENV !== "production"
  );
}

function redirectTo(request: NextRequest, target: string) {
  // Absolute URL → redirect directly. Relative → keep host and set pathname.
  if (/^https?:\/\//i.test(target)) {
    return NextResponse.redirect(new URL(target));
  }
  const url = request.nextUrl.clone();
  url.pathname = target;
  url.search = "";
  return NextResponse.redirect(url);
}

export function createAuthMiddleware(options?: AuthMiddlewareOptions) {
  const loginPath = options?.loginPath ?? "/login";
  const defaultRedirect = options?.defaultRedirect ?? "/";
  const requireRole = options?.requireRole;
  const forbiddenRedirect = options?.forbiddenRedirect ?? loginPath;

  return async function middleware(request: NextRequest) {
    // DEV BYPASS: skip all auth checks in development/preview
    if (isAuthBypassed()) {
      if (request.nextUrl.pathname.startsWith(loginPath)) {
        const url = request.nextUrl.clone();
        url.pathname = defaultRedirect;
        return NextResponse.redirect(url);
      }
      return NextResponse.next({ request });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      if (request.nextUrl.pathname.startsWith(loginPath)) {
        return NextResponse.next({ request });
      }
      return redirectTo(request, loginPath);
    }

    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !request.nextUrl.pathname.startsWith(loginPath)) {
      return redirectTo(request, loginPath);
    }

    if (user && request.nextUrl.pathname.startsWith(loginPath)) {
      const url = request.nextUrl.clone();
      url.pathname = defaultRedirect;
      return NextResponse.redirect(url);
    }

    // Role gate — only applied when `requireRole` is configured and the user
    // is authenticated. Performed BEFORE the page renders so no data leaks
    // for users lacking the role (SEC-153).
    if (user && requireRole) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role !== requireRole) {
        return redirectTo(request, forbiddenRedirect);
      }
    }

    return supabaseResponse;
  };
}
