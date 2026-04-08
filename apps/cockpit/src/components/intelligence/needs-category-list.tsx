"use client";

import {
  Wrench,
  BookOpen,
  UsersRound,
  Settings2,
  Handshake,
  MoreHorizontal,
  Calendar,
  ArrowUpRight,
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

const PRIORITY_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  hoog: { label: "Hoog", color: "#DC2626", bg: "#FEE2E2" },
  midden: { label: "Midden", color: "#B45309", bg: "#FEF3C7" },
  laag: { label: "Laag", color: "#6B7280", bg: "#F3F4F6" },
};

function NeedCard({ need }: { need: NeedRow }) {
  const priority = PRIORITY_STYLES[need.metadata?.priority] ?? PRIORITY_STYLES.laag;
  const meetingDate = need.meeting?.date
    ? new Date(need.meeting.date).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    <div className="rounded-xl border border-border/40 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-relaxed">{need.content}</p>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ color: priority.color, backgroundColor: priority.bg }}
        >
          {priority.label}
        </span>
      </div>

      {need.metadata?.context && (
        <p className="mt-2 text-xs text-muted-foreground">{need.metadata.context}</p>
      )}

      {need.meeting && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
          <Calendar className="h-3 w-3" />
          <span>{meetingDate}</span>
          <span className="mx-1">-</span>
          <a
            href={`/meetings/${need.meeting.id}`}
            className="inline-flex items-center gap-0.5 hover:text-primary transition-colors"
          >
            {need.meeting.title}
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}

function CategorySection({ group }: { group: NeedsByCategory }) {
  const config = CATEGORY_CONFIG[group.category] ?? CATEGORY_CONFIG.overig;
  const Icon = config.icon;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: config.bg }}
        >
          <span style={{ color: config.color }}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <h2 className="text-sm font-semibold">{group.label}</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {group.needs.length}
        </span>
      </div>

      <div className="space-y-2">
        {group.needs.map((need) => (
          <NeedCard key={need.id} need={need} />
        ))}
      </div>
    </section>
  );
}

export function NeedsCategoryList({ groups }: { groups: NeedsByCategory[] }) {
  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <CategorySection key={group.category} group={group} />
      ))}
    </div>
  );
}
