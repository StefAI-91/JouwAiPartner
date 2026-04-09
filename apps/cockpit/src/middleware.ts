import { createAuthMiddleware } from "@repo/auth/middleware";

export const middleware = createAuthMiddleware();

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/cron|api/test|api/ingest|api/debug|api/mcp|api/oauth|api/scan-needs|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
