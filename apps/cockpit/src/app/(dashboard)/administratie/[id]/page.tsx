export const dynamic = "force-dynamic";

import { createClient } from "@repo/database/supabase/server";
import { getOrganizationById } from "@repo/database/queries/organizations";
import { listPeopleByOrganization } from "@repo/database/queries/people";
import { listEmailsByOrganization } from "@repo/database/queries/emails";
import { Badge } from "@repo/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Mail, User, Globe, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ORG_TYPE_COLORS, ORG_STATUS_COLORS } from "@/components/shared/organization-colors";
import { ORG_TYPE_LABELS } from "@/components/shared/org-type-labels";
import { EditOrganization } from "@/components/clients/edit-organization";
import { AdministratieEmails } from "@/components/administratie/administratie-emails";
import { OrgSummary } from "@/components/organizations/org-summary";
import { OrgBriefing } from "@/components/organizations/org-briefing";
import { OrgTimeline } from "@/components/organizations/org-timeline";
import { RegenerateSummaryButton } from "@/components/projects/regenerate-summary-button";

// Types die thuishoren onder /administratie. Andere types (client, partner)
// horen onder /clients — we redirecten daarheen om een verwarrende detail-
// view te voorkomen waar contactpersonen en e-mails geen logische plek hebben.
const ADMINISTRATIE_TYPES = ["advisor", "internal", "supplier"];

interface AdministratieDetailProps {
  params: Promise<{ id: string }>;
}

export default async function AdministratieDetailPage({ params }: AdministratieDetailProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [org, people, emailResult] = await Promise.all([
    getOrganizationById(id, supabase),
    listPeopleByOrganization(id, supabase),
    listEmailsByOrganization(id, { client: supabase, limit: 50 }),
  ]);

  if (!org) notFound();
  if (!ADMINISTRATIE_TYPES.includes(org.type)) {
    redirect(`/clients/${id}`);
  }

  // Extract timeline from briefing structured_content
  const structuredContent = org.briefing_summary?.structured_content;
  const timeline =
    structuredContent && Array.isArray((structuredContent as Record<string, unknown>).timeline)
      ? ((structuredContent as Record<string, unknown>).timeline as {
          date: string;
          source_type: "meeting" | "email";
          title: string;
          summary: string;
          key_decisions: string[];
          open_actions: string[];
        }[])
      : [];

  const hasSummary = Boolean(org.context_summary || org.briefing_summary);

  return (
    <div className="space-y-8 px-4 py-8 lg:px-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/administratie" className="hover:underline">
            Administratie
          </Link>
          <span>/</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <h1>{org.name}</h1>
          <EditOrganization org={org} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Badge className={`text-xs ${ORG_TYPE_COLORS[org.type] ?? ORG_TYPE_COLORS.other}`}>
            {ORG_TYPE_LABELS[org.type] ?? org.type}
          </Badge>
          <Badge
            className={`text-xs ${ORG_STATUS_COLORS[org.status] ?? ORG_STATUS_COLORS.inactive}`}
          >
            {org.status}
          </Badge>
        </div>

        {/* Contact + domeinen */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
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
          {org.email_domains.length > 0 && (
            <span className="flex items-center gap-1.5">
              <Globe className="h-4 w-4" />
              <span className="flex flex-wrap gap-1">
                {org.email_domains.map((d) => (
                  <Badge key={d} variant="outline" className="text-[10px]">
                    {d}
                  </Badge>
                ))}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* AI Samenvattingen */}
      {hasSummary && (
        <div className="space-y-4">
          <OrgSummary
            content={org.context_summary?.content ?? null}
            createdAt={org.context_summary?.created_at}
          />
          <OrgBriefing
            content={org.briefing_summary?.content ?? null}
            createdAt={org.briefing_summary?.created_at}
          />
          {timeline.length > 0 && <OrgTimeline timeline={timeline} />}
          <div className="flex justify-end">
            <RegenerateSummaryButton entityType="organization" entityId={org.id} />
          </div>
        </div>
      )}
      {!hasSummary && (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border/50 bg-muted/20 px-5 py-4">
          <p className="text-sm text-muted-foreground">
            Nog geen AI-briefing voor deze organisatie. Genereer er een op basis van verified
            meetings en e-mails.
          </p>
          <RegenerateSummaryButton entityType="organization" entityId={org.id} />
        </div>
      )}

      {/* Contactpersonen */}
      <Card>
        <CardHeader className="border-b border-border/50">
          <CardTitle>Contactpersonen ({people.length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {people.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                Nog geen contactpersonen gekoppeld. Voeg een persoon toe via Directory en koppel die
                aan deze organisatie.
              </p>
            </div>
          ) : (
            <ul className="-mx-1">
              {people.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg px-2.5 py-3 transition-all hover:bg-muted/60"
                >
                  <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      {p.email && <span className="truncate">{p.email}</span>}
                      {p.role && (
                        <span className="rounded-md bg-muted px-1.5 py-px font-medium">
                          {p.role}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* E-mails */}
      <AdministratieEmails emails={emailResult.items} total={emailResult.count} />
    </div>
  );
}
