import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

interface AuthMiddlewareOptions {
  loginPath?: string;
  defaultRedirect?: string;
  /**
   * Require this role on `profiles.role` for access. When the user is
   * authenticated but does not have the required role, the request is
   * redirected to `forbiddenRedirect` — unless the user is a `client`
   * AND `clientRedirect` is configured, in which case that wins.
   */
  requireRole?: "admin" | "member" | "client";
  /**
   * Absolute or relative URL used when the user is authenticated but lacks
   * the required role. Defaults to the value of `loginPath` when omitted.
   */
  forbiddenRedirect?: string;
  /**
   * Optional override: redirect authenticated client users here before the
   * role gate runs. Used by cockpit and devhub to bounce portal users to
   * the portal app so they never see internal tooling. Pass an absolute URL
   * (e.g. `NEXT_PUBLIC_PORTAL_URL`).
   */
  clientRedirect?: string;
  /**
   * Route prefixes that are always allowed for unauthenticated users and are
   * NOT subject to the role gate. Used for auth callback handlers that need
   * to run BEFORE a session exists (e.g. `/auth/callback` for magic links).
   */
  publicPaths?: string[];
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
  const clientRedirect = options?.clientRedirect;
  const publicPaths = options?.publicPaths ?? [];

  const isPublicPath = (pathname: string) =>
    publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  return async function middleware(request: NextRequest) {
    // Public paths (e.g. /auth/callback) run without auth checks so magic-link
    // flows can create a session before any role gate is evaluated.
    if (isPublicPath(request.nextUrl.pathname)) {
      return NextResponse.next({ request });
    }

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

    // Role gate — fetch the role once and apply both the client redirect
    // (cockpit/devhub punt portal users to portal) and the requireRole gate.
    // Performed BEFORE the page renders so no data leaks for users lacking
    // the role (SEC-153).
    if (user && (requireRole || clientRedirect)) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role = profile?.role ?? null;

      if (clientRedirect && role === "client" && requireRole !== "client") {
        return redirectTo(request, clientRedirect);
      }

      if (requireRole && role !== requireRole) {
        return redirectTo(request, forbiddenRedirect);
      }
    }

    return supabaseResponse;
  };
}
