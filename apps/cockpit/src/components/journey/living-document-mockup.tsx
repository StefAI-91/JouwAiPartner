import { Card, CardContent, CardHeader } from "@repo/ui/card";
import {
  Calendar,
  Mail,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Clock,
  TrendingUp,
  Link2,
  FileText,
  type LucideIcon,
} from "lucide-react";

type RijpheidLevel = "rood" | "oranje" | "groen";

interface Source {
  type: "meeting" | "email";
  label: string;
}

interface DocSection {
  id: string;
  title: string;
  rijpheid: number;
  content: string | null;
  sources: Source[];
  assumptions: string[];
  changedSince: boolean;
  openQuestion?: string;
}

const fakeProject = {
  name: "Klippa Sales Sync",
  client: "Acme Group",
  phase: "Discovery",
  overallRijpheid: 62,
  lastUpdated: "2 dagen geleden",
  recentChanges: 3,
  meetingsCount: 2,
  emailsCount: 4,
};

const sections: DocSection[] = [
  {
    id: "probleem",
    title: "Probleem",
    rijpheid: 95,
    content:
      "Sales-team verliest 2u/dag aan handmatig overzetten van offertes uit Salesforce naar Klippa voor facturatie. Vertraging in cashflow en frequente fouten in factuurregels.",
    sources: [
      { type: "meeting", label: "Discovery-call 12 apr" },
      { type: "email", label: "Wouter — 18 apr" },
    ],
    assumptions: [],
    changedSince: false,
  },
  {
    id: "gebruikers",
    title: "Gebruikers",
    rijpheid: 80,
    content:
      "Sales-team (5 personen) is primaire gebruiker. Backoffice (2 personen) controleert voor verzending.",
    sources: [{ type: "meeting", label: "Discovery-call 12 apr" }],
    assumptions: ["Alleen kantoor-uren — geen mobiel scenario besproken"],
    changedSince: false,
  },
  {
    id: "success",
    title: "Success criteria",
    rijpheid: 60,
    content: "Tijd-besparing meetbaar: van 2u/dag naar < 15 min per medewerker.",
    sources: [{ type: "meeting", label: "Discovery-call 12 apr" }],
    assumptions: ["Definitie van 'fout' nog niet expliciet gemaakt"],
    changedSince: true,
  },
  {
    id: "scope",
    title: "Scope (in/uit)",
    rijpheid: 70,
    content:
      "IN: Salesforce → Klippa eenrichting, alle offerte-velden, dagelijkse sync.\nUIT: terugflow Klippa → Salesforce, andere CRM's, mobiele toegang.",
    sources: [
      { type: "meeting", label: "Discovery-call 12 apr" },
      { type: "email", label: "Stef — 20 apr" },
    ],
    assumptions: [],
    changedSince: true,
  },
  {
    id: "constraints",
    title: "Constraints",
    rijpheid: 45,
    content: "Salesforce-API toegang via service-account beschikbaar. Klippa-API onderzoek loopt.",
    sources: [{ type: "email", label: "Wouter — 18 apr" }],
    assumptions: ["Klippa heeft publieke API met schrijfrechten — nog niet bevestigd"],
    changedSince: false,
    openQuestion: "Heeft Klippa een publieke API met schrijfrechten op facturen?",
  },
  {
    id: "budget",
    title: "Budget",
    rijpheid: 20,
    content: null,
    sources: [],
    assumptions: [],
    changedSince: false,
    openQuestion: "Wat is de budget-bandbreedte? Indicatief gemikt op € 15–25k?",
  },
  {
    id: "timeline",
    title: "Timeline",
    rijpheid: 50,
    content: "Wens: live vóór Q3 (1 juli 2026). Geen harde contract-deadline.",
    sources: [{ type: "meeting", label: "Discovery-call 12 apr" }],
    assumptions: [],
    changedSince: false,
  },
  {
    id: "stakeholders",
    title: "Stakeholders",
    rijpheid: 75,
    content: "Beslisser: Wouter (CFO). Eindgebruiker: sales-team. Sponsor: Stef (CEO).",
    sources: [{ type: "meeting", label: "Discovery-call 12 apr" }],
    assumptions: ["IT-betrokkenheid nog niet gevalideerd — wie keurt API-toegang goed?"],
    changedSince: true,
  },
];

function rijpheidLevel(score: number): RijpheidLevel {
  if (score >= 75) return "groen";
  if (score >= 50) return "oranje";
  return "rood";
}

function rijpheidColors(level: RijpheidLevel) {
  const map: Record<RijpheidLevel, { bar: string; text: string; bg: string; border: string }> = {
    groen: {
      bar: "bg-emerald-500",
      text: "text-emerald-700 dark:text-emerald-300",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-900",
    },
    oranje: {
      bar: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-300",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-900",
    },
    rood: {
      bar: "bg-rose-500",
      text: "text-rose-700 dark:text-rose-300",
      bg: "bg-rose-50 dark:bg-rose-950/30",
      border: "border-rose-200 dark:border-rose-900",
    },
  };
  return map[level];
}

