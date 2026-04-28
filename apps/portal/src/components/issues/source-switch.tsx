import Link from "next/link";
import { cn } from "@repo/ui/utils";
import {
  PORTAL_SOURCE_GROUPS,
  type IssueType,
  type PortalSourceGroupKey,
} from "@repo/database/constants/issues";
import { buildIssuesHref } from "./issues-href";

interface SourceSwitchProps {
  projectId: string;
  active: PortalSourceGroupKey | null;
  type: IssueType | null;
}

/**
 * Tabs voor het filteren op herkomst: Alles / Onze meldingen / JAIP-meldingen.
 * Behoudt de actieve type-filter via `buildIssuesHref` zodat klikken op een
 * source-tab geen ander filter wist (CP-008 BUCKET-V1-05/-06: orthogonaal).
 */
export function SourceSwitch({ projectId, active, type }: SourceSwitchProps) {
  const tabs: { key: PortalSourceGroupKey | null; label: string }[] = [
    { key: null, label: "Alles" },
    ...PORTAL_SOURCE_GROUPS.map((g) => ({
      key: g.key as PortalSourceGroupKey,
      label: g.label,
    })),
  ];

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="tablist"
      aria-label="Filter op herkomst"
    >
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <Link
            key={tab.label}
            href={buildIssuesHref(projectId, { source: tab.key, type })}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
