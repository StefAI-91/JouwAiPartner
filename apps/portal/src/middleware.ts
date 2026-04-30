import { createAuthMiddleware } from "@repo/auth/middleware";

// Portal is voor clients en admins (preview-modus). Members mogen ook binnen
// op basis van per-project portal_project_access — toegang wordt op de
// query-laag (`listPortalProjects` / `hasPortalProjectAccess`) gefilterd, niet
// op rol. Members zonder access-rijen krijgen een lege project-lijst, niet
// een redirect. Onbekende rollen blijven naar devhub geredirect (PR-024).
export const middleware = createAuthMiddleware({
  loginPath: "/login",
  defaultRedirect: "/",
  requireRole: ["admin", "member", "client"],
  forbiddenRedirect: process.env.NEXT_PUBLIC_DEVHUB_URL ?? "/login",
  publicPaths: ["/auth/callback"],
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/.*|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
