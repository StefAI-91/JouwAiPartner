export type InboxBucket = "klant" | "intern";

/**
 * AI-actionable: AI kan zelf een concept maken (mail, ping, overzicht).
 * Reminder: vraagt menselijke aandacht — AI kan alleen herinneren,
 * niet voorzetten (creatief, strategisch, contextueel werk).
 */
export type InboxKind = "ai-actionable" | "reminder";

export interface InboxItem {
  id: string;
  bucket: InboxBucket;
  kind: InboxKind;
  /** Korte AI-aanhef, conversationeel. */
  greeting: string;
  /** Hoofdtekst — voor actionable: wat AI gaat doen. Voor reminder: wat jij moet bedenken. */
  body: string;
  /** Context-tag: project, klant, of meeting waar dit uit komt. */
  context: string;
  /** Hoe lang het al openstaat / sinds wanneer relevant. */
  age: string;
  /** Voor actionable items: de primary CTA. Reminders hebben er geen. */
  primaryAction?: {
    label: string;
    kind: "draft-mail" | "send-ping" | "remind" | "summarise";
  };
  /** Optioneel: preview van wat AI zou versturen. */
  preview?: string;
}

export const MOCK_INBOX: InboxItem[] = [
  // --- Klant ---
  {
    id: "i1",
    bucket: "klant",
    kind: "ai-actionable",
    greeting: "Hey Stef,",
    body: "Klant Acme Corp heeft 12 dagen geleden gevraagd of de export-feature in deze sprint zat. Geen reactie van ons. Zal ik een check-in mail draften met de huidige status?",
    context: "Project · Acme Knowledge Hub",
    age: "12 dagen open",
    primaryAction: { label: "Draft mail", kind: "draft-mail" },
    preview:
      "Onderwerp: Update export-feature\n\nHi Marleen,\n\nJe vroeg 12 dagen geleden of de export-feature deze sprint live zou gaan. Stand van zaken: ticket #47 is af, we testen vandaag, release morgen...",
  },
  {
    id: "i2",
    bucket: "klant",
    kind: "ai-actionable",
    greeting: "Hey Stef,",
    body: "Peter (Klant Vendora) heeft de vragenlijst nog niet ingevuld die hij vorige week zou doen. Zal ik 'm een vriendelijke check-in sturen?",
    context: "Project · Vendora intake",
    age: "8 dagen wachtend",
    primaryAction: { label: "Draft mail", kind: "draft-mail" },
    preview:
      "Onderwerp: Vragenlijst Vendora\n\nHoi Peter,\n\nIs het nog gelukt met de vragenlijst? Ik zie je antwoorden graag verschijnen — als je vastloopt op een vraag laat het me weten, dan denken we mee.\n\nGroet,\nStef",
  },
  {
    id: "i3",
    bucket: "klant",
    kind: "reminder",
    greeting: "Hey Stef,",
    body: "Het design schema voor BrandLab moet vóór vrijdag rond. Hier kan ik geen voorzet voor maken — dit vraagt jouw beslissing op kleuren, typografie en componenten. Wil je dat ik je vrijdagochtend hier opnieuw aan herinner?",
    context: "Project · BrandLab kickoff",
    age: "deadline vrijdag",
    // Geen primaryAction — reminder type
  },
  {
    id: "i4",
    bucket: "klant",
    kind: "ai-actionable",
    greeting: "Hey Stef,",
    body: "Klant DenkTank heeft 3 weken niets van ons gehoord. Project loopt nog, maar er is geen meeting gepland. Tijd voor een status-update?",
    context: "Project · DenkTank Portal",
    age: "21 dagen stilte",
    primaryAction: { label: "Draft status-update", kind: "draft-mail" },
  },

  // --- Intern ---
  {
    id: "i5",
    bucket: "intern",
    kind: "ai-actionable",
    greeting: "Hey Stef,",
    body: "Denk je nog aan dat exportlijst-ding van Wouter? Hij vroeg dit 5 dagen geleden, geen update. Zal ik 'm een ping geven?",
    context: "Meeting · Sprint review 24/4",
    age: "5 dagen open",
    primaryAction: { label: "Ping Wouter", kind: "send-ping" },
  },
  {
    id: "i6",
    bucket: "intern",
    kind: "reminder",
    greeting: "Hey Stef,",
    body: "Sprint planning voor week 19 staat nog open. Hier kan ik niet zelf prioriteren — jij kent de strategische context. Wil je hier vandaag tijd voor blokkeren?",
    context: "Cockpit · Sprint week 19",
    age: "planning open",
  },
  {
    id: "i7",
    bucket: "intern",
    kind: "ai-actionable",
    greeting: "Hey Stef,",
    body: "Er staan 4 meetings in de review-queue die nog op verificatie wachten. De oudste is van 12 dagen geleden. Wil je dat ik een kort overzicht voor je maak?",
    context: "Cockpit · Review queue",
    age: "12 dagen oudste",
    primaryAction: { label: "Maak overzicht", kind: "summarise" },
  },
];

export function countByBucket(items: InboxItem[]): Record<InboxBucket, number> {
  return items.reduce(
    (acc, i) => {
      acc[i.bucket]++;
      return acc;
    },
    { klant: 0, intern: 0 } as Record<InboxBucket, number>,
  );
}
