import {
  ArrowUp,
  Bell,
  Bug,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  ExternalLink,
  Layers,
  Lightbulb,
  LogOut,
  Menu,
  Sparkles,
  Sprout,
} from "lucide-react";

export default function RoadmapSketchPage() {
  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8 md:px-8">
      <div className="mx-auto mb-6 max-w-5xl rounded-md border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-foreground">
        MOCKUP — ter validatie. Dit is geen echte data.
      </div>

      <header className="mx-auto mb-8 max-w-5xl">
        <h1 className="text-2xl font-bold tracking-tight">Portal Roadmap — voor / na</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mobiele weergave (375px). Links: huidig. Rechts: voorstel.
        </p>
      </header>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2 md:items-start">
        <PhoneFrame label="Voor (huidig)">
          <CurrentRoadmap />
        </PhoneFrame>
        <PhoneFrame label="Na (voorstel)">
          <ProposedRoadmap />
        </PhoneFrame>
      </div>
    </div>
  );
}

function PhoneFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="w-[375px] overflow-hidden rounded-[32px] border-[10px] border-zinc-900 bg-background shadow-2xl">
        <div className="flex items-center justify-between bg-zinc-900 px-5 py-1.5 text-[11px] font-medium text-zinc-100">
          <span>17:52</span>
          <span className="opacity-70">JouwAIPartner</span>
        </div>
        <div className="max-h-[760px] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function MockTopBar() {
  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <Menu className="size-5 text-foreground" />
        <span className="text-sm font-medium text-foreground">roadmap</span>
      </div>
      <button className="rounded-md border border-border p-1.5 text-muted-foreground">
        <LogOut className="size-4" />
      </button>
    </div>
  );
}

