import Link from "next/link";
import { CalendarDays, CircleCheck, Clock, User } from "lucide-react";
import { daysUntil } from "@repo/ui/format";
import { ProjectStatusBadge } from "./project-status-badge";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    status: string;
    organization: { name: string } | null;
    last_meeting_date: string | null;
    open_action_count: number;
    deadline: string | null;
    owner: { name: string } | null;
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  const daysLeft = project.deadline ? daysUntil(project.deadline) : null;
  const hasMeta = Boolean(
    project.owner || project.deadline || project.last_meeting_date || project.open_action_count > 0,
  );

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="rounded-2xl bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md">
        {project.organization && (
          <p className="text-xs font-medium text-foreground/70">{project.organization.name}</p>
        )}

        <h3 className="mt-0.5 font-heading text-base font-semibold leading-snug">{project.name}</h3>

        <div className="mt-2.5">
          <ProjectStatusBadge status={project.status} />
        </div>

        {hasMeta && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {project.owner && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {project.owner.name}
              </span>
            )}
            {project.deadline && (
              <span
                className={`flex items-center gap-1 ${daysLeft !== null && daysLeft < 14 ? "text-foreground/70" : ""}`}
              >
                <Clock className="h-3.5 w-3.5" />
                {daysLeft !== null && daysLeft > 0
                  ? `${daysLeft}d`
                  : daysLeft === 0
                    ? "Vandaag"
                    : "Overdue"}
              </span>
            )}
            {project.last_meeting_date && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(project.last_meeting_date).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}
            {project.open_action_count > 0 && (
              <span className="flex items-center gap-1">
                <CircleCheck className="h-3.5 w-3.5" />
                {project.open_action_count} action item{project.open_action_count !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
