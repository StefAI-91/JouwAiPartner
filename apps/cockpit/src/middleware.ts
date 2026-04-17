import { createAuthMiddleware } from "@repo/auth/middleware";

export const middleware = createAuthMiddleware({
  loginPath: "/login",
  defaultRedirect: "/",
  requireRole: "admin",
  forbiddenRedirect: process.env.NEXT_PUBLIC_DEVHUB_URL ?? "/",
  clientRedirect: process.env.NEXT_PUBLIC_PORTAL_URL,
  publicPaths: ["/auth/callback"],
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/cron|api/test|api/ingest|api/debug|api/mcp|api/oauth|api/scan-needs|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
