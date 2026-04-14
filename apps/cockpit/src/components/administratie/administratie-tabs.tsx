"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Briefcase, Building2 } from "lucide-react";
import type { OrganizationListItem } from "@repo/database/queries/organizations";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui/tabs";
import { OrganizationCard } from "./organization-card";
import { AddOrganizationButton } from "@/components/clients/add-organization-button";

const TAB_ADVISORS = "adviseurs";
const TAB_INTERNAL = "intern";
const VALID_TABS = [TAB_ADVISORS, TAB_INTERNAL] as const;
type TabValue = (typeof VALID_TABS)[number];

function normalizeTab(value: string | null | undefined): TabValue {
  return value && (VALID_TABS as readonly string[]).includes(value)
    ? (value as TabValue)
    : TAB_ADVISORS;
}

export function AdministratieTabs({
  advisors,
  internal,
  initialTab,
}: {
  advisors: OrganizationListItem[];
  internal: OrganizationListItem[];
  initialTab: string | undefined;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const active = normalizeTab(initialTab);

  const handleChange = useCallback(
    (value: unknown) => {
      const next = normalizeTab(typeof value === "string" ? value : null);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <Tabs value={active} onValueChange={handleChange}>
      <TabsList>
        <TabsTrigger value={TAB_ADVISORS}>
          Adviseurs
          <span className="ml-2 text-xs text-muted-foreground">{advisors.length}</span>
        </TabsTrigger>
        <TabsTrigger value={TAB_INTERNAL}>
          Intern
          <span className="ml-2 text-xs text-muted-foreground">{internal.length}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value={TAB_ADVISORS}>
        {advisors.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="Nog geen adviseurs"
            description="Voeg je boekhouder, fiscalist of jurist toe om hun correspondentie hier te groeperen."
          />
        ) : (
          <OrganizationGrid orgs={advisors} />
        )}
      </TabsContent>

      <TabsContent value={TAB_INTERNAL}>
        {internal.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Nog geen interne organisaties"
            description="Je eigen bedrijfsentiteit hoort hier — voeg die toe via de knop hierboven."
          />
        ) : (
          <OrganizationGrid orgs={internal} />
        )}
      </TabsContent>
    </Tabs>
  );
}

function OrganizationGrid({ orgs }: { orgs: OrganizationListItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {orgs.map((org) => (
        <OrganizationCard key={org.id} org={org} />
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-muted-foreground/30 bg-white/40 px-6 py-12 text-center">
      <Icon className="mx-auto h-10 w-10 text-muted-foreground/40" />
      <h3 className="mt-4 font-heading text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex justify-center">
        <AddOrganizationButton />
      </div>
    </div>
  );
}
