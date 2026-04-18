import { redirect } from "next/navigation";
import { createPageClient, getAuthenticatedUser } from "@repo/auth/helpers";
import { hasPortalProjectAccess } from "@repo/database/queries/portal-access";
import { getPortalProjectDashboard } from "@repo/database/queries/portal";
import { STATUS_LABELS } from "@repo/database/constants/projects";
import { Badge } from "@repo/ui/badge";
import { ProjectSubnav } from "@/components/projects/project-subnav";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const supabase = await createPageClient();

  const hasAccess = await hasPortalProjectAccess(user.id, id, supabase);
  if (!hasAccess) redirect("/");

  const project = await getPortalProjectDashboard(id, supabase);
  if (!project) redirect("/");

  const statusLabel = STATUS_LABELS[project.status as keyof typeof STATUS_LABELS] ?? project.status;

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border bg-background px-6 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
          <div className="min-w-0 space-y-0.5">
            <h1 className="truncate text-xl font-semibold text-foreground">{project.name}</h1>
            {project.organization ? (
              <p className="truncate text-sm text-muted-foreground">{project.organization.name}</p>
            ) : null}
          </div>
          <Badge variant="secondary">{statusLabel}</Badge>
        </div>
        <ProjectSubnav projectId={project.id} />
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
