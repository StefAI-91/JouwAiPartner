import Link from "next/link";
import { STATUS_LABELS } from "@repo/database/constants/projects";
import { Badge } from "@repo/ui/badge";
import { timeAgoDays } from "@repo/ui/format";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    status: string;
    organization: { id: string; name: string } | null;
    last_activity_at: string | null;
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  const statusLabel = STATUS_LABELS[project.status as keyof typeof STATUS_LABELS] ?? project.status;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h3 className="truncate text-base font-semibold text-foreground group-hover:text-primary">
            {project.name}
          </h3>
          {project.organization ? (
            <p className="truncate text-sm text-muted-foreground">{project.organization.name}</p>
          ) : null}
        </div>
        <Badge variant="secondary" className="shrink-0">
          {statusLabel}
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground">
        {project.last_activity_at
          ? `Laatste activiteit ${timeAgoDays(project.last_activity_at)}`
          : "Nog geen activiteit"}
      </div>
    </Link>
  );
}
