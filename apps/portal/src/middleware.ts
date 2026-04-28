import { createAuthMiddleware } from "@repo/auth/middleware";

// Portal is voor clients, maar admins mogen ook binnen om het portaal te
// previewen vanuit intern perspectief (cross-quadrant view). Members horen
// hier niet en worden naar devhub geredirect als ze hier landen.
export const middleware = createAuthMiddleware({
  loginPath: "/login",
  defaultRedirect: "/",
  requireRole: ["admin", "client"],
  forbiddenRedirect: process.env.NEXT_PUBLIC_DEVHUB_URL ?? "/login",
  publicPaths: ["/auth/callback", "/design-preview"],
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/.*|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
