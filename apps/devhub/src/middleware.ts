import { createAuthMiddleware } from "@repo/auth/middleware";

export const middleware = createAuthMiddleware({
  publicPaths: ["/auth/callback"],
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/.*|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
