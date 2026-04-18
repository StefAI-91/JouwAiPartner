import Link from "next/link";
import { cn } from "@repo/ui/utils";
import { PORTAL_STATUS_GROUPS, type PortalStatusKey } from "@repo/database/constants/issues";

interface IssueStatusFilterProps {
  projectId: string;
  active: PortalStatusKey | null;
}

export function IssueStatusFilter({ projectId, active }: IssueStatusFilterProps) {
  const base = `/projects/${projectId}/issues`;

  const filters: { key: PortalStatusKey | null; label: string }[] = [
    { key: null, label: "Alle" },
    ...PORTAL_STATUS_GROUPS.map((g) => ({ key: g.key as PortalStatusKey, label: g.label })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.map((filter) => {
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
