import type { TopicPriority, TopicType, ClientSignal } from "./mock-data";

/**
 * Editorial-style metadata badges. Different from the production @repo/ui Badge:
 * smaller, more typographic, no pill-blob look.
 */

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

export function PriorityBadge({ priority }: { priority: TopicPriority }) {
  if (!priority) return null;
  const colors: Record<NonNullable<TopicPriority>, string> = {
    P0: "oklch(0.42 0.16 25)",
    P1: "oklch(0.42 0.13 50)",
    P2: "oklch(0.42 0.06 200)",
    P3: "oklch(0.5 0.005 60)",
  };
  return (
    <span
      className="inline-flex items-center font-mono text-[10px] tracking-[0.1em]"
      style={{ color: colors[priority] }}
    >
      {priority}
    </span>
  );
}

export function SignalBadge({ signal }: { signal: ClientSignal }) {
  if (!signal) return null;
  const config = {
    must_have: {
      glyph: "🔥",
      label: "Must-have",
      bg: "oklch(0.96 0.025 35)",
      ink: "oklch(0.36 0.1 30)",
      ring: "oklch(0.86 0.05 30)",
    },
    nice_to_have: {
      glyph: "👍",
      label: "Zou fijn zijn",
      bg: "oklch(0.96 0.018 145)",
      ink: "oklch(0.36 0.06 145)",
      ring: "oklch(0.86 0.04 145)",
    },
    not_relevant: {
      glyph: "👎",
      label: "Niet relevant",
      bg: "oklch(0.96 0.005 75)",
      ink: "oklch(0.45 0.005 75)",
      ring: "oklch(0.86 0.005 75)",
    },
  }[signal];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]"
      style={{
        backgroundColor: config.bg,
        color: config.ink,
        borderColor: config.ring,
      }}
    >
      <span aria-hidden className="text-[12px] leading-none">
        {config.glyph}
      </span>
      <span className="font-mono uppercase tracking-[0.1em] text-[9px]">{config.label}</span>
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
