import { requireAdmin } from "@repo/auth/access";

// Admin-only dev tools. Middleware blokkeert al non-admins op cockpit-level,
// maar dit is een extra defense-in-depth net zoals de /admin layout.
export default async function DevLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
