"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutDashboard, LayoutList, Settings } from "lucide-react";
import { cn } from "@repo/ui/utils";
import { useEffect, useState, useTransition } from "react";
import { NAV_ITEMS, issueHref, type StatusCounts } from "./sidebar-constants";
import { getIssueCountsAction } from "@/actions/issues";

interface SidebarNavProps {
  /** Icon size class — desktop uses size-5, mobile uses size-4 */
  iconSize?: string;
  /** Link padding/text — desktop uses py-2 text-[0.9rem], mobile uses py-1.5 text-sm */
  linkClassName?: string;
  /** Called when a link is clicked (for mobile: close drawer) */
  onNavigate?: () => void;
}

export function SidebarNav({
  iconSize = "size-5",
  linkClassName = "py-2 text-[0.9rem]",
  onNavigate,
}: SidebarNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  const [counts, setCounts] = useState<StatusCounts>({});
  const [, startTransition] = useTransition();

  // Fetch counts via server action when projectId changes
  useEffect(() => {
    if (!projectId) return;
    startTransition(async () => {
      const result = await getIssueCountsAction(projectId);
      if ("data" in result) {
        setCounts(result.data);
      }
    });
  }, [projectId]);

  // When no project is selected, show empty counts
  const displayCounts = projectId ? counts : {};

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

        <div className="pt-3 pb-1 px-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Status
          </span>
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const count = displayCounts[item.status] ?? 0;
          return (
            <Link
              key={item.status}
              href={issueHref(projectId, { status: item.status })}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                linkClassName,
              )}
            >
              <Icon className={iconSize} />
              <span className="flex-1">{item.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium leading-none",
                    item.accent
                      ? "bg-orange-100 text-orange-700"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-sidebar-border px-2 py-2 space-y-0.5">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            linkClassName,
          )}
        >
          <Settings className={iconSize} />
          Instellingen
        </Link>
      </div>
    </>
  );
}
