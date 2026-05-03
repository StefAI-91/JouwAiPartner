import {
  Search,
  MessageSquare,
  FileText,
  Rocket,
  Hammer,
  Eye,
  PartyPopper,
  HeartPulse,
  Repeat,
  type LucideIcon,
} from "lucide-react";

export type PhaseStatus = "live" | "deels" | "gepland";

export interface Phase {
  id: string;
  number: number;
  name: string;
  shortName: string;
  icon: LucideIcon;
  color: "amber" | "orange" | "violet" | "blue" | "indigo" | "sky" | "emerald" | "teal" | "rose";
  pmRole: string;
  trigger: string;
  aiPrepares: string[];
  deliverable: {
    title: string;
    description: string;
  };
  uiLocation: string;
  status: PhaseStatus;
  statusNote: string;
}

export const phases: Phase[] = [
  {
    id: "lead",
    number: 1,
    name: "Lead",
    shortName: "Lead",
    icon: Search,
    color: "amber",
    pmRole: "Spotter — wie is dit, en is dit interessant?",
    trigger:
      "Nieuwe organisatie zonder project, of eerste meeting/email met party_type = prospect.",
    aiPrepares: [
      "Bedrijfssamenvatting + sleutelpersonen uit publieke bronnen",
      "Eerste classificatie: warm, koud, fit met ons aanbod",
      "Voorgestelde openingsvraag voor de eerste call",
    ],
    deliverable: {
      title: "Lead-briefing",
      description:
        "Eén pagina vóór het eerste contact: wie zit aan tafel, wat zoekt-ie, wat is onze hoek.",
    },
    uiLocation: "directory/[org] → tab Lead-briefing",
    status: "gepland",
    statusNote: "Directory toont orgs, maar geen lead-briefing en geen fase-tag.",
  },
  {
    id: "discovery",
    number: 2,
    name: "Discovery",
    shortName: "Discovery",
    icon: MessageSquare,
    color: "orange",
    pmRole: "Onderzoeker — wat is het echte probleem?",
    trigger:
      "Eerste oriënterende meeting geclassificeerd als sales/discovery. Geen voorstel verstuurd.",
    aiPrepares: [
      "Pijnpunten + budget-signalen + decision makers uit transcripten",
      "Open vragen die nog niet zijn beantwoord",
      "Kwalificatie-checklist (BANT-achtig, lichtgewicht)",
    ],
    deliverable: {
      title: "Discovery-rapport",
      description: "Wat we weten, wat we missen, en de scherpe vragen voor de volgende call.",
    },
    uiLocation: "projects/[id]?phase=discovery (nieuw) of directory voor leads",
    status: "deels",
    statusNote: "Extracties komen al binnen, maar er is geen discovery-rollup per relatie.",
  },
  {
    id: "sales",
    number: 3,
    name: "Sales / Voorstel",
    shortName: "Voorstel",
    icon: FileText,
    color: "violet",
    pmRole: "Verkoper — kunnen we dit oplossen, en voor welke prijs?",
    trigger: "Discovery afgerond met interesse-signaal of expliciete vraag om voorstel.",
    aiPrepares: [
      "Scope-conceptdocument op basis van extracties uit alle gesprekken",
      "Prijsonderbouwing + risico's en aannames",
      "Reminder-cadans als het stil blijft na verzending",
    ],
    deliverable: {
      title: "Voorstel-draft",
      description: "PM reviewt en verstuurt — geen voorstel meer vanuit lege Word-pagina.",
    },
    uiLocation: "projects/[id]?phase=sales",
    status: "gepland",
    statusNote: "Voorstel-generator bestaat nog niet.",
  },
  {
    id: "kickoff",
    number: 4,
    name: "Kickoff",
    shortName: "Kickoff",
    icon: Rocket,
    color: "blue",
    pmRole: "Aanjager — iedereen op één lijn vanaf dag één.",
    trigger: "Voorstel getekend of expliciet akkoord in email/meeting gedetecteerd.",
    aiPrepares: [
      "Kickoff-checklist (toegangen, stakeholders, communicatiekanalen)",
      "Agenda voor de kickoff-call",
      "Intake-vragenlijst voor de klant",
    ],
    deliverable: {
      title: "Kickoff-pack",
      description: "Agenda + intake-formulier + bevestiging van scope, klaar om te delen.",
    },
    uiLocation: "projects/[id]?phase=kickoff",
    status: "gepland",
    statusNote: "Project wordt aangemaakt, maar zonder gegenereerde kickoff-deliverables.",
  },
  {
    id: "build",
    number: 5,
    name: "Build / Delivery",
    shortName: "Build",
    icon: Hammer,
    color: "indigo",
    pmRole: "Voortgangsbewaker — bouwen we het juiste, en in tempo?",
    trigger: "Kickoff afgerond + eerste DevHub-issues aangemaakt. Doorlopende fase.",
    aiPrepares: [
      "Wekelijkse statussamenvatting per project (groen/oranje/rood)",
      "Risico-detectie en stilte-alerts (geen contact in X dagen)",
      "Demo-momenten plannen op basis van afgeronde mijlpalen",
    ],
    deliverable: {
      title: "Wekelijkse klantupdate",
      description:
        "Draft die de portal vult — gebaseerd op echte DevHub-progress, niet op herinnering.",
    },
    uiLocation: "projects/[id]?phase=build + weekly",
    status: "deels",
    statusNote:
      "Weekly summary per project bestaat, maar wordt nog niet als klantupdate-draft gerouteerd.",
  },
  {
    id: "review",
    number: 6,
    name: "Review / Demo",
    shortName: "Review",
    icon: Eye,
    color: "sky",
    pmRole: "Reflecteerder — werkt wat we maken, en wat moet anders?",
    trigger: "Demo-datum nadert of mijlpaal voltooid in DevHub.",
    aiPrepares: [
      "Demo-script gebaseerd op afgeronde issues",
      "Openstaande feedback uit portal en widget",
      "Risico-flags die expliciet besproken moeten worden",
    ],
    deliverable: {
      title: "Demo-deck + changelog",
      description: "Wat is er gebouwd, wat niet, en welke beslissingen liggen voor.",
    },
    uiLocation: "projects/[id]?phase=review",
    status: "gepland",
    statusNote: "Geen geautomatiseerde demo-voorbereiding.",
  },
  {
    id: "launch",
    number: 7,
    name: "Go-live / Oplever",
    shortName: "Launch",
    icon: PartyPopper,
    color: "emerald",
    pmRole: "Overdrager — schoon opleveren, geen losse eindjes.",
    trigger: "Project-status verandert naar ready, of laatste mijlpaal afgevinkt.",
    aiPrepares: [
      "Oplever-document op basis van alle afgeronde scope",
      "Trainings- en handover-checklist",
      "SLA- en support-afspraken voor beheer-fase",
    ],
    deliverable: {
      title: "Oplever-rapport + nazorg-plan",
      description: "De klant weet wat-ie krijgt, wij weten wat we beloven.",
    },
    uiLocation: "projects/[id]?phase=launch",
    status: "gepland",
    statusNote: "Geen oplever-template, geen go-live-checklist.",
  },
  {
    id: "care",
    number: 8,
    name: "Beheer / Doorontwikkeling",
    shortName: "Beheer",
    icon: HeartPulse,
    color: "teal",
    pmRole: "Bewaker — blijft dit gezond, en groeit het mee?",
    trigger: "Go-live > 2 weken geleden. Widget-feedback en supportvragen komen binnen.",
    aiPrepares: [
      "Maandelijks gezondheidsrapport per klant (gebruik, feedback-trend)",
      "Upsell-signalen uit meetings en feedback",
      "Drift-alerts: stilte van klant, terugloop in gebruik",
    ],
    deliverable: {
      title: "Maandelijkse health-check + klant-update",
      description: "Intern signaal én een klantvriendelijke maandupdate richting portal.",
    },
    uiLocation: "projects/[id]?phase=care + intelligence",
    status: "gepland",
    statusNote: "Widget-feedback en Userback komen binnen, maar er is geen per-klant maandritme.",
  },
  {
    id: "renewal",
    number: 9,
    name: "Renewal / Expansion",
    shortName: "Renewal",
    icon: Repeat,
    color: "rose",
    pmRole: "Vernieuwer — verlengen, uitbreiden, of mooi afsluiten.",
    trigger: "Contract-einde nadert OF Needs Scanner detecteert nieuwe vraag bij bestaande klant.",
    aiPrepares: [
      "Verlengingsvoorstel met gebruiks-onderbouwing",
      "Upsell-pitch op basis van gedetecteerde nieuwe needs",
      "Cijfers voor de gesprekstafel (uptime, geleverde waarde)",
    ],
    deliverable: {
      title: "Renewal-voorstel of upsell-pitch",
      description: "Terug naar fase 3 — maar dan met de hele historie als context.",
    },
    uiLocation: "projects/[id]?phase=renewal",
    status: "gepland",
    statusNote: "Volledig nieuw — geen renewal-flow vandaag.",
  },
];

