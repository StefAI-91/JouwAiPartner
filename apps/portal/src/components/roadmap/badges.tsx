import { Bug, Lightbulb } from "lucide-react";
import type { TopicType } from "@repo/database/constants/topics";
import { cn } from "@repo/ui/utils";

export function TypeBadge({ type }: { type: TopicType }) {
  const isBug = type === "bug";
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground">
      {isBug ? <Bug className="size-3" /> : <Lightbulb className="size-3" />}
      {isBug ? "Bug" : "Feature"}
    </span>
  );
}

export type PriorityValue = "P0" | "P1" | "P2" | "P3";

const PRIORITY_CLASS: Record<PriorityValue, string> = {
  P0: "border-destructive/40 bg-destructive/10 text-destructive",
  P1: "border-warning/40 bg-warning/10 text-warning-foreground",
  P2: "border-border bg-secondary text-secondary-foreground",
  P3: "border-border bg-muted text-muted-foreground",
};

export function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return null;
  const cls = PRIORITY_CLASS[priority as PriorityValue] ?? PRIORITY_CLASS.P3;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        cls,
      )}
    >
      {priority}
    </span>
  );
}
