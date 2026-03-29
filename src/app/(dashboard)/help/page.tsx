import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Mic,
  Brain,
  Search,
  AlertTriangle,
  Users,
  Bell,
  Database,
  RefreshCw,
  Shield,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  status: "actief" | "gepland";
  details: string[];
}

function FeatureCard({ icon: Icon, title, description, status, details }: FeatureCardProps) {
  return (
    <Card className="group transition-colors hover:border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          <Badge
            variant={status === "actief" ? "default" : "secondary"}
            className="shrink-0 text-[10px] uppercase tracking-wider"
          >
            {status === "actief" && <span className="status-dot status-active mr-1.5" />}
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {details.map((detail, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary/40" />
              {detail}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

const pipelineSteps = [
  { label: "Fireflies", sub: "Webhook" },
  { label: "Pre-filters", sub: "Regels" },
  { label: "Gatekeeper", sub: "Haiku AI" },
  { label: "Novelty", sub: "Dedup" },
  { label: "Entities", sub: "Matching" },
  { label: "Opslaan", sub: "Embeddings" },
  { label: "Conflicts", sub: "Detectie" },
  { label: "Slack", sub: "Notificatie" },
];

const features: FeatureCardProps[] = [
  {
    icon: Mic,
    title: "Fireflies Ingestie",
    description: "Automatische verwerking van meeting transcripts",
    status: "actief",
    details: [
      "Webhook ontvangt automatisch nieuwe transcripts van Fireflies",
      "Pre-filters: meetings < 2 min of zonder deelnemers worden geskipt",
      "Transcripts in chunks van ~600 tokens voor optimale zoekresultaten",
      "Dubbele meetings automatisch gedetecteerd (idempotency)",
    ],
  },
  {
    icon: Brain,
    title: "Gatekeeper + Extractie",
    description: "AI-agent die content beoordeelt en structured data extraheert",
    status: "actief",
    details: [
      "Scoort relevantie (0.0–1.0) — alleen score >= 0.6 wordt opgeslagen",
      "Extraheert in 1 call: besluiten, actiepunten, updates, strategie, klantinfo",
      "Herkent entiteiten: personen, projecten, klanten, onderwerpen",
      "Actiepunten met automatische scope (project/persoonlijk)",
    ],
  },
  {
    icon: Users,
    title: "Entity Resolution",
    description: "Koppelt namen aan bestaande projecten en klanten",
    status: "actief",
    details: [
      "3-staps matching: exact → alias → embedding-similarity",
      "Hoge similarity (> 0.85): naam wordt automatisch als alias toegevoegd",
      "Ongematchte namen in pending_matches voor handmatige review",
      "Besluiten en actiepunten gekoppeld aan het juiste project",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Conflict-detectie",
    description: "Detecteert tegenstrijdige besluiten automatisch",
    status: "actief",
    details: [
      "Vergelijkt nieuw besluit met bestaande content (similarity > 0.8)",
      "Bij conflict: entry in update_suggestions met oud vs nieuw",
      "Directe Slack-notificatie met context over het conflict",
      "Systeem wijzigt nooit zelf — alleen signaleren en suggereren",
    ],
  },
  {
    icon: Search,
    title: "Semantisch Zoeken",
    description: "Zoek op betekenis, niet op exacte woorden",
    status: "actief",
    details: [
      "Cross-tabel: meetings, documenten, Slack en e-mails tegelijk",
      "Cohere embed-v4 embeddings (1024 dimensies) voor nauwkeurige resultaten",
      "Gerangschikt op relevantie (cosine similarity)",
      "API: POST /api/search met natuurlijke taal query",
    ],
  },
  {
    icon: RefreshCw,
    title: "Re-embedding Worker",
    description: "Houdt embeddings automatisch up-to-date",
    status: "actief",
    details: [
      "Elke 10 minuten via pg_cron",
      "Verwerkt rijen met embedding_stale = true",
      "Batches van 50 per tabel",
      "Meetings, decisions, documents, projects, Slack, e-mails, people",
    ],
  },
  {
    icon: Bell,
    title: "Dagelijkse Digest",
    description: "Slack-overzicht van ongematchte entiteiten",
    status: "actief",
    details: [
      "Dagelijks om 09:00 via pg_cron",
      "Ongematchte namen gegroepeerd met aantal en brontabellen",
      "Toont mogelijke matches met similarity score",
    ],
  },
  {
    icon: Shield,
    title: "Authenticatie",
    description: "E-mail/wachtwoord login via Supabase Auth",
    status: "actief",
    details: [
      "Middleware beschermt alle pagina's behalve /login",
      "Webhooks en cron endpoints uitgezonderd van auth",
      "Sessies via Supabase SSR cookies",
    ],
  },
  {
    icon: Database,
    title: "MCP Server",
    description: "Kennis beschikbaar voor elke LLM-client",
    status: "gepland",
    details: [
      "Aparte TypeScript/Node.js process",
      "Zoeken, opvragen en koppelen via MCP protocol",
      "Compatibel met Claude Desktop, Cursor en andere clients",
    ],
  },
];

const faqs = [
  {
    question: "Hoe komt data in het systeem?",
    answer:
      "Via Fireflies: wanneer een transcriptie klaar is, stuurt Fireflies een webhook. De transcript wordt verwerkt door de Gatekeeper, entiteiten worden gekoppeld, en alles wordt opgeslagen met embeddings.",
  },
  {
    question: "Wat gebeurt er als een meeting wordt afgekeurd?",
    answer:
      "Meetings met relevantie < 0.6 worden niet opgeslagen. De beslissing wordt gelogd in content_reviews. Meetings < 2 min of zonder deelnemers worden al voor de AI-stap gefilterd.",
  },
  {
    question: "Hoe werkt conflict-detectie?",
    answer:
      "Elk nieuw besluit wordt via embedding-similarity vergeleken met bestaande content. Bij similarity > 0.8 wordt een conflict gesignaleerd via Slack en opgeslagen als update_suggestion. Het systeem wijzigt nooit zelf content.",
  },
  {
    question: "Wat zijn pending matches?",
    answer:
      "Wanneer de AI een naam extraheert die niet automatisch gekoppeld kan worden, komt deze in pending_matches. Via de dagelijkse Slack-digest word je geinformeerd.",
  },
  {
    question: "Welke AI-modellen worden gebruikt?",
    answer:
      "Claude Haiku voor de Gatekeeper (~$0.001 per call). Cohere embed-v4 voor embeddings. Later: Sonnet voor de Curator, Opus voor de Analyst.",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-16">
      {/* Header */}
      <div>
        <h1>Hoe werkt het platform?</h1>
        <p className="mt-2 text-muted-foreground">
          Overzicht van alle functies en hoe ze samenwerken.
        </p>
      </div>

      {/* Pipeline visualization */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/30">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            De Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6">
          <div className="flex flex-wrap items-center gap-1.5">
            {pipelineSteps.map((step, i) => (
              <span key={step.label} className="flex items-center gap-1.5">
                <span className="flex flex-col items-center rounded-lg border border-border/50 bg-muted/40 px-3 py-2 transition-colors hover:border-primary/30 hover:bg-primary/5">
                  <span className="text-xs font-semibold">{step.label}</span>
                  <span className="text-[10px] text-muted-foreground">{step.sub}</span>
                </span>
                {i < pipelineSteps.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                )}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feature cards */}
      <div>
        <h2 className="mb-5">Functies</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="mb-5">Veelgestelde vragen</h2>
        <Card>
          <Accordion className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-sm">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      </div>
    </div>
  );
}
