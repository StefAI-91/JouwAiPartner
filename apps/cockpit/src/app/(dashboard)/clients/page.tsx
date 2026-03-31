export const dynamic = "force-dynamic";

import { createClient } from "@repo/database/supabase/server";
import { listOrganizations } from "@repo/database/queries/organizations";
import { Badge } from "@/components/ui/badge";
import { Building2, CalendarDays, FolderKanban } from "lucide-react";
import Link from "next/link";

const TYPE_COLORS: Record<string, string> = {
  client: "bg-blue-100 text-blue-800",
  partner: "bg-purple-100 text-purple-800",
  supplier: "bg-orange-100 text-orange-800",
  other: "bg-gray-100 text-gray-800",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  prospect: "bg-amber-100 text-amber-800",
  inactive: "bg-gray-100 text-gray-500",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ClientsPage() {
  const supabase = await createClient();
  const organizations = await listOrganizations(supabase);

  if (organizations.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <h2 className="mt-4 font-heading text-xl font-semibold">No organizations yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Organizations will appear here once meetings are processed.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1>Clients</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {organizations.length} organization{organizations.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="space-y-3">
        {organizations.map((org) => (
          <Link key={org.id} href={`/clients/${org.id}`}>
            <div className="rounded-[2rem] bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              {/* Name + badges */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-heading text-lg font-semibold leading-snug">{org.name}</h3>
                <div className="flex shrink-0 gap-1.5">
                  <Badge className={`text-[10px] ${TYPE_COLORS[org.type] ?? TYPE_COLORS.other}`}>
                    {org.type}
                  </Badge>
                  <Badge
                    className={`text-[10px] ${STATUS_COLORS[org.status] ?? STATUS_COLORS.inactive}`}
                  >
                    {org.status}
                  </Badge>
                </div>
              </div>

              {/* Meta row */}
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
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
    </div>
  );
}
