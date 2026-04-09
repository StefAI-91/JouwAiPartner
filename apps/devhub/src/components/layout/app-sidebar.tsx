"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleDot, Inbox, CheckCircle2, Loader2, XCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    label: "Triage",
    href: "/issues?status=triage",
    icon: Inbox,
    status: "triage",
  },
  {
    label: "Backlog",
    href: "/issues?status=backlog",
    icon: CircleDot,
    status: "backlog",
  },
  {
    label: "Todo",
    href: "/issues?status=todo",
    icon: CircleDot,
    status: "todo",
  },
  {
    label: "In Progress",
    href: "/issues?status=in_progress",
    icon: Loader2,
    status: "in_progress",
  },
  {
    label: "Done",
    href: "/issues?status=done",
    icon: CheckCircle2,
    status: "done",
  },
  {
    label: "Cancelled",
    href: "/issues?status=cancelled",
    icon: XCircle,
    status: "cancelled",
  },
];

export function AppSidebar() {
  const pathname = usePathname();

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
          <CircleDot className="size-4" />
          All Issues
        </Link>

        <div className="pt-3 pb-1 px-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Status
          </span>
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.status}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
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
          Settings
        </Link>
      </div>
    </aside>
  );
}
