export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { createClient } from "@repo/database/supabase/server";
import { listOrganizations } from "@repo/database/queries/organizations";
import { listPeople } from "@repo/database/queries/people";
import { DirectoryTabs } from "@/components/directory/directory-tabs";

export default async function DirectoryPage() {
  const supabase = await createClient();
  const [organizations, people] = await Promise.all([
    listOrganizations(supabase),
    listPeople(supabase),
  ]);

  return (
    <div className="space-y-4 px-4 py-8 lg:px-10">
      <div>
        <h1>Directory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {organizations.length} organization{organizations.length !== 1 ? "s" : ""},{" "}
          {people.length} {people.length !== 1 ? "people" : "person"}
        </p>
      </div>

      <Suspense>
        <DirectoryTabs organizations={organizations} people={people} />
      </Suspense>
    </div>
  );
}
