"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { SidebarNav } from "./sidebar-nav";

export function MobileSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [state, setState] = useState({ open: false, routeKey });

  // Close menu when route changes (React 19 derived state pattern)
  if (state.routeKey !== routeKey) {
    setState({ open: false, routeKey });
  }

  const setOpen = (open: boolean) => setState({ open, routeKey });

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

      {state.open && (
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

            <SidebarNav />
          </aside>
        </div>
      )}
    </>
  );
}