export const colorClasses: Record<
  Phase["color"],
  {
    bg: string;
    bgSoft: string;
    text: string;
    border: string;
    ring: string;
  }
> = {
  amber: {
    bg: "bg-amber-500",
    bgSoft: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-900",
    ring: "ring-amber-500/20",
  },
  orange: {
    bg: "bg-orange-500",
    bgSoft: "bg-orange-50 dark:bg-orange-950/30",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-900",
    ring: "ring-orange-500/20",
  },
  violet: {
    bg: "bg-violet-500",
    bgSoft: "bg-violet-50 dark:bg-violet-950/30",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-200 dark:border-violet-900",
    ring: "ring-violet-500/20",
  },
  blue: {
    bg: "bg-blue-500",
    bgSoft: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-900",
    ring: "ring-blue-500/20",
  },
  indigo: {
    bg: "bg-indigo-500",
    bgSoft: "bg-indigo-50 dark:bg-indigo-950/30",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-900",
    ring: "ring-indigo-500/20",
  },
  sky: {
    bg: "bg-sky-500",
    bgSoft: "bg-sky-50 dark:bg-sky-950/30",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-900",
    ring: "ring-sky-500/20",
  },
  emerald: {
    bg: "bg-emerald-500",
    bgSoft: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-900",
    ring: "ring-emerald-500/20",
  },
  teal: {
    bg: "bg-teal-500",
    bgSoft: "bg-teal-50 dark:bg-teal-950/30",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-900",
    ring: "ring-teal-500/20",
  },
  rose: {
    bg: "bg-rose-500",
    bgSoft: "bg-rose-50 dark:bg-rose-950/30",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-900",
    ring: "ring-rose-500/20",
  },
};

export const statusLabel: Record<PhaseStatus, string> = {
  live: "Werkt al",
  deels: "Deels aanwezig",
  gepland: "Nog te bouwen",
};

export const statusBadgeClass: Record<PhaseStatus, string> = {
  live: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  deels: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  gepland: "bg-muted text-muted-foreground",
};
