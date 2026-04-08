export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@repo/database/supabase/server";
import { getDraftEmailById } from "@repo/database/queries/emails";
import { listOrganizations } from "@repo/database/queries/organizations";
import { listProjects } from "@repo/database/queries/projects";
import { EmailReviewDetail } from "@/components/review/email-review-detail";
import { EmailLinkEditor } from "@/components/emails/email-link-editor";

export default async function EmailReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [email, organizations, projects] = await Promise.all([
    getDraftEmailById(id, supabase),
    listOrganizations(supabase),
    listProjects(supabase),
  ]);

  if (!email) notFound();

  return (
    <div className="space-y-6 px-4 py-8 lg:px-10">
      <Link
        href="/review"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Terug naar review queue
      </Link>

      <EmailLinkEditor
        emailId={email.id}
        currentOrganization={email.organization}
        linkedProjects={email.projects}
        allOrganizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
        allProjects={projects.map((p) => ({ id: p.id, name: p.name }))}
        emailType={email.email_type ?? null}
        partyType={email.party_type ?? null}
      />

      <EmailReviewDetail email={email} />
    </div>
  );
}
