"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CircleDot,
  Inbox,
  CheckCircle2,
  Loader2,
  XCircle,
  Settings,
  LayoutList,
  Sparkles,
} from "lucide-react";
import { cn } from "@repo/ui/utils";
import { useCallback, useEffect, useState } from "react";
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
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  const [counts, setCounts] = useState<StatusCounts>({});

  const fetchCounts = useCallback(async () => {
    if (!projectId) return;
    const supabase = createClient();
    const { data } = await supabase.from("issues").select("status").eq("project_id", projectId);
    if (!data) return;
    const c: StatusCounts = {};
    for (const row of data) {
      c[row.status] = (c[row.status] ?? 0) + 1;
    }
    setCounts(c);
  }, [projectId]);

  // Fetch on mount and project change
  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Refetch when issues change (status updates, creates, deletes)
  useEffect(() => {
    const handler = () => fetchCounts();
    window.addEventListener("issues-changed", handler);
    return () => window.removeEventListener("issues-changed", handler);
  }, [fetchCounts]);

  // Build href helper that preserves ?project= param
  function issueHref(extraParams?: Record<string, string>) {
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

  return (
    <aside className="hidden h-full w-56 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4">
        <img
          src="https://gattprzzbpnyygzgzvxg.supabase.co/storage/v1/object/public/Public/images/679a9066567ec01242301e4d_jap_logo_zwart_gradient.svg"
          alt="Jouw AI Partner"
          className="h-9 w-auto"
        />
        <span className="font-heading text-xl font-semibold text-primary">DevHub</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2 py-2">
        <Link
          href={issueHref()}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-2 text-[0.9rem] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            pathname === "/issues" &&
              !searchParams.has("status") &&
              "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
          )}
        >
          <LayoutList className="size-5" />
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
              href={issueHref({ status: item.status })}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-[0.9rem] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Icon className="size-5" />
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
          href={projectId ? `/review?project=${projectId}` : "/review"}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-2 text-[0.9rem] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            pathname === "/review" &&
              "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
          )}
        >
          <Sparkles className="size-5" />
          AI Review
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-md px-2 py-2 text-[0.9rem] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Settings className="size-5" />
          Instellingen
        </Link>
      </div>
    </aside>
  );
}
