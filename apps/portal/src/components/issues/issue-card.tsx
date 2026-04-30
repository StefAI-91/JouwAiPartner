import Link from "next/link";
import { Inbox, Shield, Users } from "lucide-react";
import { timeAgoDays } from "@repo/ui/format";
import {
  resolvePortalSourceGroup,
  type PortalSourceGroupKey,
} from "@repo/database/constants/issues";
import type { PortalIssue } from "@repo/database/queries/portal";
import { IssueTypeBadge } from "./issue-type-badge";

const PRIORITY_DOT_CLASSES: Record<string, string> = {
  urgent: "bg-destructive",
  high: "bg-orange-500",
  medium: "bg-amber-400",
  low: "bg-muted-foreground/40",
};

const SOURCE_ICONS: Record<PortalSourceGroupKey, React.ComponentType<{ className?: string }>> = {
  portal_pm: Inbox,
  end_users: Users,
  jaip: Shield,
};

const SOURCE_LABELS: Record<PortalSourceGroupKey, string> = {
  portal_pm: "Mijn melding",
  end_users: "Van gebruiker",
  jaip: "JAIP-melding",
};

interface IssueCardProps {
  projectId: string;
  issue: PortalIssue;
}

/**
 * Compacte card binnen een bucketkolom. Toont de klant-vertaalde titel als
 * die er is (CP-007), valt anders terug op de interne titel (PRD §5.3).
 * De source-indicator is een subtiel icoon — clients zien zo of een melding
 * van henzelf komt, van een eindgebruiker, of door JAIP is toegevoegd.
 */
export function IssueCard({ projectId, issue }: IssueCardProps) {
  const heading = issue.client_title ?? issue.title;
  const sourceGroup = resolvePortalSourceGroup(issue.source);
  const SourceIcon = SOURCE_ICONS[sourceGroup];
  const sourceLabel = SOURCE_LABELS[sourceGroup];
  const dotClass = PRIORITY_DOT_CLASSES[issue.priority] ?? "bg-muted-foreground/40";

  return (
    <Link
      href={`/projects/${projectId}/issues/${issue.id}`}
      className="group flex flex-col gap-2 rounded-md border border-border/60 bg-card p-3 text-sm shadow-soft-sm transition-all duration-200 hover:-translate-y-px hover:border-foreground/40 hover:shadow-soft"
    >
      <div className="flex items-start gap-2">
        <span
          className={`mt-1.5 size-1.5 shrink-0 rounded-full ${dotClass}`}
          aria-label={`Prioriteit: ${issue.priority}`}
          title={`Prioriteit: ${issue.priority}`}
        />
        <span className="flex-1 font-medium leading-snug text-foreground">{heading}</span>
        <span className="mt-0.5 shrink-0" title={sourceLabel} aria-label={sourceLabel}>
          <SourceIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <IssueTypeBadge type={issue.type} />
          <span className="font-mono text-[10px]">#{issue.issue_number}</span>
        </div>
        <span>Bijgewerkt {timeAgoDays(issue.updated_at)}</span>
      </div>
    </Link>
  );
}
