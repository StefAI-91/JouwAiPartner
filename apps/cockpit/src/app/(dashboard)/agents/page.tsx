import { AGENT_REGISTRY, readAgentPrompt } from "@repo/ai/agents/registry";
import { estimateRunCostUsd } from "@repo/ai/agents/pricing";
import {
  getAgentMetrics,
  listRecentAgentRuns,
  type AgentMetrics,
} from "@repo/database/queries/agent-runs";
import { SystemOverview, type SystemStats } from "@/components/agents/system-overview";
import { AgentCard } from "@/components/agents/agent-card";
import { ActivityFeed } from "@/components/agents/activity-feed";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const agents = AGENT_REGISTRY;
  const liveAgents = agents.filter((a) => a.status === "live");
  const buildingAgents = agents.filter((a) => a.status === "building");

  const [metricsList, feed] = await Promise.all([
    getAgentMetrics(agents.map((a) => a.id)),
    listRecentAgentRuns(20),
  ]);

  const metricsById: Record<string, AgentMetrics> = {};
  for (const m of metricsList) metricsById[m.agent_name] = m;

  const agentsById = Object.fromEntries(agents.map((a) => [a.id, a]));

  const prompts: Record<string, string> = {};
  for (const a of agents) {
    try {
      prompts[a.id] = readAgentPrompt(a);
    } catch {
      prompts[a.id] = "(prompt niet gevonden)";
    }
  }

  const costPerAgent: Record<string, number> = {};
  let totalCostToday = 0;
  for (const agent of agents) {
    const m = metricsById[agent.id];
    const modelForCost = m?.last_model ?? agent.model;
    const cost = m
      ? estimateRunCostUsd(modelForCost, {
          input: m.total_input_tokens_today,
          output: m.total_output_tokens_today,
          cached: m.total_cached_tokens_today,
        })
      : 0;
    costPerAgent[agent.id] = cost;
    totalCostToday += cost;
  }

  const runsToday = metricsList.reduce((sum, m) => sum + m.runs_today, 0);
  const runs7d = metricsList.reduce((sum, m) => sum + m.runs_7d, 0);
  const errorsToday = feed.filter(
    (e) =>
      e.status === "error" && new Date(e.created_at).toDateString() === new Date().toDateString(),
  ).length;

  const agentsWith7dData = metricsList.filter((m) => m.runs_7d > 0);
  const overallSuccessRate =
    agentsWith7dData.length > 0
      ? Math.round(
          agentsWith7dData.reduce((s, m) => s + (m.success_rate_7d ?? 100), 0) /
            agentsWith7dData.length,
        )
      : 100;

  const stats: SystemStats = {
    activeCount: liveAgents.length,
    buildingCount: buildingAgents.length,
    activeNames: liveAgents.map((a) => a.name),
    runsToday,
    runs7d,
    costToday: totalCostToday,
    successRate7d: overallSuccessRate,
    runsErrorToday: errorsToday,
  };

  return (
    <div className="px-4 pb-32 pt-6 lg:px-10">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">Agents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Je digitale team · {liveAgents.length} live,{" "}
          {buildingAgents.length > 0 && `${buildingAgents.length} in ontwikkeling · `}
          klik een kaart om het system prompt te zien
        </p>
      </div>

      <section className="mb-8">
        <SystemOverview stats={stats} />
      </section>

      <section className="mb-10">
        <div className="mb-4 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <h2 className="text-lg font-semibold">Live · {liveAgents.length} agents</h2>
          <span className="text-sm text-muted-foreground">draaien productie-workloads</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {liveAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              metrics={metricsById[agent.id]}
              costTodayUsd={costPerAgent[agent.id] ?? 0}
              systemPrompt={prompts[agent.id] ?? ""}
            />
          ))}
        </div>
      </section>

      {buildingAgents.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <h2 className="text-lg font-semibold">
              In ontwikkeling · {buildingAgents.length} agent
              {buildingAgents.length === 1 ? "" : "s"}
            </h2>
            <span className="text-sm text-muted-foreground">wordt nu gebouwd / afgestemd</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {buildingAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                metrics={metricsById[agent.id]}
                costTodayUsd={costPerAgent[agent.id] ?? 0}
                systemPrompt={prompts[agent.id] ?? ""}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <div className="mb-4 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
          </span>
          <h2 className="text-lg font-semibold">Recente runs</h2>
          <span className="text-sm text-muted-foreground">laatste 20 calls</span>
        </div>
        <ActivityFeed events={feed} agentsById={agentsById} />
      </section>
    </div>
  );
}
