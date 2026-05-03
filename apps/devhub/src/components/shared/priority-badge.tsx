import { cn } from "@repo/ui/utils";
import {
  ISSUE_PRIORITY_LABELS,
  ISSUE_PRIORITY_SHORT_LABELS,
  type IssuePriority,
} from "@repo/database/constants/issues";

interface PriorityStyle {
  dotClass: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

const PRIORITY_STYLE: Record<IssuePriority, PriorityStyle> = {
  urgent: {
    dotClass: "bg-red-500",
    bgClass: "bg-red-50",
    textClass: "text-red-700",
    borderClass: "border-red-200",
  },
  high: {
    dotClass: "bg-orange-500",
    bgClass: "bg-orange-50",
    textClass: "text-orange-700",
    borderClass: "border-orange-200",
  },
  medium: {
    dotClass: "bg-yellow-500",
    bgClass: "bg-yellow-50",
    textClass: "text-yellow-700",
    borderClass: "border-yellow-200",
  },
  low: {
    dotClass: "bg-muted-foreground/40",
    bgClass: "bg-slate-100",
    textClass: "text-slate-600",
    borderClass: "border-slate-200",
  },
};

function getStyle(priority: string): PriorityStyle {
  return PRIORITY_STYLE[priority as IssuePriority] ?? PRIORITY_STYLE.medium;
}

interface PriorityBadgeProps {
  priority: string;
  variant?: "default" | "compact";
  className?: string;
}

export function PriorityBadge({ priority, variant = "default", className }: PriorityBadgeProps) {
  const style = getStyle(priority);
  const label =
    variant === "compact"
      ? (ISSUE_PRIORITY_SHORT_LABELS[priority as IssuePriority] ?? priority)
      : (ISSUE_PRIORITY_LABELS[priority as IssuePriority] ?? priority);

  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-md border px-1.5 py-0.5 font-mono text-xs font-semibold",
          style.bgClass,
          style.textClass,
          style.borderClass,
          className,
        )}
      >
        {label}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", style.textClass, className)}>
      <span className={cn("size-2 rounded-full", style.dotClass)} />
      {label}
    </span>
  );
}

export function PriorityDot({ priority, className }: { priority: string; className?: string }) {
  const style = getStyle(priority);
  return <span className={cn("size-2.5 rounded-full shrink-0", style.dotClass, className)} />;
}
