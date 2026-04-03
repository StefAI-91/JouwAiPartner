import Link from "next/link";
import { CalendarDays, CircleCheck } from "lucide-react";
import { StatusPipeline } from "./status-pipeline";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    status: string;
    organization: { name: string } | null;
    last_meeting_date: string | null;
    open_action_count: number;
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <div className="rounded-2xl bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md">
        {/* Organization */}
        {project.organization && (
          <p className="text-xs font-medium text-foreground/70">{project.organization.name}</p>
        )}

        {/* Project name */}
        <h3 className="mt-0.5 font-heading text-base font-semibold leading-snug">{project.name}</h3>

        {/* Status pipeline */}
        <div className="mt-2.5">
          <StatusPipeline status={project.status} />
        </div>

        {/* Metrics row */}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
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
      </div>
    </Link>
  );
}
