import { Layers } from "lucide-react";
import { cn } from "@repo/ui/utils";

interface Pattern {
  title: string;
  description: string;
  affected_issues: number[];
  severity: string;
}

const SEVERITY_STYLE: Record<string, string> = {
  high: "bg-red-50 text-red-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

export function PatternsList({ patterns }: { patterns: Pattern[] }) {
  if (patterns.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Layers className="size-4 text-violet-500" />
        <h3 className="text-base font-medium">Patronen</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {patterns.length}
        </span>
      </div>
      <ul className="divide-y">
        {patterns.map((p, i) => (
          <li key={i} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-medium">{p.title}</p>
              <span
                className={cn(
                  "shrink-0 rounded px-2 py-0.5 text-xs font-medium",
                  SEVERITY_STYLE[p.severity] ?? SEVERITY_STYLE.medium,
                )}
              >
                {p.severity}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
            {p.affected_issues.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {p.affected_issues.map((n) => (
                  <span
                    key={n}
                    className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground"
                  >
                    #{n}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
