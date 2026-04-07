export const dynamic = "force-dynamic";

import { createClient } from "@repo/database/supabase/server";
import { getOrganizationById } from "@repo/database/queries/organizations";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Mail, User, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatDate } from "@/lib/format";
import { ORG_TYPE_COLORS, ORG_STATUS_COLORS } from "@/components/shared/organization-colors";
import { getMeetingHref } from "@/lib/meeting-href";
import { EditOrganization } from "@/components/clients/edit-organization";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const org = await getOrganizationById(id, supabase);

  if (!org) notFound();

  return (
    <div className="space-y-8 px-4 py-8 lg:px-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/clients" className="hover:underline">
            Clients
          </Link>
          <span>/</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <h1>{org.name}</h1>
          <EditOrganization org={org} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Badge className={`text-xs ${ORG_TYPE_COLORS[org.type] ?? ORG_TYPE_COLORS.other}`}>
            {org.type}
          </Badge>
          <Badge
            className={`text-xs ${ORG_STATUS_COLORS[org.status] ?? ORG_STATUS_COLORS.inactive}`}
          >
            {org.status}
          </Badge>
        </div>

        {/* Contact info */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {org.contact_person && (
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {org.contact_person}
            </span>
          )}
          {org.email && (
            <span className="flex items-center gap-1.5">
              <Mail className="h-4 w-4" />
              {org.email}
            </span>
          )}
        </div>
      </div>

      {/* Projects */}
      <Card>
        <CardHeader className="border-b border-border/50">
          <CardTitle>Projects ({org.projects.length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {org.projects.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No projects linked to this organization.
            </p>
          ) : (
            <ul className="-mx-1">
              {org.projects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="group flex items-center gap-3 rounded-lg px-2.5 py-3 transition-all hover:bg-muted/60"
                  >
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{project.name}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {project.status}
                    </Badge>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Meetings */}
      <Card>
        <CardHeader className="border-b border-border/50">
          <CardTitle>Meetings ({org.meetings.length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {org.meetings.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No meetings linked to this organization.
            </p>
          ) : (
            <ul className="-mx-1">
              {org.meetings.map((meeting) => {
                const isVerified = meeting.verification_status === "verified";
                const href = getMeetingHref(meeting.id, meeting.verification_status);
                return (
                  <li key={meeting.id}>
                    <Link
                      href={href}
                      className="group flex items-center gap-3 rounded-lg px-2.5 py-3 transition-all hover:bg-muted/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {meeting.title ?? "Untitled"}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                          {meeting.date && <span>{formatDate(meeting.date)}</span>}
                          {meeting.meeting_type && (
                            <span className="rounded-md bg-muted px-1.5 py-px font-medium">
                              {meeting.meeting_type.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                      </div>
                      {isVerified ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#006B3F]" />
                      ) : (
                        <Badge variant="secondary" className="h-5 gap-1 text-[10px] font-medium">
                          <Clock className="h-2.5 w-2.5" />
                          review
                        </Badge>
                      )}
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
