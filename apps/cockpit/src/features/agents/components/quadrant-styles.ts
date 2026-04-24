import type { AgentQuadrant } from "@repo/ai/agents/registry";

export const quadrantHeader: Record<AgentQuadrant, string> = {
  cockpit: "bg-gradient-to-br from-blue-100 to-blue-200",
  devhub: "bg-gradient-to-br from-violet-100 to-violet-200",
  portal: "bg-gradient-to-br from-emerald-100 to-emerald-200",
  delivery: "bg-gradient-to-br from-orange-100 to-orange-200",
  cross: "bg-gradient-to-br from-slate-100 to-slate-200",
};

export const quadrantBadge: Record<AgentQuadrant, string> = {
  cockpit: "bg-blue-600 text-white",
  devhub: "bg-violet-600 text-white",
  portal: "bg-emerald-600 text-white",
  delivery: "bg-orange-600 text-white",
  cross: "bg-slate-600 text-white",
};

export const quadrantLabel: Record<AgentQuadrant, string> = {
  cockpit: "Cockpit",
  devhub: "DevHub",
  portal: "Portal",
  delivery: "Delivery",
  cross: "Cross",
};
