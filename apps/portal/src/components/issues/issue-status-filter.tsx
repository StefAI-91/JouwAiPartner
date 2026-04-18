import Link from "next/link";
import { cn } from "@repo/ui/utils";
import type { PortalStatusFilter } from "@repo/database/queries/portal";

interface IssueStatusFilterProps {
  projectId: string;
  active: PortalStatusFilter | null;
}

const FILTERS: { key: PortalStatusFilter | null; label: string }[] = [
  { key: null, label: "Alle" },
  { key: "ontvangen", label: "Ontvangen" },
  { key: "ingepland", label: "Ingepland" },
  { key: "in_behandeling", label: "In behandeling" },
  { key: "afgerond", label: "Afgerond" },
];

export function IssueStatusFilter({ projectId, active }: IssueStatusFilterProps) {
  const base = `/projects/${projectId}/issues`;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {FILTERS.map((filter) => {
        const href = filter.key ? `${base}?status=${filter.key}` : base;
        const isActive = active === filter.key;
        return (
          <Link
            key={filter.label}
            href={href}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}
