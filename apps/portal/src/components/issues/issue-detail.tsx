import Link from "next/link";
import { ArrowLeft, Inbox, Shield } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatDate, timeAgoDays } from "@repo/ui/format";
import { resolvePortalSourceGroup } from "@repo/database/constants/issues";
import type { PortalIssue } from "@repo/database/queries/portal";
import { IssueTypeBadge } from "./issue-type-badge";
import { PortalStatusBadge } from "./portal-status-badge";

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
  // CP-006/CP-007 fallback: toon klant-vertaling als die er is, anders de
  // interne tekst. Consistent met de bucket-cards (BUCKET-V1-07) zodat een
  // klant niet plotseling technisch jargon ziet na klikken.
  const heading = issue.client_title ?? issue.title;
  const body = issue.client_description ?? issue.description;
  const sourceGroup = resolvePortalSourceGroup(issue.source);
  const isClient = sourceGroup === "client";
  const SourceIcon = isClient ? Inbox : Shield;
  const sourceLabel = isClient ? "Onze melding" : "JAIP-melding";

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
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono text-muted-foreground">#{issue.issue_number}</span>
          <PortalStatusBadge status={issue.status} />
          <IssueTypeBadge type={issue.type} />
          <span
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-muted-foreground"
            title={sourceLabel}
            aria-label={sourceLabel}
          >
            <SourceIcon className="size-3" aria-hidden="true" />
            {sourceLabel}
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">{heading}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Aangemaakt op {formatDate(issue.created_at)}</span>
          <span>Bijgewerkt {timeAgoDays(issue.updated_at)}</span>
          {issue.closed_at ? <span>Afgerond op {formatDate(issue.closed_at)}</span> : null}
        </div>
      </header>

      <section className="rounded-lg border border-border bg-card p-5">
        {body ? (
          <div className={PROSE_CLASSES}>
            <Markdown remarkPlugins={[remarkGfm]}>{body}</Markdown>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Geen beschrijving beschikbaar.</p>
        )}
      </section>
    </article>
  );
}
