import { BarChart3, Plus } from "lucide-react";
import { Button } from "@repo/ui/button";
import { SystemOverview } from "@/components/agents/system-overview";
import { AgentCardFull } from "@/components/agents/agent-card-full";
import { AgentCardCompact, AddAgentPlaceholder } from "@/components/agents/agent-card-compact";
import { ActivityFeed } from "@/components/agents/activity-feed";
import { agents, activityFeed, systemStats } from "./_data";

export const dynamic = "force-dynamic";

export default function AgentsPage() {
  const live = agents.filter((a) => a.status === "live");
  const building = agents.filter((a) => a.status === "building");
  const planned = agents.filter((a) => a.status === "planned");

  return (
    <div className="px-4 pb-32 pt-6 lg:px-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Agents</h1>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              Preview · mock data
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Je digitale team · {agents.length} collega&apos;s verdeeld over vier quadranten
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <BarChart3 className="mr-1.5 h-4 w-4" />
            Logs
          </Button>
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Nieuwe agent
          </Button>
        </div>
      </div>

      <section className="mb-8">
        <SystemOverview stats={systemStats} />
      </section>

      <section className="mb-10">
        <div className="mb-4 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <h2 className="text-lg font-semibold">Live · {live.length} agents</h2>
          <span className="text-sm text-muted-foreground">deze draaien productie-workloads</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {live.map((agent) => (
            <AgentCardFull key={agent.id} agent={agent} />
          ))}
        </div>
      </section>

      {building.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <h2 className="text-lg font-semibold">
              In ontwikkeling · {building.length} agent{building.length === 1 ? "" : "s"}
            </h2>
            <span className="text-sm text-muted-foreground">
              wordt nu gebouwd — nog niet productie
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {building.map((agent) => (
              <AgentCardFull key={agent.id} agent={agent} />
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          <h2 className="text-lg font-semibold">Op de roadmap · {planned.length} agents</h2>
          <span className="text-sm text-muted-foreground">
            conceptueel gedefinieerd, wachten op sprint
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {planned.map((agent) => (
            <AgentCardCompact key={agent.id} agent={agent} />
          ))}
          <AddAgentPlaceholder />
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
            </span>
            <h2 className="text-lg font-semibold">Live activiteit</h2>
            <span className="text-sm text-muted-foreground">laatste 30 minuten</span>
          </div>
          <a className="text-sm text-muted-foreground hover:text-foreground" href="#">
            Volledige logs →
          </a>
        </div>
        <ActivityFeed events={activityFeed} />
      </section>
    </div>
  );
}
