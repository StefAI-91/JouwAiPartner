import Link from "next/link";
import { Clock, ExternalLink, Users } from "lucide-react";
import { Badge } from "@repo/ui/badge";
import { daysUntil, formatDate } from "@repo/ui/format";
import { StatusPipeline } from "@/components/projects/status-pipeline";
import { EditProject } from "@/components/projects/edit-project";

interface WorkspaceHeaderProps {
  project: {
    id: string;
    name: string;
    status: string;
    description: string | null;
    github_url: string | null;
    organization_id: string | null;
    organization: { name: string } | null;
    deadline: string | null;
    owner: { id: string; name: string } | null;
    contact_person: { id: string; name: string } | null;
  };
  organizations: { id: string; name: string }[];
  people: { id: string; name: string }[];
}

export function WorkspaceHeader({ project, organizations, people }: WorkspaceHeaderProps) {
  const daysLeft = project.deadline ? daysUntil(project.deadline) : null;
  const teamMembers = [project.owner, project.contact_person].filter(
    (p): p is { id: string; name: string } => p !== null,
  );

  return (
    <header className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {project.organization && (
            <p className="text-sm font-medium text-foreground/70">{project.organization.name}</p>
          )}
          <div className="mt-0.5 flex items-center gap-2">
            <h1 className="font-heading text-3xl font-bold leading-tight">{project.name}</h1>
            <EditProject
              project={project}
              organizationId={project.organization_id}
              organizations={organizations}
              people={people}
            />
          </div>
          {project.github_url && (
            <Link
              href={project.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ExternalLink className="size-3.5" />
              {project.github_url.replace(/^https?:\/\/(www\.)?github\.com\//, "")}
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {project.deadline && (
            <Badge
              variant={daysLeft !== null && daysLeft < 14 ? "destructive" : "outline"}
              className="gap-1"
            >
              <Clock className="size-3" />
              Deadline {formatDate(project.deadline)}
            </Badge>
          )}
          {teamMembers.length > 0 && (
            <Badge variant="outline" className="gap-1">
              <Users className="size-3" />
              {teamMembers.map((p) => p.name).join(", ")}
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-4">
        <StatusPipeline status={project.status} size="lg" />
      </div>
    </header>
  );
}
