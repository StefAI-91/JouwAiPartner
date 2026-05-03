import Link from "next/link";
import { CheckCheck, Clock, Sparkles } from "lucide-react";
import type { ClientQuestionListRow } from "@repo/database/queries/client-questions";
import { cn } from "@repo/ui/utils";

/**
 * Portal-inbox rij — status-first hiërarchie.
 *
 * Drie kernscenario's, elk met een eigen pill:
 *
 *   1. **Nieuw van team** (`status=open` + `sender ≠ klant`): team is gesprek
 *      gestart, klant moet lezen/antwoorden. Primary border + Sparkles-pill —
 *      meest prominente visuele cue zodat de klant nieuwe team-berichten niet
 *      mist (FIX cockpit→portal-zichtbaarheid bug).
 *   2. **Wacht op team** (`status=open` + `sender = klant`): klant heeft iets
 *      gestuurd en wacht op antwoord. Amber border, attentie maar minder
 *      urgent dan een nieuw team-bericht.
 *   3. **Beantwoord** (`status=responded`): afgerond, archief-look.
 *
 * `currentProfileId` blijft alleen om team-vs-jij te onderscheiden — niet voor
 * security (RLS doet dat).
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
  const isNewFromTeam = question.status === "open" && !isOwnRoot;
  const isAwaitingTeam = question.status === "open" && isOwnRoot;
  const isAnswered = question.status === "responded";

  const lastReply =
    question.replies.length > 0 ? question.replies[question.replies.length - 1] : null;
  const lastReplyByTeam = lastReply ? lastReply.sender_profile_id !== currentProfileId : false;
  const time = formatTimestamp(question.created_at);
  const replyCount = question.replies.length;

  return (
    <li>
      <Link
        href={href}
        prefetch
        className={cn(
          "group block border-l-2 px-5 py-3.5 transition",
          isActive
            ? "border-primary bg-primary/5"
            : isNewFromTeam
              ? "border-primary/70 bg-primary/5 hover:bg-primary/10"
              : isAwaitingTeam
                ? "border-amber-400/70 bg-amber-50/30 hover:bg-amber-50/60"
                : "border-transparent hover:bg-muted/40",
        )}
      >
        {/* Top row: status pil + reactie-count + tijd */}
        <div className="flex items-center gap-2">
          {isNewFromTeam ? (
            <StatusPill tone="primary">
              <Sparkles className="size-2.5" strokeWidth={2.5} />
              Nieuw van team
            </StatusPill>
          ) : isAwaitingTeam ? (
            <StatusPill tone="amber">
              <Clock className="size-2.5" strokeWidth={2.5} />
              Wacht op team
            </StatusPill>
          ) : isAnswered ? (
            <StatusPill tone="success">
              <CheckCheck className="size-2.5" strokeWidth={2.5} />
              Beantwoord
            </StatusPill>
          ) : (
            <StatusPill tone="muted">Open</StatusPill>
          )}

          <span className="ml-auto inline-flex items-center gap-1.5 text-[10.5px] tabular-nums text-muted-foreground/80">
            {replyCount > 0 && (
              <>
                <span>
                  <span className="font-semibold text-foreground/70">{replyCount}</span> reactie
                  {replyCount === 1 ? "" : "s"}
                </span>
                <span className="size-0.5 rounded-full bg-muted-foreground/40" />
              </>
            )}
            <span>{time}</span>
          </span>
        </div>

        {/* Body — twee varianten */}
        {isAnswered && lastReply && lastReplyByTeam ? (
          <div className="mt-2.5 space-y-1.5">
            <p className="line-clamp-1 text-[11.5px] leading-snug text-muted-foreground">
              <span className="font-semibold text-foreground/60">Jij vroeg:</span>{" "}
              {makePreview(question.body)}
            </p>
            <p
              className={cn(
                "line-clamp-2 text-[13.5px] leading-snug",
                isActive ? "text-foreground" : "text-foreground/90",
              )}
            >
              <span className="text-muted-foreground">&ldquo;</span>
              {makePreview(lastReply.body)}
              <span className="text-muted-foreground">&rdquo;</span>
            </p>
          </div>
        ) : (
          <p
            className={cn(
              "mt-2 line-clamp-2 text-[13.5px] font-medium leading-snug",
              isActive ? "text-foreground" : "text-foreground/90",
            )}
          >
            {makePreview(question.body)}
          </p>
        )}
      </Link>
    </li>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "primary" | "amber" | "success" | "muted";
}) {
  const styles = {
    primary: "bg-primary/15 text-primary border-primary/30",
    amber: "bg-amber-100/80 text-amber-800 border-amber-200/70",
    success: "bg-emerald-50 text-emerald-800 border-emerald-100",
    muted: "bg-muted text-muted-foreground border-border/60",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles[tone],
      )}
    >
      {children}
    </span>
  );
}

function makePreview(body: string): string {
  const trimmed = body.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 100) return trimmed;
  return trimmed.slice(0, 100) + "…";
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
  const diffD = Math.floor(diffMin / 60 / 24);
  if (diffD < 7) return `${diffD}d`;
  const d = new Date(iso);
  return `${d.getDate()} ${["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"][d.getMonth()]}`;
}
