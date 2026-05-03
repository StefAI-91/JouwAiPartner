import { notFound, redirect } from "next/navigation";
import { createPageClient } from "@repo/auth/helpers";
import { getCurrentProfile } from "@repo/auth/access";
import { getPortalProjectDashboard } from "@repo/database/queries/portal";
import { hasPortalProjectAccess } from "@repo/database/queries/portal/access";
import { getConversationThread, type ConversationThread } from "@repo/database/queries/inbox";
import { listQuestionsForProject } from "@repo/database/queries/client-questions";
import { getProfilePreferences } from "@repo/database/queries/profiles";
import { PortalInboxLayout } from "@/components/inbox/portal-inbox-layout";
import type { InboxFilter } from "@/components/inbox/portal-inbox-list";

/**
 * PR-026 — Two-pane portal-inbox.
 *
 * Catch-all `[[...messageId]]` dekt alle drie de UI-states:
 *   - `/inbox`              → geen selectie (desktop: empty-pane, mobile: alleen lijst)
 *   - `/inbox/<uuid>`       → thread geopend (desktop: rechts, mobile: alleen detail)
 *   - `/inbox/new`          → compose-pane (sentinel-string, geen uuid)
 *
 * `?status=open|responded` filtert de lijst client-side display (we halen
 * altijd alle threads op zodat de tab-counts kloppen). Geen DB-roundtrip
 * verschil tussen tabs.
 *
 * Eén server-fetch per page-render. Lijst + thread (indien geselecteerd) +
 * project-meta + preferences in `Promise.all`. Geen extra DB-roundtrips
 * t.o.v. de pre-PR-026 split-route variant.
 */
export default async function PortalInboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; messageId?: string[] }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id: projectId, messageId } = await params;
  const { status } = await searchParams;
  const filter: InboxFilter = status === "open" || status === "responded" ? status : "all";
  const selectedId = messageId?.[0];

  const supabase = await createPageClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) redirect("/login");

  const allowed = await hasPortalProjectAccess(profile.id, projectId, supabase);
  if (!allowed) notFound();

  const project = await getPortalProjectDashboard(projectId, supabase);
  if (!project) notFound();
  if (!project.organization) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 lg:px-12 lg:py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Berichten</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Dit project heeft geen gekoppelde organisatie. Neem contact op met het team.
        </p>
      </div>
    );
  }

  const isComposeRoute = selectedId === "new";
  const threadId = !isComposeRoute ? selectedId : undefined;

  const [questions, thread, preferences] = await Promise.all([
    listQuestionsForProject(project.id, project.organization.id, {}, supabase),
    threadId
      ? getConversationThread("question", threadId, profile.id, supabase, {
          projectIds: [projectId],
        })
      : Promise.resolve(null),
    getProfilePreferences(profile.id, supabase),
  ]);

  // Defense-in-depth — als de thread niet bestaat of niet bij dit project hoort
  // (RLS zou dit al pakken), val terug op een 404 i.p.v. een lege right-pane.
  if (threadId) {
    if (!thread || thread.kind !== "question") notFound();
    if (thread.thread.project_id !== projectId) notFound();
  }

  const showOnboarding = !preferences.dismissed_onboarding?.portal_inbox;

  return (
    <PortalInboxLayout
      projectId={project.id}
      projectName={project.name}
      organizationName={project.organization.name}
      questions={questions}
      selectedId={selectedId}
      thread={thread as Extract<ConversationThread, { kind: "question" }> | null}
      currentProfileId={profile.id}
      showOnboarding={showOnboarding}
      filter={filter}
    />
  );
}
