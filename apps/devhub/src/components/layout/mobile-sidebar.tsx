"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  CircleDot,
  Inbox,
  CheckCircle2,
  Loader2,
  XCircle,
  Settings,
  LayoutList,
} from "lucide-react";
import { cn } from "@repo/ui/utils";
import { useProjectId } from "@/hooks/use-project";
import { useEffect, useState } from "react";
import { createClient } from "@repo/database/supabase/client";
import { Button } from "@repo/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetClose, SheetTitle } from "@repo/ui/sheet";

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
    <Sheet>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="shrink-0 lg:hidden" />}>
        <Menu className="size-5" />
        <span className="sr-only">Open menu</span>
      </SheetTrigger>

      <SheetContent side="left" className="bg-sidebar p-0" showCloseButton={false}>
        <div className="flex h-12 items-center gap-2.5 px-4 border-b border-sidebar-border">
          <img
            src="https://gattprzzbpnyygzgzvxg.supabase.co/storage/v1/object/public/Public/images/679a9066567ec01242301e4d_jap_logo_zwart_gradient.svg"
            alt="Jouw AI Partner"
            className="h-7 w-auto"
          />
          <SheetTitle className="font-heading text-sm font-semibold text-primary">
            DevHub
          </SheetTitle>
        </div>

        <nav className="flex-1 space-y-0.5 px-2 py-2">
          <SheetClose
            render={
              <Link
                href="/issues"
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  pathname === "/issues" &&
                    "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                )}
              />
            }
          >
            <LayoutList className="size-4" />
            Alle issues
          </SheetClose>

          <div className="pt-3 pb-1 px-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </span>
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const count = counts[item.status] ?? 0;
            return (
              <SheetClose
                key={item.status}
                render={
                  <Link
                    href={`/issues?status=${item.status}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  />
                }
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
              </SheetClose>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-2 py-2">
          <SheetClose
            render={
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              />
            }
          >
            <Settings className="size-4" />
            Instellingen
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
