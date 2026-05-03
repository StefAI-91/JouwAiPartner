import type { ClientQuestionListRow } from "@repo/database/queries/client-questions";
import type { ConversationThread } from "@repo/database/queries/inbox";
import { cn } from "@repo/ui/utils";
import { PortalInboxList } from "./portal-inbox-list";
import { PortalThreadPane } from "./portal-thread-pane";
import { PortalComposePane } from "./portal-compose-pane";
import { PortalEmptyPane } from "./portal-empty-pane";

/**
 * PR-026 — Two-pane layout-shell voor de portal-inbox.
 *
 * Op `md+`: lijst-pane (vaste 360px links) + detail/compose-pane (flexibel
 * rechts). Onder `md`: één pane tegelijk, gestuurd door `selectedId` —
 * lijst óf detail, niet beide. CSS-only via `hidden md:block` / `md:hidden`,
 * geen JS-viewport-detection nodig.
 *
 * `selectedId === "new"` is een sentinel-string voor de compose-route;
 * een echte `client_questions.id` is altijd een uuid en kan dus niet
 * botsen. Zo houden we één catch-all-route i.p.v. een aparte `/new`-route.
 */
export interface PortalInboxLayoutProps {
  projectId: string;
  projectName: string;
  organizationName: string;
  questions: ClientQuestionListRow[];
  selectedId: string | undefined;
  thread: Extract<ConversationThread, { kind: "question" }> | null;
  currentProfileId: string;
  showOnboarding: boolean;
}

export function PortalInboxLayout({
  projectId,
  projectName,
  organizationName,
  questions,
  selectedId,
  thread,
  currentProfileId,
  showOnboarding,
}: PortalInboxLayoutProps) {
  const hasSelection = selectedId !== undefined;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col md:flex-row">
      <aside
        className={cn(
          "flex flex-col overflow-hidden border-border/60 md:w-[360px] md:shrink-0 md:border-r",
          // Op mobile: tonen als geen selectie; verbergen als detail open is.
          // Op md+: altijd tonen.
          hasSelection ? "hidden md:flex" : "flex",
        )}
      >
        <div className="border-b border-border/60 px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {organizationName} · {projectName}
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-foreground">Berichten</h1>
        </div>

        <PortalInboxList
          projectId={projectId}
          questions={questions}
          selectedId={selectedId}
          currentProfileId={currentProfileId}
        />
      </aside>

      <main
        className={cn(
          "flex-1 overflow-hidden",
          // Mobile: tonen als er een selectie is. Md+: altijd tonen.
          hasSelection ? "flex flex-col" : "hidden md:flex md:flex-col",
        )}
      >
        {selectedId === "new" ? (
          <PortalComposePane projectId={projectId} />
        ) : thread ? (
          <PortalThreadPane
            projectId={projectId}
            thread={thread}
            currentProfileId={currentProfileId}
          />
        ) : (
          <PortalEmptyPane
            projectId={projectId}
            hasQuestions={questions.length > 0}
            showOnboarding={showOnboarding}
          />
        )}
      </main>
    </div>
  );
}
