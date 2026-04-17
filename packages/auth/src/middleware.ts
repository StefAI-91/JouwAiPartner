import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Known workspace origins. A redirect target moet of relatief zijn, of naar
 * een van deze hosts wijzen. Voorkomt open-redirect als een env var per
 * ongeluk op een externe hostname staat (preview-misconfig, supply chain).
 */
function buildOriginAllowlist(): Set<string> {
  const origins = new Set<string>();
  for (const raw of [
    process.env.NEXT_PUBLIC_COCKPIT_URL,
    process.env.NEXT_PUBLIC_DEVHUB_URL,
    process.env.NEXT_PUBLIC_PORTAL_URL,
  ]) {
    if (!raw) continue;
    try {
      origins.add(new URL(raw).origin);
    } catch {
      // Ongeldige URL in env var — silently skip; redirectTo valt dan terug
      // op de relatieve loginPath.
    }
  }
  // Vercel prod-fallbacks (zie @repo/ui/workspaces) zodat ook bij afwezige
  // env vars de bekende deployments geaccepteerd worden.
  origins.add("https://jouw-ai-partner.vercel.app");
  origins.add("https://jouw-ai-partner-devhub.vercel.app");
  origins.add("https://jouw-ai-partner-portal.vercel.app");
  return origins;
}

function isAllowedAbsolute(target: string): boolean {
  try {
    const url = new URL(target);
    return buildOriginAllowlist().has(url.origin);
  } catch {
    return false;
  }
}

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

function redirectTo(request: NextRequest, target: string, cookieSource?: NextResponse) {
  // Absolute URL → alleen accepteren als origin in de allowlist staat,
  // anders vallen we terug op /login om open-redirect te voorkomen.
  let response: NextResponse;
  if (/^https?:\/\//i.test(target)) {
    if (!isAllowedAbsolute(target)) {
      const fallback = request.nextUrl.clone();
      fallback.pathname = "/login";
      fallback.search = "";
      response = NextResponse.redirect(fallback);
    } else {
      response = NextResponse.redirect(new URL(target));
    }
  } else {
    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = "";
    response = NextResponse.redirect(url);
  }

  // Neem cookies van de supabase-response over zodat refresh-token-rotaties
  // niet verloren gaan bij een middleware-redirect. Zonder dit komt de user
  // na refresh weer in de login-loop.
  if (cookieSource) {
    cookieSource.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie);
    });
  }
  return response;
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
      return redirectTo(request, loginPath, supabaseResponse);
    }

    if (user && request.nextUrl.pathname.startsWith(loginPath)) {
      const url = request.nextUrl.clone();
      url.pathname = defaultRedirect;
      const response = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
      return response;
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
        return redirectTo(request, clientRedirect, supabaseResponse);
      }

      if (requireRole && role !== requireRole) {
        return redirectTo(request, forbiddenRedirect, supabaseResponse);
      }
    }

    return supabaseResponse;
  };
}