function MockTabs({ active }: { active: string }) {
  const tabs = ["Dashboard", "Roadmap", "Issues", "Feedback"];
  return (
    <div className="flex gap-5 border-b border-border bg-card px-4 pt-2">
      {tabs.map((t) => (
        <span
          key={t}
          className={
            t === active
              ? "border-b-2 border-primary pb-2 text-sm font-medium text-foreground"
              : "pb-2 text-sm text-muted-foreground"
          }
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function CurrentRoadmap() {
  return (
    <div className="bg-muted/20">
      <MockTopBar />
      <MockTabs active="Roadmap" />
      <div className="space-y-4 px-4 py-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Roadmap</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Wat we recent hebben opgeleverd en wat eraan zit te komen.
          </p>
        </div>

        <CurrentBucket
          title="Recent gefixt"
          count="00"
          blurb="Opgeleverd in de afgelopen veertien dagen"
        >
          <p className="px-1 py-3 text-sm italic text-muted-foreground">
            Nog geen recent opgeleverde onderwerpen
          </p>
        </CurrentBucket>

        <CurrentBucket
          title="Komende week"
          count="01"
          blurb="Wat in de huidige of eerstvolgende sprint zit"
        >
          <CurrentCard title="Wit scherm bij het laden van de applicatie" type="bug" />
        </CurrentBucket>

        <CurrentBucket
          title="Hoge prio daarna"
          count="00"
          blurb="Geprioriteerd, nog geen sprint toegewezen"
        >
          <p className="px-1 py-3 text-sm italic text-muted-foreground">
            Geen geprioriteerde onderwerpen wachtend
          </p>
        </CurrentBucket>

        <CurrentBucket title="Niet geprioriteerd" count="01" blurb="Wachtend op jullie signaal">
          <CurrentCard title="Bestandsupload werkt niet goed" type="bug" />
        </CurrentBucket>
      </div>
    </div>
  );
}

function CurrentBucket({
  title,
  count,
  blurb,
  children,
}: {
  title: string;
  count: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <header className="border-b border-border pb-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
        </div>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">{blurb}</p>
      </header>
      <div className="pt-3">{children}</div>
    </div>
  );
}

function CurrentCard({ title, type }: { title: string; type: "bug" | "feature" }) {
  return (
    <article className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground">
          {type === "bug" ? <Bug className="size-3" /> : <Lightbulb className="size-3" />}
          {type === "bug" ? "Bug" : "Feature"}
        </span>
      </div>
      <h4 className="text-sm font-semibold leading-snug text-foreground">{title}</h4>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-dashed border-border pt-2">
        <span className="inline-flex items-baseline gap-1.5 text-xs text-muted-foreground">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
            Onderwerpen
          </span>
          <span className="text-foreground">4</span>
        </span>
        <span className="inline-flex items-baseline gap-1.5 text-xs text-muted-foreground">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
            Bijgewerkt
          </span>
          <span className="text-foreground">vandaag</span>
        </span>
      </div>
    </article>
  );
}

function ProposedRoadmap() {
  return (
    <div className="bg-muted/20">
      <MockTopBar />
      <MockTabs active="Roadmap" />

      <div className="space-y-5 px-4 py-5">
        <SprintHero />

        <ProposedBucket
          tone="action"
          icon={<Bell className="size-4" />}
          title="Wachtend op jullie"
          subtitle="Wij hebben input nodig om verder te kunnen"
          count={2}
        >
          <ProposedCard
            title="Welke rolverdeling willen jullie voor de admin-pagina?"
            type="feature"
            priority="P1"
            actionPill="Jouw beurt"
            issues={3}
            updated="2 dagen open"
          />
          <ProposedCard
            title="Bestandsupload werkt niet goed"
            type="bug"
            priority="P2"
            actionPill="Reproduceer-stappen?"
            issues={1}
            updated="vandaag bijgewerkt"
          />
        </ProposedBucket>

        <ProposedBucket
          tone="upcoming"
          icon={<Sprout className="size-4" />}
          title="Komende week"
          subtitle="In de huidige sprint"
          count={1}
        >
          <ProposedCard
            title="Wit scherm bij het laden van de applicatie"
            type="bug"
            priority="P0"
            sprintTag="wk 18 · do 1 mei"
            issues={4}
            updated="vandaag bijgewerkt"
          />
        </ProposedBucket>

        <ProposedBucket
          tone="prio"
          icon={<ArrowUp className="size-4" />}
          title="Hoge prio daarna"
          subtitle="Geprioriteerd, nog geen sprint"
          count={0}
        >
          <EmptyRow>Niets geprioriteerd op dit moment</EmptyRow>
        </ProposedBucket>

        <ProposedBucket
          tone="done"
          icon={<Check className="size-4" />}
          title="Recent live"
          subtitle="Opgeleverd in de afgelopen 14 dagen"
          count={1}
        >
          <ProposedCard
            title="Exportknop bij rapportages"
            type="feature"
            priority="P2"
            livePill
            issues={2}
            updated="3 dagen geleden live"
          />
        </ProposedBucket>
      </div>
    </div>
  );
}

function SprintHero() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-gradient-to-br from-primary/8 via-card to-card px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-medium text-primary">
          <Calendar className="size-3.5" />
          Sprint week 18 · 28 apr — 5 mei
        </div>
        <p className="mt-1 text-sm text-foreground">Nog 3 werkdagen tot oplevering.</p>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border">
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-destructive">
            <Bell className="size-3" />
            Wachten op jullie
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">2</p>
          <p className="text-xs text-muted-foreground">items met vraag</p>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-success">
            <Sparkles className="size-3" />
            Live deze week
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">1</p>
          <p className="text-xs text-muted-foreground">klaar voor test</p>
        </div>
      </div>

      <button className="flex w-full items-center justify-between border-t border-border bg-destructive/8 px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/12">
        <span className="inline-flex items-center gap-2">
          <Bell className="size-4" />
          Bekijk wachtende items
        </span>
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

const TONE_CLASSES = {
  action: {
    border: "border-l-destructive",
    iconBg: "bg-destructive/10 text-destructive",
    pillBg: "bg-destructive/10 text-destructive",
  },
  upcoming: {
    border: "border-l-primary",
    iconBg: "bg-primary/10 text-primary",
    pillBg: "bg-primary/10 text-primary",
  },
  prio: {
    border: "border-l-warning",
    iconBg: "bg-warning/15 text-warning-foreground",
    pillBg: "bg-warning/15 text-warning-foreground",
  },
  done: {
    border: "border-l-success",
    iconBg: "bg-success/10 text-success",
    pillBg: "bg-success/10 text-success",
  },
} as const;

function ProposedBucket({
  tone,
  icon,
  title,
  subtitle,
  count,
  children,
}: {
  tone: keyof typeof TONE_CLASSES;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  count: number;
  children: React.ReactNode;
}) {
  const t = TONE_CLASSES[tone];
  return (
    <section
      className={`overflow-hidden rounded-lg border border-l-[3px] border-border bg-card ${t.border}`}
    >
      <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
          <span className={`flex size-7 items-center justify-center rounded-md ${t.iconBg}`}>
            {icon}
          </span>
          <div>
            <h3 className="text-sm font-semibold leading-tight text-foreground">{title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
            count === 0 ? "bg-muted text-muted-foreground" : t.pillBg
          }`}
        >
          {count}
        </span>
      </header>
      <div className="space-y-2 border-t border-border bg-muted/20 px-3 py-3">{children}</div>
    </section>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <div className="px-2 py-2 text-xs text-muted-foreground">{children}</div>;
}

function ProposedCard({
  title,
  type,
  priority,
  sprintTag,
  livePill,
  actionPill,
  issues,
  updated,
}: {
  title: string;
  type: "bug" | "feature";
  priority: "P0" | "P1" | "P2" | "P3";
  sprintTag?: string;
  livePill?: boolean;
  actionPill?: string;
  issues: number;
  updated: string;
}) {
  const PRIO_CLASS: Record<string, string> = {
    P0: "border-destructive/40 bg-destructive/10 text-destructive",
    P1: "border-warning/40 bg-warning/15 text-warning-foreground",
    P2: "border-border bg-secondary text-secondary-foreground",
    P3: "border-border bg-muted text-muted-foreground",
  };

  return (
    <article className="group flex cursor-pointer items-start gap-3 rounded-md border border-border bg-card p-3 shadow-sm transition-all hover:-translate-y-px hover:shadow-md">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {sprintTag ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                <Calendar className="size-3" />
                {sprintTag}
              </span>
            ) : null}
            {livePill ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
                <Sparkles className="size-3" />
                Live
              </span>
            ) : null}
            {actionPill ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                <Bell className="size-3" />
                {actionPill}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {type === "bug" ? <Bug className="size-3" /> : <Lightbulb className="size-3" />}
              {type === "bug" ? "Bug" : "Feature"}
            </span>
            <span
              className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${PRIO_CLASS[priority]}`}
            >
              {priority}
            </span>
          </div>
        </div>

        <h4 className="text-sm font-semibold leading-snug text-foreground">{title}</h4>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Layers className="size-3" />
            {issues} {issues === 1 ? "onderwerp" : "onderwerpen"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {updated}
          </span>
          {livePill ? (
            <span className="ml-auto inline-flex items-center gap-1 font-medium text-success">
              <ExternalLink className="size-3" />
              Probeer het uit
            </span>
          ) : null}
        </div>
      </div>
      <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </article>
  );
}
