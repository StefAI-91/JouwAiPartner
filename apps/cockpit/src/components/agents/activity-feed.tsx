import type { ActivityEvent } from "@/app/(dashboard)/agents/_data";
import { quadrantHeader } from "./quadrant-styles";

function OutcomeBadge({ outcome }: { outcome: ActivityEvent["outcome"] }) {
  const styles = {
    success: "bg-green-50 text-green-700",
    blocked: "bg-amber-50 text-amber-700",
    error: "bg-red-50 text-red-700",
  };
  const labels = {
    success: "✓ success",
    blocked: "⊘ blocked",
    error: "✗ error",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[outcome]}`}>
      {labels[outcome]}
    </span>
  );
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <div className="divide-y divide-border/50 rounded-xl border border-border/50 bg-card">
      {events.map((evt) => (
        <div key={evt.id} className="flex items-center gap-3 px-5 py-3">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg ${quadrantHeader[evt.quadrant]}`}
          >
            {evt.mascot}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm">
              <span className="font-semibold">{evt.agentName}</span>{" "}
              <span className="text-muted-foreground">{evt.summary}</span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {evt.minutesAgo} min geleden · {evt.model} · €{evt.cost.toFixed(3).replace(".", ",")}{" "}
              · {evt.durationSec}s{evt.detail ? ` · ${evt.detail}` : ""}
            </div>
          </div>
          <OutcomeBadge outcome={evt.outcome} />
        </div>
      ))}
    </div>
  );
}
