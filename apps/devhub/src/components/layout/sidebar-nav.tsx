"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutDashboard, LayoutList, Layers, Settings, Sparkles } from "lucide-react";
import { cn } from "@repo/ui/utils";
import { useEffect, useSyncExternalStore } from "react";
import { NAV_ITEMS, issueHref } from "./sidebar-constants";
import { issueCountStore, EMPTY_COUNTS } from "./issue-count-store";

interface SidebarNavProps {
  /** Icon size class — desktop uses size-5, mobile uses size-4 */
  iconSize?: string;
  /** Link padding/text — desktop uses py-2 text-[0.9rem], mobile uses py-1.5 text-sm */
  linkClassName?: string;
  /** Called when a link is clicked (for mobile: close drawer) */
  onNavigate?: () => void;
}

function useIssueCounts(projectId: string | null) {
  // Subscribe to the module-scope store. Cached counts are returned
  // synchronously — the sidebar never renders "empty, then populated" for
  // a project we've already seen.
  //
  // IMPORTANT: both snapshot callbacks MUST return a stable reference when
  // there's nothing to show. Returning `{}` literally creates a new object
  // every render and trips React error #185 ("getSnapshot should be cached")
  // with an infinite render loop. EMPTY_COUNTS is a frozen singleton.
  const counts = useSyncExternalStore(
    issueCountStore.subscribe,
    () => issueCountStore.get(projectId),
    () => EMPTY_COUNTS,
  );

  // Background refresh whenever the active project changes. Deduped in the
  // store, so concurrent subscribers only trigger one request.
  useEffect(() => {
    if (!projectId) return;
    issueCountStore.refresh(projectId);
  }, [projectId]);

  return counts;
}

export function SidebarNav({
  iconSize = "size-5",
  linkClassName = "py-2 text-[0.9rem]",
  onNavigate,
}: SidebarNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  const counts = useIssueCounts(projectId);

  return (
    <>
      <nav className="flex-1 space-y-0.5 overflow-auto px-2 py-2">
        <Link
          href={projectId ? `/?project=${projectId}` : "/"}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            linkClassName,
            pathname === "/" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
          )}
        >
          <LayoutDashboard className={iconSize} />
          Dashboard
        </Link>
        <Link
          href={issueHref(projectId)}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            linkClassName,
            pathname === "/issues" &&
              !searchParams.has("status") &&
              "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
          )}
        >
          <LayoutList className={iconSize} />
          Alle issues
        </Link>
        <Link
          href={projectId ? `/topics?project=${projectId}` : "/topics"}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            linkClassName,
            pathname.startsWith("/topics") &&
              "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
          )}
        >
          <Layers className={iconSize} />
          Topics
        </Link>

        <div className="pt-3 pb-1 px-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Status
          </span>
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const count = counts[item.status as keyof typeof counts];
          const numericCount = typeof count === "number" ? count : 0;
          const activePriority = searchParams.get("priority");
          const isActive =
            pathname === "/issues" && searchParams.get("status") === item.status && !activePriority;
          // Sub-counts per prio voor Te doen en Backlog. Andere statussen
          // krijgen geen prio-uitsplitsing.
          const priorityCounts =
            item.status === "todo"
              ? counts.todo_priority
              : item.status === "backlog"
                ? counts.backlog_priority
                : undefined;
          return (
            <div key={item.status}>
              <Link
                href={issueHref(projectId, { status: item.status })}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  linkClassName,
                  isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                )}
              >
                <Icon className={cn(iconSize, isActive && item.activeIconClass)} />
                <span className="flex-1">{item.label}</span>
                {numericCount > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium leading-none",
                      item.accent
                        ? "bg-orange-100 text-orange-700"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {numericCount}
                  </span>
                )}
              </Link>
              {item.prioritySubItems && (
                <div className="ml-6 mt-0.5 space-y-0.5">
                  {item.prioritySubItems.map((sub) => {
                    const subCount = priorityCounts?.[sub.priority] ?? 0;
                    const isSubActive =
                      pathname === "/issues" &&
                      searchParams.get("status") === item.status &&
                      activePriority === sub.priority;
                    return (
                      <Link
                        key={sub.priority}
                        href={issueHref(projectId, {
                          status: item.status,
                          priority: sub.priority,
                        })}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          linkClassName,
                          "py-1 text-xs",
                          isSubActive &&
                            "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                        )}
                      >
                        <span className={cn("size-2 rounded-full shrink-0", sub.dotClass)} />
                        <span className="flex-1">{sub.label}</span>
                        {subCount > 0 && (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.6rem] font-medium leading-none text-muted-foreground">
                            {subCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-sidebar-border px-2 py-2 space-y-0.5">
        <Link
          href="/changelog"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            linkClassName,
            pathname === "/changelog" &&
              "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
          )}
        >
          <Sparkles className={iconSize} />
          Wat is er nieuw
        </Link>
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            linkClassName,
            pathname === "/settings" &&
              "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
          )}
        >
          <Settings className={iconSize} />
          Instellingen
        </Link>
      </div>
    </>
  );
}
