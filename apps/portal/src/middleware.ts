import { createAuthMiddleware } from "@repo/auth/middleware";

export const middleware = createAuthMiddleware({
  loginPath: "/login",
  defaultRedirect: "/",
  requireRole: "client",
  forbiddenRedirect: process.env.NEXT_PUBLIC_COCKPIT_URL ?? "/login",
  publicPaths: ["/auth/callback"],
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/.*|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
