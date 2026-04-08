"use client";

import { useState } from "react";
import {
  Wrench,
  BookOpen,
  UsersRound,
  Settings2,
  Handshake,
  MoreHorizontal,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import type { NeedsByCategory, NeedRow } from "@repo/database/queries/needs";

const CATEGORY_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  tooling: { icon: Wrench, color: "#7C3AED", bg: "#F3E8FF" },
  kennis: { icon: BookOpen, color: "#0369A1", bg: "#E0F2FE" },
  capaciteit: { icon: UsersRound, color: "#B45309", bg: "#FEF3C7" },
  proces: { icon: Settings2, color: "#059669", bg: "#D1FAE5" },
  klant: { icon: Handshake, color: "#DC2626", bg: "#FEE2E2" },
  overig: { icon: MoreHorizontal, color: "#6B7280", bg: "#F3F4F6" },
};

const PRIORITY_DOT: Record<string, string> = {
  hoog: "bg-red-500",
  midden: "bg-amber-400",
  laag: "bg-gray-300",
};

function NeedItem({ need }: { need: NeedRow }) {
  const dotClass = PRIORITY_DOT[need.metadata?.priority] ?? PRIORITY_DOT.laag;
  const meetingDate = need.meeting?.date
    ? new Date(need.meeting.date).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border/30 bg-white px-3 py-2.5">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug">{need.content}</p>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground/60">
          {meetingDate && <span>{meetingDate}</span>}
          {need.meeting && (
            <>
              <span>-</span>
              <a
                href={`/meetings/${need.meeting.id}`}
                className="inline-flex items-center gap-0.5 truncate hover:text-primary transition-colors"
              >
                {need.meeting.title}
                <ArrowUpRight className="h-2.5 w-2.5 shrink-0" />
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CategorySection({ group }: { group: NeedsByCategory }) {
  const [open, setOpen] = useState(false);
  const config = CATEGORY_CONFIG[group.category] ?? CATEGORY_CONFIG.overig;
  const Icon = config.icon;

  return (
    <section>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 transition-colors hover:bg-muted/50"
      >
        <ChevronRight
          className={`h-3.5 w-3.5 text-muted-foreground/50 transition-transform ${open ? "rotate-90" : ""}`}
        />
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{ backgroundColor: config.bg }}
        >
          <span style={{ color: config.color }}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        </div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {group.label}
        </h2>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {group.needs.length}
        </span>
      </button>

      {open && (
        <div className="mt-1.5 space-y-1.5 pl-6">
          {group.needs.map((need) => (
            <NeedItem key={need.id} need={need} />
          ))}
        </div>
      )}
    </section>
  );
}

export function NeedsCategoryList({ groups }: { groups: NeedsByCategory[] }) {
  return (
    <div className="space-y-1">
      {groups.map((group) => (
        <CategorySection key={group.category} group={group} />
      ))}
    </div>
  );
}
