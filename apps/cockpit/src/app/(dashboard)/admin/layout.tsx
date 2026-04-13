import { requireAdmin } from "@repo/auth/access";

// SEC-190: extra layer-defense. Middleware blokkeert al non-admins voor de
// hele cockpit (DH-015), maar een directe URL-hit op /admin/* moet óók hier
// geweigerd worden zodat toekomstige route-matchers-tweaks geen gap laten.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
