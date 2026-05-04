import { createClient } from "@repo/database/supabase/server";
import { getCurrentProfile } from "@repo/auth/access";
import { countInboxItemsForTeam } from "@repo/database/queries/inbox";
import { ProjectTabs } from "@/features/projects/components/project-tabs";

// CC-005 — layout boven elke `/projects/[id]/...` sub-route. Houdt tabs-nav
// stabiel zichtbaar tussen Overzicht / Activiteit / Inzichten / Inbox.
// Async zodat we de inbox-badge (open vragen + items voor PM-review) kunnen
// tonen op de Inbox-tab. Faalt count-fetch dan tonen we geen badge — geen
// blocking error, het is een nice-to-have signal.

export default async function ProjectLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);

  let inboxBadge = 0;
  if (profile) {
    const counts = await countInboxItemsForTeam(profile.id, { projectId: id }, supabase);
    inboxBadge = counts.pmReview + counts.openQuestions;
  }

  return (
    <div className="flex min-h-full flex-col">
      <ProjectTabs projectId={id} inboxBadge={inboxBadge} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
