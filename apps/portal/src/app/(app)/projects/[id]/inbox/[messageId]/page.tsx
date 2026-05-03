import { notFound, redirect } from "next/navigation";
import { createPageClient } from "@repo/auth/helpers";
import { getCurrentProfile } from "@repo/auth/access";
import { getPortalProjectDashboard } from "@repo/database/queries/portal";
import { getConversationThread } from "@repo/database/queries/inbox";
import { hasPortalProjectAccess } from "@repo/database/queries/portal/access";
import { PortalConversationView } from "@/components/inbox/portal-conversation-view";

/**
 * CC-006 — Portal conversation-detail. Eén thread, klant-perspectief.
 *
 * Project-scope wordt expliciet doorgegeven aan `getConversationThread`
 * (CC-006-uitbreiding): klanten zitten niet in `devhub_project_access`,
 * dus de standaard team-scoping zou voor portal `null` opleveren.
 */
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string; messageId: string }>;
}) {
  const { id: projectId, messageId } = await params;
  const supabase = await createPageClient();

  const profile = await getCurrentProfile(supabase);
  if (!profile) redirect("/login");

  const allowed = await hasPortalProjectAccess(profile.id, projectId, supabase);
  if (!allowed) notFound();

  const project = await getPortalProjectDashboard(projectId, supabase);
  if (!project) notFound();

  const thread = await getConversationThread("question", messageId, profile.id, supabase, {
    projectIds: [projectId],
  });
  if (!thread || thread.kind !== "question") notFound();
  if (thread.thread.project_id !== projectId) notFound();

  return (
    <PortalConversationView
      thread={thread}
      projectId={projectId}
      projectName={project.name}
      currentProfileId={profile.id}
    />
  );
}
