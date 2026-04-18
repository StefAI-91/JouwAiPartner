import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Rocket,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@repo/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";

export const dynamic = "force-static";

export default function ShiftPage() {
  return (
    <div className="space-y-16 px-4 py-10 lg:px-10 max-w-[1400px] mx-auto">
      {/* ─── Hero ─── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="size-5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Visie — waar we heen moeten
          </span>
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-4 font-heading">
          Van data-lijstjes <span className="text-muted-foreground">naar</span>
          <br />
          project-werkruimte
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">
          De cockpit is nu georganiseerd rond <em>databronnen</em> (meetings, emails, tasks,
          review). Projecten zijn een submenu. De data is er al — project-briefings, timelines,
          extractions — maar ze leven niet omdat niemand er binnenstapt. Tijd om 80% van de app in
          een project te laten plaatsvinden.
        </p>
      </section>

      {/* ─── Before / After ─── */}
      <section>
        <h2 className="text-2xl font-bold mb-8 font-heading">De shift</h2>
        <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 items-stretch">
          {/* BEFORE */}
          <Card className="border-destructive/20">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="destructive" className="uppercase tracking-wider">
                  Nu
                </Badge>
                <span className="text-xs text-muted-foreground">Data-type navigatie</span>
              </div>
              <CardTitle className="text-xl">Je opent de app en ziet…</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MiniNavRow icon={LayoutDashboard} label="Dashboard" sub="Alle meetings" />
              <MiniNavRow icon={Calendar} label="Meetings" sub="Lijst van 47 items" />
              <MiniNavRow icon={Mail} label="Emails" sub="Lijst van 183 items" />
              <MiniNavRow icon={Inbox} label="Review" sub="12 drafts" />
              <MiniNavRow icon={FolderKanban} label="Projecten" sub="Ergens onderin" dim />
              <MiniNavRow icon={Users} label="People, Clients, …" dim />
              <div className="mt-4 pt-4 border-t text-sm text-muted-foreground italic leading-relaxed">
                &ldquo;Waar stond ook alweer dat CAI Studio nog wacht op de credentials? Ergens in
                een meeting van vorige week…&rdquo;
              </div>
            </CardContent>
          </Card>

          {/* Arrow */}
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <ArrowRight className="size-10 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Shift
              </span>
            </div>
          </div>

          {/* AFTER */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="uppercase tracking-wider">Straks</Badge>
                <span className="text-xs text-muted-foreground">Project-first workspace</span>
              </div>
              <CardTitle className="text-xl">Je opent de app en ziet…</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MiniProjectRow
                name="CAI Studio"
                client="CAI B.V."
                status="in uitvoering"
                nextAction="Credentials ophalen bij Joris"
                urgent
              />
              <MiniProjectRow
                name="Flowwijs migratie"
                client="Flowwijs"
                status="review"
                nextAction="Beslissing hosting nodig"
              />
              <MiniProjectRow
                name="MKB Portal"
                client="De Haan Advies"
                status="kickoff"
                nextAction="Kickoff-doc afronden"
              />
              <MiniProjectRow
                name="3 andere lopende projecten"
                sub
                nextAction="Geen urgente acties"
              />
              <div className="mt-4 pt-4 border-t text-sm text-foreground/80 italic leading-relaxed">
                &ldquo;Klik CAI Studio → AI vertelt direct: wachten op credentials, Wouter moet
                Joris mailen, demo staat dinsdag gepland.&rdquo;
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ─── Project Workspace Mockup ─── */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Target className="size-5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Het nieuwe project-werkblad
          </span>
        </div>
        <h2 className="text-2xl font-bold mb-2 font-heading">
          Zo ziet <span className="text-primary">/projects/cai-studio</span> eruit
        </h2>
        <p className="text-muted-foreground mb-8 max-w-3xl">
          Vijf panelen. Elk paneel beantwoordt één vraag. Alles is één klik actionable — promote
          naar task, stuur door naar DevHub, draft antwoord, zet op agenda voor volgende meeting.
        </p>

        {/* Project header */}
        <div className="rounded-xl border bg-card p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">CAI B.V.</p>
              <div className="flex items-center gap-3">
                <h3 className="text-3xl font-bold font-heading">CAI Studio</h3>
                <Badge variant="outline" className="gap-1.5">
                  <span className="size-1.5 rounded-full bg-warning" />
                  In uitvoering
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Clock className="size-3" /> Deadline 12 mei
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Users className="size-3" /> Wouter, Ege
              </Badge>
            </div>
          </div>

          {/* Status pipeline stub */}
          <div className="flex items-center gap-2 text-xs">
            <PipelineStep label="Kickoff" done />
            <PipelineStep label="Ontwerp" done />
            <PipelineStep label="Uitvoering" active />
            <PipelineStep label="Review" />
            <PipelineStep label="Oplevering" />
          </div>
        </div>

        {/* 5 panels grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Panel 1: Next Actions (AI) — takes 2 cols */}
          <Card className="lg:col-span-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-1.5">
                    <Bot className="size-4 text-primary" />
                  </div>
                  <CardTitle>Next actions</CardTitle>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Sparkles className="size-2.5" /> AI-voorgesteld
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">Top 3 prioriteiten</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <NextAction
                rank={1}
                urgency="hoog"
                title="Mail Joris (CAI) voor productie-credentials"
                why="Uit meeting 14 apr: Wouter zou dit doen — 4 dagen geleden. Blokkeert deploy."
                actions={["Naar Wouter toewijzen", "Draft mail", "Zet op agenda dinsdag"]}
              />
              <NextAction
                rank={2}
                urgency="medium"
                title="Beslissing: eigen auth of Supabase Auth?"
                why="Vraag uit email Joris 16 apr + action item uit design-meeting. Nog open."
                actions={[
                  "Naar DevHub als ticket",
                  "Beslissing-agendapunt",
                  "Technisch voorbereiden",
                ]}
              />
              <NextAction
                rank={3}
                urgency="laag"
                title="Demo-voorbereiding: scope definiëren"
                why="Demo staat op 23 apr. Nog geen agenda of scope afgestemd met klant."
                actions={["Agenda draften", "Stuur naar Joris", "Scope met team"]}
              />
            </CardContent>
          </Card>

          {/* Panel 2: Risks / Stale */}
          <Card className="border-destructive/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-destructive/10 p-1.5">
                  <AlertTriangle className="size-4 text-destructive" />
                </div>
                <CardTitle>Risico&apos;s &amp; stale</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <RiskItem
                severity="hoog"
                title="Credentials 4 dagen oud"
                detail="Deploy staat stil."
              />
              <RiskItem
                severity="medium"
                title="Scope-creep signaal"
                detail="3 nieuwe feature-requests in email deze week, niet in originele SOW."
              />
              <RiskItem
                severity="medium"
                title="Geen reactie klant 6 dagen"
                detail="Laatste email onbeantwoord sinds 12 apr."
              />
              <RiskItem
                severity="laag"
                title="Design-doc verouderd"
                detail="Laatst geüpdatet 3 weken geleden."
              />
            </CardContent>
          </Card>

          {/* Panel 3: Wie wacht op wie */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-secondary p-1.5">
                  <Users className="size-4 text-foreground" />
                </div>
                <CardTitle>Wie wacht op wie</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <WaitingRow from="Wouter" onWho="Joris (CAI)" what="Credentials" days={4} urgent />
              <WaitingRow from="Ege" onWho="Stef" what="Review van PR #42" days={2} />
              <WaitingRow
                from="Joris (CAI)"
                onWho="Ons team"
                what="Antwoord op auth-vraag"
                days={2}
              />
              <WaitingRow
                from="Kenji (extern)"
                onWho="Ege"
                what="Designs voor admin panel"
                days={1}
              />
            </CardContent>
          </Card>

          {/* Panel 4: Wachten op klant */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-warning/10 p-1.5">
                  <Clock className="size-4 text-warning" />
                </div>
                <CardTitle>Wachten op klant</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ClientWaitingItem
                title="Beslissing auth-strategie"
                since="16 apr"
                source="email Joris"
              />
              <ClientWaitingItem
                title="Goedkeuring design admin panel"
                since="11 apr"
                source="meeting kickoff"
              />
              <ClientWaitingItem
                title="Productie credentials"
                since="14 apr"
                source="meeting design review"
                urgent
              />
            </CardContent>
          </Card>

          {/* Panel 5: Pulse + Prep */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-1.5">
                  <TrendingUp className="size-4 text-primary" />
                </div>
                <CardTitle>Pulse &amp; volgende gesprek</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Laatste meeting — 16 apr
                </p>
                <p className="text-foreground/80 leading-relaxed">
                  Design review met Joris. Admin panel goedgekeurd onder voorwaarde, auth blijft
                  open vraag, demo ingepland 23 apr.
                </p>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar className="size-3" />
                  Prep voor 23 apr — demo
                </p>
                <ul className="space-y-1.5 text-foreground/80">
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    Bevestigen: auth-keuze vóór gesprek
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    Scope demo: alleen core flows
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    Open items: credentials, review PR #42
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ─── Data is er al ─── */}
      <section className="rounded-2xl border bg-secondary/40 p-8">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="size-5 text-success" />
              <span className="text-xs font-semibold uppercase tracking-wider text-success">
                Goed nieuws
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-4 font-heading">
              De data is er al. Het datamodel klopt.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Elk paneel hierboven kan gevuld worden met bestaande tabellen — geen migratie nodig
              voor paneel 1–4. Alleen paneel 1 (&ldquo;Next actions&rdquo;) heeft straks een nieuwe
              agent nodig voor écht proactief advies.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <DataSourceRow
              panel="Next actions"
              sources="extractions (action_item) + tasks + een nieuwe Orchestrator agent"
              missing
            />
            <DataSourceRow
              panel="Risico's & stale"
              sources="extractions age + meeting_projects.last_meeting_date + status checks"
            />
            <DataSourceRow
              panel="Wie wacht op wie"
              sources="tasks (assigned_to, created_at) + extractions (wachten_op_*)"
            />
            <DataSourceRow
              panel="Wachten op klant"
              sources="extractions.metadata (wachten_op_extern = true)"
            />
            <DataSourceRow
              panel="Pulse & prep"
              sources="briefing_summary + meeting_project_summaries + aankomende meetings"
            />
          </div>
        </div>
      </section>

      {/* ─── Sprint Roadmap ─── */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Rocket className="size-5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Hoe we hier komen
          </span>
        </div>
        <h2 className="text-2xl font-bold mb-8 font-heading">Sprint roadmap</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Sprint 1 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="uppercase">Sprint 1</Badge>
                  <span className="text-sm text-muted-foreground">~1 week</span>
                </div>
                <Zap className="size-4 text-primary" />
              </div>
              <CardTitle className="text-xl mt-2">UI shift: project-werkblad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Geen nieuwe AI-agents. Alleen data die er al is beter presenteren.
              </p>
              <ul className="space-y-2 text-sm">
                <SprintItem>Herontwerp /projects/[id] tot 5-panelen workspace</SprintItem>
                <SprintItem>
                  Homepage krijgt project-switcher bovenaan (spring direct in project)
                </SprintItem>
                <SprintItem>Eén-klik acties per extraction: promote, send DevHub, draft</SprintItem>
                <SprintItem>
                  Sidebar: actieve projecten prominent, data-lijsten secundair
                </SprintItem>
                <SprintItem>Query&apos;s toevoegen voor &ldquo;wachten op&rdquo; flags</SprintItem>
              </ul>
              <div className="pt-3 border-t">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Exit criterium
                </p>
                <p className="text-sm">
                  Je opent de app → kiest een project → ziet direct wat er moet gebeuren, zonder op
                  3 plekken te zoeken.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sprint 2 */}
          <Card className="border-primary/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="uppercase">Sprint 2</Badge>
                  <span className="text-sm text-muted-foreground">~1 week</span>
                </div>
                <Bot className="size-4 text-primary" />
              </div>
              <CardTitle className="text-xl mt-2">AI: Project Orchestrator agent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Nieuwe agent die proactief vertelt wat er moet gebeuren.
              </p>
              <ul className="space-y-2 text-sm">
                <SprintItem>
                  Tabel <code className="text-xs bg-muted px-1 rounded">project_pulse</code> met
                  next_steps, blockers, suggestions
                </SprintItem>
                <SprintItem>
                  Orchestrator agent (Sonnet) — draait na elk nieuw verified item of 1x per uur
                </SprintItem>
                <SprintItem>Review-flow voor agent output (verification principle)</SprintItem>
                <SprintItem>
                  &ldquo;Next actions&rdquo; paneel wordt gevoed door verified pulse-output
                </SprintItem>
                <SprintItem>Dispatcher stub: urgent pulse-items → Slack/email melding</SprintItem>
              </ul>
              <div className="pt-3 border-t">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Exit criterium
                </p>
                <p className="text-sm">
                  AI vertelt je &lsquo;s ochtends wat er vandaag in project X moet gebeuren, vóór je
                  het zelf bedenkt.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Future sprints teaser */}
        <div className="mt-6 rounded-xl border border-dashed p-6 bg-card/50">
          <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Later (als de basis staat)
          </p>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <FutureItem
              icon={Send}
              title="Sprint 3 — Communicatie"
              text="AI drafts emails/updates per project. Jij reviewt en verstuurt."
            />
            <FutureItem
              icon={MessageSquare}
              title="Sprint 4 — Portal"
              text="Klant ziet zijn project-pulse read-only. Stelt vragen via AI Q&A."
            />
            <FutureItem
              icon={FileText}
              title="Sprint 5 — Cross-project"
              text="Analyst agent: patronen en kennis-hergebruik over alle projecten."
            />
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="rounded-2xl bg-primary text-primary-foreground p-8 md:p-12">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold mb-4 font-heading">Waar starten we?</h2>
          <p className="text-primary-foreground/80 text-lg leading-relaxed mb-6">
            Sprint 1 eerst. De data-laag werkt — jouw probleem zit in de plek waar je landt als je
            de app opent. Dat los je op met UI, niet met nog een AI-agent.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="bg-white/10 rounded-full px-4 py-2">1. Akkoord op deze shift</span>
            <ArrowRight className="size-5 self-center opacity-60" />
            <span className="bg-white/10 rounded-full px-4 py-2">2. Sprint 1 spec schrijven</span>
            <ArrowRight className="size-5 self-center opacity-60" />
            <span className="bg-white/10 rounded-full px-4 py-2">3. Bouwen</span>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Sub-components ─── */

function MiniNavRow({
  icon: Icon,
  label,
  sub,
  dim,
}: {
  icon: React.ElementType;
  label: string;
  sub?: string;
  dim?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-md p-2 ${dim ? "opacity-40" : ""}`}>
      <Icon className="size-4 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function MiniProjectRow({
  name,
  client,
  status,
  nextAction,
  urgent,
  sub,
}: {
  name: string;
  client?: string;
  status?: string;
  nextAction: string;
  urgent?: boolean;
  sub?: boolean;
}) {
  if (sub) {
    return (
      <div className="rounded-md p-2 text-xs text-muted-foreground italic">
        {name} — {nextAction}
      </div>
    );
  }
  return (
    <div
      className={`rounded-lg border p-3 ${urgent ? "border-destructive/40 bg-destructive/5" : "bg-card"}`}
    >
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">
            {client} • {status}
          </p>
        </div>
        {urgent && (
          <Badge variant="destructive" className="text-[10px]">
            urgent
          </Badge>
        )}
      </div>
      <p className="text-xs text-foreground/80 flex items-center gap-1.5 mt-1.5">
        <Zap className="size-3 text-primary" /> {nextAction}
      </p>
    </div>
  );
}

function PipelineStep({
  label,
  done,
  active,
}: {
  label: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`size-2 rounded-full ${
          done ? "bg-success" : active ? "bg-warning ring-4 ring-warning/20" : "bg-muted"
        }`}
      />
      <span
        className={`text-xs ${
          done
            ? "text-muted-foreground line-through"
            : active
              ? "font-semibold text-foreground"
              : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
      {label !== "Oplevering" && <div className="w-6 h-px bg-border" />}
    </div>
  );
}

function NextAction({
  rank,
  urgency,
  title,
  why,
  actions,
}: {
  rank: number;
  urgency: "hoog" | "medium" | "laag";
  title: string;
  why: string;
  actions: string[];
}) {
  const urgencyColor =
    urgency === "hoog" ? "destructive" : urgency === "medium" ? "outline" : ("secondary" as const);
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-semibold text-sm">{title}</h4>
            <Badge
              variant={urgencyColor as "destructive" | "outline" | "secondary"}
              className="text-[10px]"
            >
              {urgency}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{why}</p>
          <div className="flex flex-wrap gap-1.5">
            {actions.map((a) => (
              <span
                key={a}
                className="text-[11px] rounded-md border bg-background px-2 py-1 hover:bg-muted cursor-pointer"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskItem({
  severity,
  title,
  detail,
}: {
  severity: "hoog" | "medium" | "laag";
  title: string;
  detail: string;
}) {
  const colorClass =
    severity === "hoog"
      ? "bg-destructive"
      : severity === "medium"
        ? "bg-warning"
        : "bg-muted-foreground";
  return (
    <div className="flex gap-3">
      <div className={`size-2 mt-1.5 rounded-full shrink-0 ${colorClass}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function WaitingRow({
  from,
  onWho,
  what,
  days,
  urgent,
}: {
  from: string;
  onWho: string;
  what: string;
  days: number;
  urgent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium">{from}</span>{" "}
          <span className="text-muted-foreground">wacht op</span>{" "}
          <span className="font-medium">{onWho}</span>
        </p>
        <p className="text-xs text-muted-foreground truncate">{what}</p>
      </div>
      <Badge variant={urgent ? "destructive" : "outline"} className="text-[10px] shrink-0">
        {days}d
      </Badge>
    </div>
  );
}

function ClientWaitingItem({
  title,
  since,
  source,
  urgent,
}: {
  title: string;
  since: string;
  source: string;
  urgent?: boolean;
}) {
  return (
    <div className={`rounded-md p-2 ${urgent ? "bg-destructive/5" : ""}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">
        sinds {since} • {source}
      </p>
    </div>
  );
}

function DataSourceRow({
  panel,
  sources,
  missing,
}: {
  panel: string;
  sources: string;
  missing?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-background/60 p-3">
      {missing ? (
        <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium">{panel}</p>
        <p className="text-xs text-muted-foreground">{sources}</p>
      </div>
    </div>
  );
}

function SprintItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}

function FutureItem({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="size-4 text-muted-foreground" />
        <p className="font-semibold text-sm">{title}</p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}
