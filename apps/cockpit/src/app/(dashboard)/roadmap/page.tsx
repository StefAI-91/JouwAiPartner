import {
  CheckCircle2,
  Circle,
  Clock,
  Database,
  Globe,
  Layers,
  MessageSquare,
  Monitor,
  Rocket,
  Search,
  Server,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

/* ─── Types ─── */

interface Phase {
  version: string;
  title: string;
  subtitle: string;
  status: "complete" | "current" | "planned";
  items: PhaseItem[];
}

interface PhaseItem {
  label: string;
  done: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

/* ─── Data ─── */

const phases: Phase[] = [
  {
    version: "v1",
    title: "Meetings Pipeline",
    subtitle: "Automatische verwerking van meeting data",
    status: "complete",
    items: [
      { label: "8-tabel database schema", done: true, icon: Database },
      { label: "Fireflies webhook integratie", done: true, icon: Zap },
      { label: "Gatekeeper AI (classificatie)", done: true, icon: Shield },
      { label: "Extractor AI (decisions, actions, needs, insights)", done: true, icon: Sparkles },
      { label: "Cohere embeddings (vector search)", done: true, icon: Search },
      { label: "12 MCP tools met source attribution", done: true, icon: Server },
    ],
  },
  {
    version: "v2",
    title: "Review Gate & Dashboard",
    subtitle: "Human-in-the-loop verificatie en visueel overzicht",
    status: "complete",
    items: [
      { label: "Monorepo architectuur (Turborepo)", done: true, icon: Layers },
      { label: "Review queue met inline editing", done: true, icon: MessageSquare },
      { label: "Meeting detail pagina", done: true, icon: Monitor },
      { label: "Projecten overzicht + detail", done: true, icon: Layers },
      { label: "Dashboard met attention zone", done: true, icon: Monitor },
      { label: "Clients & People pagina's", done: true, icon: Users },
      { label: "MCP verificatie filter", done: true, icon: Shield },
    ],
  },
  {
    version: "v3",
    title: "Client Portal & Tweede Bron",
    subtitle: "Klantgerichte toegang en bredere data-intake",
    status: "planned",
    items: [
      { label: "Client portal (read-only per organisatie)", done: false, icon: Globe },
      { label: "Row Level Security (RLS) per klant", done: false, icon: Shield },
      { label: "Tweede databron (Google Docs / Email)", done: false, icon: Database },
      { label: "AI-gegenereerde project samenvattingen", done: false, icon: Sparkles },
      { label: "Knowledge reuse systeem (lessons learned)", done: false, icon: Search },
    ],
  },
  {
    version: "v4+",
    title: "Cockpit & AI Actions",
    subtitle: "Volledig autonoom platform met proactieve AI",
    status: "planned",
    items: [
      { label: "Curator agent (nachtelijk: dedupe, staleness)", done: false, icon: Sparkles },
      { label: "Analyst agent (dagelijks: patronen, trends)", done: false, icon: Search },
      { label: "Dispatcher (Slack/email notificaties)", done: false, icon: Rocket },
      { label: "Sprint/project management in platform", done: false, icon: Layers },
      { label: "Cross-source insights dashboard", done: false, icon: Monitor },
    ],
  },
];

const stats = [
  { label: "Sprints afgerond", value: "14" },
  { label: "Database tabellen", value: "8" },
  { label: "MCP Tools", value: "12" },
  { label: "Pagina's live", value: "18+" },
];

/* ─── Status helpers ─── */

function statusColor(status: Phase["status"]) {
  switch (status) {
    case "complete":
      return "bg-primary text-primary-foreground";
    case "current":
      return "bg-warning text-warning-foreground";
    case "planned":
      return "bg-muted text-muted-foreground";
  }
}

function statusLabel(status: Phase["status"]) {
  switch (status) {
    case "complete":
      return "Afgerond";
    case "current":
      return "In uitvoering";
    case "planned":
      return "Gepland";
  }
}

function statusIcon(status: Phase["status"]) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="h-5 w-5 text-primary" />;
    case "current":
      return <Clock className="h-5 w-5 text-warning" />;
    case "planned":
      return <Circle className="h-5 w-5 text-muted-foreground" />;
  }
}

/* ─── Page ─── */

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8">
      {/* Header */}
      <div>
        <h1>Roadmap</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Executive overview — waar we staan en waar we naartoe gaan.
        </p>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardContent className="pt-1 text-center">
              <p className="text-2xl font-bold text-primary font-heading">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Current status banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 pt-1">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Rocket className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-heading font-semibold">Platform is live</p>
            <p className="text-sm text-muted-foreground">
              v1 (meetings pipeline) en v2 (review gate + dashboard) zijn volledig afgerond.
              Meetings worden automatisch verwerkt via AI, gereviewd door het team, en
              zijn doorzoekbaar via MCP. De volgende stap is het client portal en een tweede
              databron.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <section className="space-y-6">
        <h2>Fases</h2>

        <div className="relative space-y-6">
          {/* Vertical timeline line */}
          <div className="absolute top-2 bottom-2 left-[18px] w-px bg-border" />

          {phases.map((phase) => (
            <div key={phase.version} className="relative pl-12">
              {/* Timeline dot */}
              <div className="absolute left-[7px] top-1">
                {statusIcon(phase.status)}
              </div>

              <Card>
                <CardHeader className="border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <CardTitle>{phase.version} — {phase.title}</CardTitle>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor(phase.status)}`}
                    >
                      {statusLabel(phase.status)}
                    </span>
                  </div>
                  <CardDescription>{phase.subtitle}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 pt-3">
                  {phase.items.map((item) => (
                    <div key={item.label} className="flex items-center gap-2.5 text-sm">
                      {item.done ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                      )}
                      <item.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className={item.done ? "" : "text-muted-foreground"}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture summary */}
      <section className="space-y-4">
        <h2>Hoe het werkt</h2>
        <Card>
          <CardContent className="space-y-4 pt-1">
            <div className="flex flex-col gap-3">
              {[
                {
                  step: "1",
                  title: "Meeting wordt opgenomen",
                  desc: "Fireflies stuurt automatisch het transcript via webhook.",
                },
                {
                  step: "2",
                  title: "AI classificeert & extraheert",
                  desc: "Gatekeeper (Haiku) filtert, Extractor (Sonnet) haalt decisions, actions, needs en insights eruit.",
                },
                {
                  step: "3",
                  title: "Team reviewt",
                  desc: "Draft content komt in de review queue. Reviewers keuren goed, passen aan, of wijzen af.",
                },
                {
                  step: "4",
                  title: "Kennis wordt doorzoekbaar",
                  desc: "Geverifieerde content is beschikbaar via het dashboard en MCP tools (voor AI assistenten).",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-heading text-sm font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Tech stack */}
      <section className="space-y-4">
        <h2>Tech Stack</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Frontend", value: "Next.js 16, React 19, Tailwind 4, shadcn/ui" },
            { label: "Database", value: "Supabase (PostgreSQL + pgvector)" },
            { label: "AI Models", value: "Claude Haiku, Sonnet & Opus via Vercel AI SDK" },
            { label: "Embeddings", value: "Cohere embed-v4 (1024-dim)" },
            { label: "MCP Server", value: "12 tools, verificatie-filter, TypeScript" },
            { label: "Hosting", value: "Vercel + Supabase (EU-Frankfurt)" },
          ].map((item) => (
            <Card key={item.label} size="sm">
              <CardContent className="pt-1">
                <p className="text-xs font-semibold text-muted-foreground">{item.label}</p>
                <p className="text-sm">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
