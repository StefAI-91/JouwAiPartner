"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@repo/ui/utils";
import { OrganizationsGrid } from "./organizations-grid";
import { PeopleGrid } from "./people-grid";
import { AddOrganizationButton } from "./add-organization-button";
import { AddPersonButton } from "./add-person-button";
import type { OrganizationListItem } from "@repo/database/queries/organizations";
import type { PersonListItem } from "@repo/database/queries/people";

interface DirectoryTabsProps {
  organizations: OrganizationListItem[];
  people: PersonListItem[];
}

const tabBase =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/50";
const tabActive = "bg-background text-foreground shadow-sm dark:bg-card";
const tabInactive = "text-muted-foreground hover:text-foreground";

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
        <div
          role="tablist"
          aria-label="Directory"
          className="inline-flex items-center gap-1 rounded-lg bg-muted p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "clients"}
            onClick={() => switchTab("clients")}
            className={cn(tabBase, activeTab === "clients" ? tabActive : tabInactive)}
          >
            Clients ({organizations.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "people"}
            onClick={() => switchTab("people")}
            className={cn(tabBase, activeTab === "people" ? tabActive : tabInactive)}
          >
            People ({people.length})
          </button>
        </div>

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
