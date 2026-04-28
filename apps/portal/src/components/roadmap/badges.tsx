import type { TopicType } from "@repo/database/constants/topics";

export function TypeBadge({ type }: { type: TopicType }) {
  const isBug = type === "bug";
  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em]"
      style={{
        color: isBug ? "oklch(0.42 0.13 25)" : "oklch(0.36 0.06 145)",
      }}
    >
      <span
        aria-hidden
        className="size-1 rounded-full"
        style={{
          backgroundColor: isBug ? "oklch(0.62 0.18 25)" : "oklch(0.55 0.15 155)",
        }}
      />
      {isBug ? "Bug" : "Feature"}
    </span>
  );
}

export type PriorityValue = "P0" | "P1" | "P2" | "P3";

export function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return null;
  const colors: Record<PriorityValue, string> = {
    P0: "oklch(0.42 0.16 25)",
    P1: "oklch(0.42 0.13 50)",
    P2: "oklch(0.42 0.06 200)",
    P3: "oklch(0.5 0.005 60)",
  };
  const color = colors[priority as PriorityValue] ?? colors.P3;
  return (
    <span
      className="inline-flex items-center font-mono text-[10px] tracking-[0.1em]"
      style={{ color }}
    >
      {priority}
    </span>
  );
}

export function MetaItem({ children, prefix }: { children: React.ReactNode; prefix?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 font-mono text-[11px] num-tabular text-[var(--ink-muted)]">
      {prefix ? (
        <span className="uppercase tracking-[0.12em] text-[9px] text-[var(--ink-faint)]">
          {prefix}
        </span>
      ) : null}
      {children}
    </span>
  );
}
