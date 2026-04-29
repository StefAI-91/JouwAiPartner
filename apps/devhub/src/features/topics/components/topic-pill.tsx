"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ExternalLink, Layers, Plus, X } from "lucide-react";
import { cn } from "@repo/ui/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { setIssueTopicAction } from "../actions/linking";

export interface TopicPillProps {
  issueId: string;
  /**
   * Project van het issue. Meegegeven zodat "Open topic" navigeert met
   * `?project=<id>` in de URL — anders forceert de ProjectSwitcher op
   * `/topics/[id]` een reset naar het alfabetisch eerste project.
   */
  projectId: string;
  current: { id: string; title: string } | null;
  topics: { id: string; title: string; type?: string }[];
  /**
   * "row" — compact pill voor in een lijst (issue-row).
   * "field" — fullwidth control voor in de issue-detail-sidebar.
   */
  variant?: "row" | "field";
}

/**
 * Interactieve topic-toewijzing. Eén element met twee modi:
 * - geen topic → dashed-border pill met "+ Topic" label
 * - topic gekoppeld → solid pill met topic-titel en chevron
 *
 * Klik opent een dropdown met "Open topic", "Geen topic" (ontkoppel) en de
 * lijst topics in dit project. Wisselen gaat atomair via `setIssueTopicAction`.
 *
 * `e.preventDefault()` op de trigger voorkomt dat een omhullende `<Link>`
 * (zoals in `IssueRow`) de issue-detail opent.
 */
export function TopicPill({
  issueId,
  projectId,
  current,
  topics,
  variant = "row",
}: TopicPillProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function stopBubble(e: React.MouseEvent) {
    // De TopicPill kan binnen een omhullende `<Link>` staan (issue-row).
    // React's synthetic events bubbelen via de component-tree, óók vanuit
    // een geportalde dropdown — zonder deze stop opent een item-klik
    // óók de issue-detail. Verplicht op elke item-onClick.
    e.preventDefault();
    e.stopPropagation();
  }

  function apply(topicId: string | null, e: React.MouseEvent) {
    stopBubble(e);
    if ((current?.id ?? null) === topicId) return; // no-op
    startTransition(async () => {
      setError(null);
      const result = await setIssueTopicAction({ issue_id: issueId, topic_id: topicId });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const triggerBase =
    variant === "row"
      ? "inline-flex max-w-[14rem] items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.7rem] font-medium leading-none transition-colors disabled:opacity-50"
      : "inline-flex w-full items-center gap-1.5 rounded-md border px-2 py-1.5 text-sm font-medium transition-colors disabled:opacity-50";

  const triggerStyle = current
    ? "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
    : "border-dashed border-border text-muted-foreground hover:border-solid hover:bg-muted hover:text-foreground";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={isPending}
          onClick={(e) => e.preventDefault()}
          aria-label={current ? `Wijzig topic (huidig: ${current.title})` : "Wijs topic toe"}
          className={cn(triggerBase, triggerStyle)}
        >
          {current ? (
            <>
              <Layers className={variant === "row" ? "size-3 shrink-0" : "size-3.5 shrink-0"} />
              <span className="truncate">{current.title}</span>
              <ChevronDown
                className={
                  variant === "row" ? "size-3 shrink-0 opacity-60" : "ml-auto size-3.5 shrink-0"
                }
              />
            </>
          ) : (
            <>
              <Plus className={variant === "row" ? "size-3 shrink-0" : "size-3.5 shrink-0"} />
              <span>Topic</span>
            </>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="min-w-56 border border-border bg-background shadow-lg dark:bg-card"
        >
          {current ? (
            <>
              <DropdownMenuItem
                onClick={(e) => {
                  stopBubble(e);
                  router.push(`/topics/${current.id}?project=${projectId}`);
                }}
                className="cursor-pointer text-xs"
              >
                <ExternalLink className="size-3.5" />
                Open topic
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => apply(null, e)} className="cursor-pointer text-xs">
                <X className="size-3.5" />
                Geen topic
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}

          {topics.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Nog geen topics in dit project.
            </div>
          ) : (
            topics.map((t) => {
              const isCurrent = current?.id === t.id;
              return (
                <DropdownMenuItem
                  key={t.id}
                  onClick={(e) => apply(t.id, e)}
                  className="cursor-pointer text-xs"
                  disabled={isCurrent}
                >
                  <span className="truncate">{t.title}</span>
                  {isCurrent ? <Check className="ml-auto size-3.5 opacity-70" /> : null}
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {error ? (
        <span className="ml-2 text-[0.7rem] text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </>
  );
}
