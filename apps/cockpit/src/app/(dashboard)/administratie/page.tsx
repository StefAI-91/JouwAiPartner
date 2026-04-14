export const dynamic = "force-dynamic";

import { createClient } from "@repo/database/supabase/server";
import { listOrganizationsByType } from "@repo/database/queries/organizations";
import { AddOrganizationButton } from "@/components/clients/add-organization-button";
import { AdministratieTabs } from "@/components/administratie/administratie-tabs";

export default async function AdministratiePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const supabase = await createClient();

  const [advisors, internal] = await Promise.all([
    listOrganizationsByType(["advisor"], supabase),
    listOrganizationsByType(["internal"], supabase),
  ]);

  const totaal = advisors.length + internal.length;

  return (
    <div className="space-y-6 px-4 py-8 lg:px-10">
      <div className="flex items-center justify-between">
        <div>
          <h1>Administratie</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totaal} organisatie{totaal !== 1 ? "s" : ""} — adviseurs en interne entiteiten
          </p>
        </div>
        <AddOrganizationButton />
      </div>

      <AdministratieTabs advisors={advisors} internal={internal} initialTab={tab} />
    </div>
  );
}
