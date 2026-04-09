import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Building2, CalendarDays, FolderKanban } from "lucide-react";
import { formatDate } from "@/lib/format";
import { ORG_TYPE_COLORS, ORG_STATUS_COLORS } from "@/components/shared/organization-colors";
import type { OrganizationListItem } from "@repo/database/queries/organizations";

export function OrganizationsGrid({ organizations }: { organizations: OrganizationListItem[] }) {
  if (organizations.length === 0) {
    return (
      <div className="py-12 text-center">
        <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <h3 className="mt-4 font-heading text-lg font-semibold">No organizations yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Organizations will appear here once meetings are processed.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {organizations.map((org) => (
        <Link key={org.id} href={`/clients/${org.id}`}>
          <div className="rounded-2xl bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-heading text-base font-semibold leading-snug">{org.name}</h3>
              <div className="flex shrink-0 gap-1.5">
                <Badge
                  className={`text-[10px] ${ORG_TYPE_COLORS[org.type] ?? ORG_TYPE_COLORS.other}`}
                >
                  {org.type}
                </Badge>
                <Badge
                  className={`text-[10px] ${ORG_STATUS_COLORS[org.status] ?? ORG_STATUS_COLORS.inactive}`}
                >
                  {org.status}
                </Badge>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FolderKanban className="h-3.5 w-3.5" />
                {org.project_count} project{org.project_count !== 1 ? "s" : ""}
              </span>
              {org.last_meeting_date && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(org.last_meeting_date)}
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
