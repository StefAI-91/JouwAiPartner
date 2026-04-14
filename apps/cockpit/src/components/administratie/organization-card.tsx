import { Badge } from "@repo/ui/badge";
import { CalendarDays, FolderKanban } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@repo/ui/format";
import type { OrganizationListItem } from "@repo/database/queries/organizations";
import { ORG_TYPE_COLORS, ORG_STATUS_COLORS } from "@/components/shared/organization-colors";
import { ORG_TYPE_LABELS } from "@/components/shared/org-type-labels";

/**
 * Organisatie-kaart voor de administratie-lijst.
 *
 * Zelfde visuele stijl als de kaarten op /clients, maar hergebruikt in de
 * administratie-tabs voor adviseurs en interne organisaties. Klik navigeert
 * naar de bestaande detail-pagina op /clients/[id] — die werkt voor elke
 * organisatie ongeacht type.
 */
export function OrganizationCard({ org }: { org: OrganizationListItem }) {
  return (
    <Link href={`/clients/${org.id}`}>
      <div className="rounded-2xl bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-base font-semibold leading-snug">{org.name}</h3>
          <div className="flex shrink-0 gap-1.5">
            <Badge className={`text-[10px] ${ORG_TYPE_COLORS[org.type] ?? ORG_TYPE_COLORS.other}`}>
              {ORG_TYPE_LABELS[org.type] ?? org.type}
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
            {org.project_count} project{org.project_count !== 1 ? "en" : ""}
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
  );
}
