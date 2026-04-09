"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleDot,
  Inbox,
  CheckCircle2,
  Loader2,
  XCircle,
  Settings,
  LayoutList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectId } from "@/hooks/use-project";
import { useEffect, useState } from "react";
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

export function AppSidebar() {
  const pathname = usePathname();
  const projectId = useProjectId();
  const [counts, setCounts] = useState<StatusCounts>({});

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    const supabase = createClient();

    const fetchCounts = async () => {
      const { data } = await supabase.from("issues").select("status").eq("project_id", projectId);
      if (cancelled || !data) return;
      const c: StatusCounts = {};
      for (const row of data) {
        c[row.status] = (c[row.status] ?? 0) + 1;
      }
      setCounts(c);
    };

    fetchCounts();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <aside className="flex h-full w-56 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-12 items-center px-4">
        <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
          JAIP DevHub
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2 py-2">
        <Link
          href="/issues"
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            pathname === "/issues" &&
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
              href={`/issues?status=${item.status}`}
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

      {/* Settings */}
      <div className="border-t border-sidebar-border px-2 py-2">
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Settings className="size-4" />
          Instellingen
        </Link>
      </div>
    </aside>
  );
}
