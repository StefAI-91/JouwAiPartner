"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrganizationsGrid } from "@/components/directory/organizations-grid";
import { PeopleGrid } from "@/components/directory/people-grid";
import { AddOrganizationButton } from "@/components/clients/add-organization-button";
import { AddPersonButton } from "@/components/people/add-person-button";
import type { OrganizationListItem } from "@repo/database/queries/organizations";
import type { PersonListItem } from "@repo/database/queries/people";

interface DirectoryTabsProps {
  organizations: OrganizationListItem[];
  people: PersonListItem[];
}

export function DirectoryTabs({ organizations, people }: DirectoryTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") ?? "clients";

  function switchTab(tab: string) {
    router.replace(`/directory?tab=${tab}`, { scroll: false });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <TabsList>
          <TabsTrigger
            value="clients"
            active={activeTab === "clients"}
            onClick={() => switchTab("clients")}
          >
            Clients ({organizations.length})
          </TabsTrigger>
          <TabsTrigger
            value="people"
            active={activeTab === "people"}
            onClick={() => switchTab("people")}
          >
            People ({people.length})
          </TabsTrigger>
        </TabsList>

        {activeTab === "clients" ? (
          <AddOrganizationButton />
        ) : (
          <AddPersonButton organizations={organizations.map((o) => ({ id: o.id, name: o.name }))} />
        )}
      </div>

      <div className="mt-4">
        {activeTab === "clients" ? (
          <OrganizationsGrid organizations={organizations} />
        ) : (
          <PeopleGrid people={people} />
        )}
      </div>
    </>
  );
}
