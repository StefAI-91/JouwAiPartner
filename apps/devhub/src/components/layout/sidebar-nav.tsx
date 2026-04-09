"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CircleDot,
  Inbox,
  CheckCircle2,
  Loader2,
  XCircle,
  Settings,
  LayoutList,
} from "lucide-react";
import { cn } from "@repo/ui/utils";
import { createClient } from "@repo/database/supabase/client";

type StatusCounts = Record<string, number>;

const NAV_ITEMS = [
  { label: "Triage", status: "triage", icon: Inbox, accent: true },
  { label: "Backlog", status: "backlog", icon: CircleDot },
  { label: "Te doen", status: "todo", icon: CircleDot },
  { label: "In behandeling", status: "in_progress", icon: Loader2 },
  { label: "Afgerond", status: "done", icon: CheckCircle2 },
  { label: "Geannuleerd", status: "cancelled", icon: XCircle },
];

function useStatusCounts(projectId: string | null): StatusCounts {
  const [counts, setCounts] = useState<StatusCounts>({});

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    const supabase = createClient();

    async function fetchCounts() {
      const { data } = await supabase.from("issues").select("status").eq("project_id", projectId!);
      if (cancelled || !data) return;
      const c: StatusCounts = {};
      for (const row of data) {
        c[row.status] = (c[row.status] ?? 0) + 1;
      }
      setCounts(c);
    }

    fetchCounts();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return counts;
}

function buildIssueHref(projectId: string | null, extraParams?: Record<string, string>): string {
  const params = new URLSearchParams();
  if (projectId) params.set("project", projectId);
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `/issues?${qs}` : "/issues";
}

export function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  const counts = useStatusCounts(projectId);

  return (
    <>
      <nav className="flex-1 space-y-0.5 overflow-auto px-2 py-2">
        <Link
          href={buildIssueHref(projectId)}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            pathname === "/issues" &&
              !searchParams.has("status") &&
              "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
          )}
        >
          <LayoutList className="size-4" />
          Alle issues
        </Link>

        <div className="pt-3 pb-1 px-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Status
          </span>
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const count = counts[item.status] ?? 0;
          return (
            <Link
              key={item.status}
              href={buildIssueHref(projectId, { status: item.status })}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Icon className="size-4" />
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

      <div className="border-t border-sidebar-border px-2 py-2">
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Settings className="size-4" />
          Instellingen
        </Link>
      </div>
    </>
  );
}
