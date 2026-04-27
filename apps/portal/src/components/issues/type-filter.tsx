import Link from "next/link";
import { cn } from "@repo/ui/utils";
import type { IssueType, PortalSourceGroupKey } from "@repo/database/constants/issues";
import { buildIssuesHref } from "./issues-href";

const TYPE_TABS: { key: IssueType | null; label: string }[] = [
  { key: null, label: "Alles" },
  { key: "bug", label: "Bugs" },
  { key: "feature_request", label: "Features" },
  { key: "question", label: "Vragen" },
];

interface TypeFilterProps {
  projectId: string;
  active: IssueType | null;
  source: PortalSourceGroupKey | null;
}

/**
 * Tabs voor het filteren op issue-type. Orthogonaal aan de source-switch:
 * klikken op een type-tab behoudt de actieve source via `buildIssuesHref`.
 */
export function TypeFilter({ projectId, active, source }: TypeFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filter op type">
      {TYPE_TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <Link
            key={tab.label}
            href={buildIssuesHref(projectId, { source, type: tab.key })}
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
