"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Menu,
  X,
  CircleDot,
  Inbox,
  CheckCircle2,
  Loader2,
  XCircle,
  Settings,
  LayoutList,
} from "lucide-react";
import { cn } from "@repo/ui/utils";
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

export function MobileSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<StatusCounts>({});

  // Close menu on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname, searchParams]);

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
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center justify-center rounded-lg size-8 transition-colors hover:bg-muted lg:hidden"
      >
        <Menu className="size-5" />
        <span className="sr-only">Open menu</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/20" onClick={() => setOpen(false)} />

          {/* Sidebar panel */}
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[70%] max-w-xs flex-col border-r border-sidebar-border bg-sidebar shadow-lg">
            <div className="flex h-12 items-center justify-between px-4 border-b border-sidebar-border">
              <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
                JAIP DevHub
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-md size-7 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <nav className="flex-1 space-y-0.5 overflow-auto px-2 py-2">
              <Link
                href={issueHref()}
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
                    href={issueHref({ status: item.status })}
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
          </aside>
        </div>
      )}
    </>
  );
}
