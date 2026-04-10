import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { TypeBadge } from "@/components/shared/type-badge";
import { ComponentBadge } from "@/components/shared/component-badge";

interface IssueHeaderProps {
  issueNumber: number;
  title: string;
  status: string;
  priority: string;
  type: string;
  component: string | null;
  projectId: string;
}

export function IssueHeader({
  issueNumber,
  title,
  status,
  priority,
  type,
  component,
  projectId,
}: IssueHeaderProps) {
  return (
    <div className="mb-6">
      <Link
        href={`/issues?project=${projectId}`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Terug naar issues
      </Link>

      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2">
            <span className="font-mono text-base font-normal text-muted-foreground">
              #{issueNumber}
            </span>
            {title}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={status} />
            <PriorityBadge priority={priority} />
            <TypeBadge type={type} />
            {component && <ComponentBadge component={component} />}
          </div>
        </div>
      </div>
    </div>
  );
}