function SourceChip({ source }: { source: Source }) {
  const Icon: LucideIcon = source.type === "meeting" ? Calendar : Mail;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground">
      <Icon className="h-2.5 w-2.5" />
      {source.label}
    </span>
  );
}

function SectionRow({ section }: { section: DocSection }) {
  const level = rijpheidLevel(section.rijpheid);
  const colors = rijpheidColors(level);

  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 border-b border-border/50 py-4 last:border-0">
      {/* Left: title + rijpheid */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">{section.title}</h4>
          {section.changedSince && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Sparkles className="h-2.5 w-2.5" />
              NIEUW
            </span>
          )}
        </div>
        <div>
          <div className={`text-xs font-bold ${colors.text}`}>{section.rijpheid}%</div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full ${colors.bar} transition-all`}
              style={{ width: `${section.rijpheid}%` }}
            />
          </div>
        </div>
      </div>

      {/* Right: content + meta */}
      <div className="space-y-2">
        {section.content ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
            {section.content}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground">Nog geen informatie verzameld.</p>
        )}

        {section.openQuestion && (
          <div className="flex gap-2 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 dark:border-rose-900 dark:bg-rose-950/30">
            <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
            <div className="text-xs leading-relaxed">
              <span className="font-semibold text-rose-700 dark:text-rose-300">Open vraag: </span>
              <span className="text-foreground/90">{section.openQuestion}</span>
              <button className="ml-1 text-[10px] font-medium text-rose-700 underline dark:text-rose-300">
                → vragenlijst
              </button>
            </div>
          </div>
        )}

        {section.assumptions.map((a) => (
          <div
            key={a}
            className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 dark:border-amber-900 dark:bg-amber-950/30"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-xs leading-relaxed">
              <span className="font-semibold text-amber-700 dark:text-amber-300">Aanname: </span>
              <span className="text-foreground/90">{a}</span>
              <button className="ml-1 text-[10px] font-medium text-amber-700 underline dark:text-amber-300">
                → bevestig bij klant
              </button>
            </div>
          </div>
        ))}

        {section.sources.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Link2 className="h-3 w-3 text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              {section.sources.map((s) => (
                <SourceChip key={s.label} source={s} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function LivingDocumentMockup() {
  const overall = rijpheidLevel(fakeProject.overallRijpheid);
  const overallColors = rijpheidColors(overall);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Mockup — fake project
              </span>
            </div>
            <h3 className="text-lg font-semibold">{fakeProject.name}</h3>
            <p className="text-sm text-muted-foreground">
              {fakeProject.client} · Fase: {fakeProject.phase}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border bg-background px-3 py-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Bronnen
              </div>
              <div className="text-xs font-semibold">
                {fakeProject.meetingsCount} meetings · {fakeProject.emailsCount} emails
              </div>
            </div>
            <div className="rounded-lg border bg-background px-3 py-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Laatst bijgewerkt
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold">
                <Clock className="h-3 w-3" />
                {fakeProject.lastUpdated}
              </div>
            </div>
            <div
              className={`rounded-lg border-2 ${overallColors.border} ${overallColors.bg} px-3 py-1.5`}
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Rijpheid
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${overallColors.text}`}>
                <TrendingUp className="h-3 w-3" />
                {fakeProject.overallRijpheid}%
              </div>
            </div>
          </div>
        </div>

        {fakeProject.recentChanges > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-900 dark:bg-blue-950/30">
            <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs text-foreground/90">
              <strong className="text-blue-700 dark:text-blue-300">
                {fakeProject.recentChanges} secties gewijzigd
              </strong>{" "}
              sinds Discovery-call van 22 apr
            </span>
            <button className="ml-auto text-[11px] font-medium text-blue-700 underline dark:text-blue-300">
              Bekijk diff →
            </button>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y px-6">
          {sections.map((s) => (
            <SectionRow key={s.id} section={s} />
          ))}
        </div>

        {/* Footer met acties */}
        <div className="flex flex-wrap gap-2 border-t bg-muted/30 p-4 text-xs">
          <span className="text-muted-foreground">Acties uit dit document:</span>
          <span className="rounded-full border bg-background px-2.5 py-1 font-medium">
            📨 Genereer recap-email (klant)
          </span>
          <span className="rounded-full border bg-background px-2.5 py-1 font-medium">
            📋 Genereer vragenlijst (2 open vragen)
          </span>
          <span className="rounded-full border bg-background px-2.5 py-1 font-medium">
            ⚠ Bevestig 4 aannames bij klant
          </span>
          <span className="rounded-full border bg-background px-2.5 py-1 font-medium opacity-50">
            📄 Genereer PRD (vereist ≥ 75%)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
