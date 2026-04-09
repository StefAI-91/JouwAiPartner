import { cn } from "@repo/ui/utils";

const PRIORITY_CONFIG: Record<string, { label: string; dotClass: string; textClass: string }> = {
  urgent: { label: "Urgent", dotClass: "bg-red-500", textClass: "text-red-700" },
  high: { label: "High", dotClass: "bg-orange-500", textClass: "text-orange-700" },
  medium: { label: "Medium", dotClass: "bg-yellow-500", textClass: "text-yellow-700" },
  low: { label: "Low", dotClass: "bg-muted-foreground/40", textClass: "text-muted-foreground" },
};

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", config.textClass, className)}>
      <span className={cn("size-2 rounded-full", config.dotClass)} />
      {config.label}
    </span>
  );
}

export function PriorityDot({ priority, className }: { priority: string; className?: string }) {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium;
  return <span className={cn("size-2.5 rounded-full shrink-0", config.dotClass, className)} />;
}
