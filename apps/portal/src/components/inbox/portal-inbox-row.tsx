import Link from "next/link";
import type { ClientQuestionListRow } from "@repo/database/queries/client-questions";
import { cn } from "@repo/ui/utils";

/**
 * PR-026 — Linear-stijl rij voor de portal-inbox.
 *
 * Klant ziet maar één project per portal-view, dus de rij toont géén project-
 * naam of source-indicator (zou alleen ruis geven). Wel: status-bullet, sender,
 * eerste-zin van het bericht, timestamp, plus actieve-state als deze rij de
 * geopende thread is.
 *
 * Sender-label is "Team" (bericht zonder eigen replies of waarvan de root
 * door team is verstuurd) of "Jij" (root door huidige klant). Voor v1
 * benaderen we dat met `sender_profile_id === currentProfileId`.
 */
export interface PortalInboxRowProps {
  projectId: string;
  question: ClientQuestionListRow;
  currentProfileId: string;
  isActive: boolean;
}

export function PortalInboxRow({
  projectId,
  question,
  currentProfileId,
  isActive,
}: PortalInboxRowProps) {
  const href = `/projects/${projectId}/inbox/${question.id}`;
  const isOwnRoot = question.sender_profile_id === currentProfileId;
  const senderLabel = isOwnRoot ? "Jij" : "Team";
  const isWaitingForClient = question.status === "open" && !isOwnRoot;

  const titleLine = makePreview(question.body);
  const lastReply =
    question.replies.length > 0 ? question.replies[question.replies.length - 1] : null;
  const snippet = lastReply ? makePreview(lastReply.body) : null;
  const timestamp = formatTimestamp(question.created_at);

  return (
    <li>
      <Link
        href={href}
        prefetch
        className={cn(
          "block border-b border-border/30 px-5 py-3 transition",
          isActive ? "bg-primary/5" : "hover:bg-muted/40",
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              isWaitingForClient ? "bg-amber-500" : isActive ? "bg-primary" : "bg-transparent",
            )}
            aria-hidden
          />
          <span
            className={cn(
              "flex-1 text-[12px] font-medium",
              isActive ? "text-foreground" : "text-foreground/85",
            )}
          >
            {senderLabel}
          </span>
          <span className="text-[10px] tabular-nums text-muted-foreground/70">{timestamp}</span>
        </div>
        <p
          className={cn(
            "mt-0.5 line-clamp-1 text-[13px] leading-snug",
            isActive ? "text-foreground" : "text-foreground/85",
          )}
        >
          {titleLine}
        </p>
        {snippet ? (
          <p className="mt-0.5 line-clamp-1 text-[11.5px] text-muted-foreground/80">{snippet}</p>
        ) : null}
      </Link>
    </li>
  );
}

function makePreview(body: string): string {
  const trimmed = body.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 90) return trimmed;
  return trimmed.slice(0, 90) + "…";
}

// Compact relatieve timestamp: "2u" / "3d" / "15 mei". Niet exact — de detail-
// pane toont de echte tijd. Hier alleen visueel houvast voor de lijst.
function formatTimestamp(iso: string): string {
  const t = new Date(iso).getTime();
  const diffMs = Date.now() - t;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${Math.max(1, diffMin)}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}u`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  const d = new Date(iso);
  return `${d.getDate()} ${["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"][d.getMonth()]}`;
}
