import Link from "next/link";
import { Clock, FolderKanban, Zap } from "lucide-react";
import { Badge } from "@repo/ui/badge";
import { daysUntil, formatDateShort } from "@repo/ui/format";
import type { ActiveProjectWithUrgency } from "@repo/database/queries/active-projects-with-urgency";
import { StatusPipeline } from "@/components/projects/status-pipeline";

interface ProjectSwitcherProps {
  projects: ActiveProjectWithUrgency[];
}

export function ProjectSwitcher({ projects }: ProjectSwitcherProps) {
  if (projects.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <FolderKanban className="size-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Actieve projecten
        </h2>
        <span className="text-xs text-muted-foreground">{projects.length}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {projects.map((p) => (
          <ProjectSwitcherCard key={p.id} project={p} />
        ))}
      </div>
    </section>
  );
}

function ProjectSwitcherCard({ project }: { project: ActiveProjectWithUrgency }) {
  const urgent = project.waiting_on_client_count > 0;
  const daysLeft = project.deadline ? daysUntil(project.deadline) : null;
  const deadlineSoon = daysLeft !== null && daysLeft <= 14;

  return (
    <Link
      href={`/projects/${project.id}`}
      className={`block rounded-xl bg-card p-4 ring-1 transition-shadow hover:shadow-md ${
        urgent ? "ring-destructive/30" : "ring-foreground/10"
      }`}
    >
      {project.organization && (
        <p className="text-[11px] font-medium text-muted-foreground">{project.organization.name}</p>
      )}
      <h3 className="mt-0.5 font-heading text-base font-semibold leading-snug">{project.name}</h3>

      <div className="mt-2">
        <StatusPipeline status={project.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {urgent && (
          <Badge variant="destructive" className="gap-1">
            <Zap className="size-3" />
            {project.waiting_on_client_count}× wacht op klant
          </Badge>
        )}
        {project.open_action_count > 0 && !urgent && (
          <Badge variant="outline" className="text-[10px]">
            {project.open_action_count} action item{project.open_action_count !== 1 ? "s" : ""}
          </Badge>
        )}
        {project.deadline && (
          <Badge variant={deadlineSoon ? "destructive" : "outline"} className="gap-1 text-[10px]">
            <Clock className="size-2.5" />
            {formatDateShort(project.deadline)}
          </Badge>
        )}
      </div>
    </Link>
  );
}
