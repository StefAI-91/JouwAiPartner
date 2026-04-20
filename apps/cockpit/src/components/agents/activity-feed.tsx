import type { AgentRunRow } from "@repo/database/queries/agent-runs";
import type { AgentDefinition } from "@repo/ai/agents/registry";
import { quadrantHeader } from "./quadrant-styles";

interface Props {
  events: AgentRunRow[];
  agentsById: Record<string, AgentDefinition>;
}

function formatMinutesAgo(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "zojuist";
  if (diffMin < 60) return `${diffMin} min`;
  const hours = Math.round(diffMin / 60);
  if (hours < 24) return `${hours} uur`;
  return `${Math.round(hours / 24)}d`;
}

function outcomeBadge(status: "success" | "error") {
  const styles = status === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700";
  const label = status === "error" ? "✗ error" : "✓ success";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>{label}</span>;
}

function latencyLabel(ms: number | null): string {
  if (ms == null) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function ActivityFeed({ events, agentsById }: Props) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/50 bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        Nog geen agent-runs gelogd. Zodra een agent draait verschijnt hij hier.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50 rounded-xl border border-border/50 bg-card">
      {events.map((evt) => {
        const agent = agentsById[evt.agent_name];
        const tokens = (evt.input_tokens ?? 0) + (evt.output_tokens ?? 0);
        return (
          <div key={evt.id} className="flex items-center gap-3 px-5 py-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg ${
                agent ? quadrantHeader[agent.quadrant] : "bg-slate-100"
              }`}
            >
              {agent?.mascot ?? "🤖"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">
                <span className="font-semibold">{agent?.name ?? evt.agent_name}</span>
                <span className="ml-2 text-muted-foreground">{evt.model}</span>
                {evt.error_message && (
                  <span className="ml-2 truncate text-xs text-red-600">— {evt.error_message}</span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {formatMinutesAgo(evt.created_at)} geleden
                {evt.latency_ms != null && ` · ${latencyLabel(evt.latency_ms)}`}
                {tokens > 0 && ` · ${tokens.toLocaleString("nl-NL")} tokens`}
                {evt.cached_tokens != null && evt.cached_tokens > 0 && (
                  <span className="text-green-700">
                    {" "}
                    · {evt.cached_tokens.toLocaleString("nl-NL")} cached
                  </span>
                )}
              </div>
            </div>
            {outcomeBadge(evt.status)}
          </div>
        );
      })}
    </div>
  );
}
