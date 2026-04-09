"use client";

import { Zap } from "lucide-react";
import { cn } from "@repo/ui/utils";

interface ActionItem {
  title: string;
  description: string;
  priority: string;
  related_issues: number[];
  effort: string;
}

const PRIORITY_STYLE: Record<string, string> = {
  urgent: "bg-red-50 text-red-700 border-red-200",
  important: "bg-amber-50 text-amber-700 border-amber-200",
  nice_to_have: "bg-slate-50 text-slate-600 border-slate-200",
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "Urgent",
  important: "Belangrijk",
  nice_to_have: "Nice to have",
};

const EFFORT_LABEL: Record<string, string> = {
  small: "Klein",
  medium: "Medium",
  large: "Groot",
};

export function ActionItemsList({
  actionItems,
  projectId,
}: {
  actionItems: ActionItem[];
  projectId: string;
}) {
  if (actionItems.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Zap className="size-4 text-blue-500" />
        <h3 className="text-base font-medium">Actiepunten</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {actionItems.length}
        </span>
      </div>
      <ul className="divide-y">
        {actionItems.map((a, i) => (
          <li
            key={i}
            className={cn(
              "px-4 py-3 border-l-2",
              a.priority === "urgent"
                ? "border-l-red-400"
                : a.priority === "important"
                  ? "border-l-amber-400"
                  : "border-l-transparent",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-medium">{a.title}</p>
              <div className="flex shrink-0 items-center gap-1.5">
                <span
                  className={cn(
                    "rounded px-2 py-0.5 text-xs font-medium",
                    PRIORITY_STYLE[a.priority] ?? PRIORITY_STYLE.important,
                  )}
                >
                  {PRIORITY_LABEL[a.priority] ?? a.priority}
                </span>
                <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {EFFORT_LABEL[a.effort] ?? a.effort}
                </span>
              </div>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{a.description}</p>
            {a.related_issues.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {a.related_issues.map((n) => (
                  <a
                    key={n}
                    href={`/issues?project=${projectId}&search=${n}`}
                    className="rounded bg-blue-50 px-2 py-0.5 text-xs font-mono text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    #{n}
                  </a>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
