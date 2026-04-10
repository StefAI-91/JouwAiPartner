import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

interface AuthMiddlewareOptions {
  loginPath?: string;
  defaultRedirect?: string;
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

export function createAuthMiddleware(options?: AuthMiddlewareOptions) {
  const loginPath = options?.loginPath ?? "/login";
  const defaultRedirect = options?.defaultRedirect ?? "/";

  return async function middleware(request: NextRequest) {
    // DEV BYPASS: skip all auth checks in development/preview
    if (isAuthBypassed()) {
      // If they visit /login while bypassed, redirect to home
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
      const url = request.nextUrl.clone();
      url.pathname = loginPath;
      return NextResponse.redirect(url);
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
      const url = request.nextUrl.clone();
      url.pathname = loginPath;
      return NextResponse.redirect(url);
    }

    if (user && request.nextUrl.pathname.startsWith(loginPath)) {
      const url = request.nextUrl.clone();
      url.pathname = defaultRedirect;
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  };
}
