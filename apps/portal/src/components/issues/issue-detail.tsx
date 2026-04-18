import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@repo/ui/utils";
import { formatDate } from "@repo/ui/format";
import type { PortalIssue } from "@repo/database/queries/portal";
import {
  STATUS_COLORS,
  STATUS_MAP,
  translateStatus,
  type PortalStatusGroup,
} from "@/lib/issue-status";
import { IssueTypeBadge } from "./issue-type-badge";

interface IssueDetailProps {
  projectId: string;
  issue: PortalIssue;
}

const PROSE_CLASSES = [
  "prose prose-sm max-w-none text-foreground/90",
  "[&_p]:text-sm [&_p]:leading-relaxed [&_p]:my-2",
  "[&_ul]:my-2 [&_ul]:pl-5 [&_ul]:space-y-1",
  "[&_ol]:my-2 [&_ol]:pl-5 [&_ol]:space-y-1",
  "[&_li]:text-sm [&_li]:leading-relaxed",
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs",
  "[&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-xs",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
].join(" ");

export function IssueDetail({ projectId, issue }: IssueDetailProps) {
  const label = translateStatus(issue.status);
  const group = STATUS_MAP[issue.status] as PortalStatusGroup | undefined;
  const colorClass = group ? STATUS_COLORS[group] : "bg-muted text-muted-foreground";

  return (
    <article className="flex flex-col gap-5">
      <Link
        href={`/projects/${projectId}/issues`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Terug naar issues
      </Link>

      <header className="space-y-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-muted-foreground">#{issue.issue_number}</span>
          <span className={cn("rounded-full border px-2 py-0.5", colorClass)}>{label}</span>
          <IssueTypeBadge type={issue.type} />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">{issue.title}</h1>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>Aangemaakt op {formatDate(issue.created_at)}</span>
          {issue.closed_at ? <span>Afgerond op {formatDate(issue.closed_at)}</span> : null}
        </div>
      </header>

      <section className="rounded-lg border border-border bg-card p-5">
        {issue.description ? (
          <div className={PROSE_CLASSES}>
            <Markdown remarkPlugins={[remarkGfm]}>{issue.description}</Markdown>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Geen beschrijving beschikbaar.</p>
        )}
      </section>
    </article>
  );
}
