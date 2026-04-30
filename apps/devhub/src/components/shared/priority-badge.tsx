import { cn } from "@repo/ui/utils";

const PRIORITY_CONFIG: Record<string, { label: string; dotClass: string; textClass: string }> = {
  p1: { label: "P1", dotClass: "bg-red-500", textClass: "text-red-700" },
  p2: { label: "P2", dotClass: "bg-amber-500", textClass: "text-amber-700" },
  nice_to_have: {
    label: "Nice to have",
    dotClass: "bg-muted-foreground/40",
    textClass: "text-muted-foreground",
  },
};

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.p2;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", config.textClass, className)}>
      <span className={cn("size-2 rounded-full", config.dotClass)} />
      {config.label}
    </span>
  );
}

export function PriorityDot({ priority, className }: { priority: string; className?: string }) {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.p2;
  return <span className={cn("size-2.5 rounded-full shrink-0", config.dotClass, className)} />;
}
