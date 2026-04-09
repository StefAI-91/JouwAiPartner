import { AlertTriangle } from "lucide-react";
import { cn } from "@repo/ui/utils";

interface Risk {
  title: string;
  description: string;
  affected_issues: number[];
  urgency: string;
}

const URGENCY_STYLE: Record<string, string> = {
  urgent: "bg-red-50 text-red-700",
  important: "bg-amber-50 text-amber-700",
  monitor: "bg-slate-100 text-slate-600",
};

const URGENCY_LABEL: Record<string, string> = {
  urgent: "Urgent",
  important: "Belangrijk",
  monitor: "Monitor",
};

export function RisksList({ risks }: { risks: Risk[] }) {
  if (risks.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <AlertTriangle className="size-4 text-amber-500" />
        <h3 className="text-base font-medium">Risico&apos;s</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {risks.length}
        </span>
      </div>
      <ul className="divide-y">
        {risks.map((r, i) => (
          <li key={i} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-medium">{r.title}</p>
              <span
                className={cn(
                  "shrink-0 rounded px-2 py-0.5 text-xs font-medium",
                  URGENCY_STYLE[r.urgency] ?? URGENCY_STYLE.important,
                )}
              >
                {URGENCY_LABEL[r.urgency] ?? r.urgency}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.description}</p>
            {r.affected_issues.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {r.affected_issues.map((n) => (
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
