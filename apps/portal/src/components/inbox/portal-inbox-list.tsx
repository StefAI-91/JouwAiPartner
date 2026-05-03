import Link from "next/link";
import { MessageCircle, Plus } from "lucide-react";
import type { ClientQuestionListRow } from "@repo/database/queries/client-questions";
import { cn } from "@repo/ui/utils";
import { PortalInboxRow } from "./portal-inbox-row";

/**
 * PR-026 — Lijst-pane voor de portal-inbox. Server component — vervangt
 * `question-list.tsx` (was full-width card-grid). Linear-stijl: compacte
 * rijen die elk linken naar `/inbox/<id>`.
 *
 * "+ Nieuw bericht aan team" staat als sticky bovenste rij; klikken navigeert
 * naar `/inbox/new` waar de compose-pane rendert. Inline-toggle is verdwenen
 * (CC-006-pattern voor de oude single-page) — past niet meer in de pane-flow.
 *
 * Empty-state: kort, blijft binnen de pane. Empty-state op de detail-pane
 * (`PortalEmptyPane`) is de "lege rechterhelft"-illustratie.
 */
export interface PortalInboxListProps {
  projectId: string;
  questions: ClientQuestionListRow[];
  selectedId: string | undefined;
  // Lijst is server-rendered en kent de current-user via parent; we lezen
  // `sender_profile_id` om te weten of een vraag van de klant zelf is. Voor
  // de label "Jij" / "Team" — niet voor security.
  currentProfileId?: string;
}

export function PortalInboxList({
  projectId,
  questions,
  selectedId,
  currentProfileId,
}: PortalInboxListProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Link
        href={`/projects/${projectId}/inbox/new`}
        prefetch
        className={cn(
          "flex items-center gap-2 border-b border-border/60 px-5 py-3 text-[13px] font-medium transition",
          selectedId === "new" ? "bg-primary/5 text-foreground" : "text-primary hover:bg-muted/40",
        )}
      >
        <Plus className="size-3.5" />
        Nieuw bericht aan team
      </Link>

      {questions.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-5 py-12 text-center">
          <div>
            <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-muted">
              <MessageCircle className="size-4 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <p className="text-[13px] font-medium text-foreground">Nog geen berichten</p>
            <p className="mx-auto mt-1 max-w-[28ch] text-[11.5px] text-muted-foreground">
              Start zelf een gesprek of wacht op een bericht van het team.
            </p>
          </div>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {questions.map((q) => (
            <PortalInboxRow
              key={q.id}
              projectId={projectId}
              question={q}
              currentProfileId={currentProfileId ?? ""}
              isActive={q.id === selectedId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
