export type InboxBucket = "klant" | "intern";

export interface InboxItem {
  id: string;
  bucket: InboxBucket;
  /** Korte AI-aanhef, conversationeel. */
  greeting: string;
  /** Hoofdtekst — wat de AI voorstelt te doen. */
  body: string;
  /** Context-tag: project, klant, of meeting waar dit uit komt. */
  context: string;
  /** Hoe lang het al openstaat / sinds wanneer relevant. */
  age: string;
  /** Wat AI wil doen als de gebruiker akkoord gaat. */
  primaryAction: {
    label: string;
    /** Type bepaalt het icoontje en de toon. */
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
    greeting: "Hey Stef,",
    body: "We hebben gisteren met BrandLab een besluit genomen over het kleurpalet, maar dat is nog niet bevestigd richting hen. Zal ik een korte bevestigingsmail sturen zodat het zwart op wit staat?",
    context: "Meeting · BrandLab kickoff",
    age: "1 dag oud besluit",
    primaryAction: { label: "Draft bevestiging", kind: "draft-mail" },
  },
  {
    id: "i3",
    bucket: "klant",
    greeting: "Hey Stef,",
    body: "Klant DenkTank heeft 3 weken niets van ons gehoord. Project loopt nog, maar er is geen meeting gepland. Tijd voor een status-update?",
    context: "Project · DenkTank Portal",
    age: "21 dagen stilte",
    primaryAction: { label: "Draft status-update", kind: "draft-mail" },
  },

  // --- Intern ---
  {
    id: "i4",
    bucket: "intern",
    greeting: "Hey Stef,",
    body: "Denk je nog aan dat exportlijst-ding van Wouter? Hij vroeg dit 5 dagen geleden, geen update. Zal ik 'm een ping geven of zelf even kijken hoe ver het staat?",
    context: "Meeting · Sprint review 24/4",
    age: "5 dagen open",
    primaryAction: { label: "Ping Wouter", kind: "send-ping" },
  },
  {
    id: "i5",
    bucket: "intern",
    greeting: "Hey Stef,",
    body: "Ege heeft de feedbacklijst voor de AI-model review nog niet aangeleverd. Stond op de planning voor afgelopen vrijdag. Wil je een herinnering sturen?",
    context: "Project · AI Model v2",
    age: "3 dagen over deadline",
    primaryAction: { label: "Stuur herinnering", kind: "send-ping" },
  },
  {
    id: "i6",
    bucket: "intern",
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
