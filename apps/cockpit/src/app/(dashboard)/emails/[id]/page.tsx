export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { ArrowLeft, Paperclip, Clock } from "lucide-react";
import Link from "next/link";
import { createClient } from "@repo/database/supabase/server";
import { getEmailById } from "@repo/database/queries/emails";
import { listOrganizations } from "@repo/database/queries/organizations";
import { listProjects } from "@repo/database/queries/projects";
import { listPeople } from "@repo/database/queries/people";
import { Badge } from "@repo/ui/badge";
import { EmailLinkEditor } from "@/features/emails/components/email-link-editor";
import { FilteredBanner } from "@/features/emails/components/filtered-banner";

function formatExtractionType(type: string): string {
  const map: Record<string, string> = {
    decision: "Besluit",
    action_item: "Actiepunt",
    need: "Behoefte",
    insight: "Inzicht",
    project_update: "Project update",
    request: "Verzoek",
  };
  return map[type] ?? type;
}

function urgencyColor(urgency: string): string {
  if (urgency === "high") return "bg-red-100 text-red-700";
  if (urgency === "medium") return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-600";
}

export default async function EmailDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [email, organizations, projects, people] = await Promise.all([
    getEmailById(id, supabase),
    listOrganizations(supabase),
    listProjects(supabase),
    listPeople(supabase),
  ]);

  if (!email) notFound();

  return (
    <div className="space-y-6 px-4 py-8 lg:px-10">
      {/* Back link */}
      <Link
        href="/emails"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Terug naar emails
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold">{email.subject ?? "(geen onderwerp)"}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>
            Van:{" "}
            <span className="font-medium text-foreground">
              {email.from_name ?? email.from_address}
            </span>
            {email.from_name && <span className="ml-1">({email.from_address})</span>}
          </span>
          <span>Aan: {email.to_addresses.join(", ")}</span>
          {email.cc_addresses.length > 0 && <span>CC: {email.cc_addresses.join(", ")}</span>}
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {new Date(email.date).toLocaleString("nl-NL", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {email.has_attachments && (
            <span className="flex items-center gap-1">
              <Paperclip className="h-3.5 w-3.5" />
              Bijlagen
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {email.verification_status === "draft" && (
            <Badge className="bg-amber-100 text-amber-700">Draft</Badge>
          )}
          {email.verification_status === "verified" && (
            <Badge className="bg-green-100 text-green-700">Verified</Badge>
          )}
          {email.filter_status === "filtered" && (
            <Badge className="bg-slate-200 text-slate-700">Gefilterd</Badge>
          )}
        </div>
      </div>

      {/* Filter banner with unfilter action */}
      {email.filter_status === "filtered" && (
        <FilteredBanner emailId={email.id} filterReason={email.filter_reason} />
      )}

      {/* Manual link editor */}
      <EmailLinkEditor
        emailId={email.id}
        currentOrganization={email.organization}
        linkedProjects={email.projects}
        allOrganizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
        allProjects={projects.map((p) => ({ id: p.id, name: p.name }))}
        emailType={email.email_type ?? null}
        partyType={email.party_type ?? null}
        senderPerson={email.sender_person ?? null}
        allPeople={people.map((p) => ({ id: p.id, name: p.name, role: p.role }))}
      />

      {/* Email body */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Email inhoud
        </h2>
        {email.body_text ? (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">
            {email.body_text}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Geen tekstinhoud beschikbaar.</p>
        )}
      </div>

      {/* Extractions */}
      {email.extractions.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            AI Extracties ({email.extractions.length})
          </h2>
          <div className="space-y-3">
            {email.extractions.map((ex) => (
              <div key={ex.id} className="rounded-lg border border-border/50 bg-muted/20 p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {formatExtractionType(ex.type)}
                  </Badge>
                  {ex.confidence !== null && (
                    <span className="text-[11px] text-muted-foreground">
                      {Math.round(ex.confidence * 100)}% zekerheid
                    </span>
                  )}
                  {(() => {
                    const meta = ex.metadata as Record<string, unknown>;
                    const urgency = typeof meta?.urgency === "string" ? meta.urgency : null;
                    if (!urgency) return null;
                    return (
                      <Badge className={`text-[10px] ${urgencyColor(urgency)}`}>{urgency}</Badge>
                    );
                  })()}
                </div>
                <p className="mt-2 text-sm">{ex.content}</p>
                {ex.source_ref && (
                  <blockquote className="mt-2 border-l-2 border-muted pl-3 text-xs text-muted-foreground italic">
                    {ex.source_ref}
                  </blockquote>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
