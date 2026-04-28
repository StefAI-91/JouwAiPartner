export type InboxBucket = "klant" | "intern";

/**
 * Klant-items: AI heeft altijd een follow-up mail concept.
 * Intern-items: AI is een reminder — jij pakt het op, AI herinnert je.
 *
 * Daarom is `kind` niet nodig: bucket bepaalt het gedrag.
 */
export interface InboxItem {
  id: string;
  bucket: InboxBucket;
  greeting: string;
  body: string;
  /** Context-tag: project, klant, of meeting waar dit uit komt. */
  context: string;
  /** Hoe lang het al openstaat / sinds wanneer relevant. */
  age: string;
  /** Alleen voor klant-items: tekst voor de primary CTA (bv. "Draft check-in"). */
  mailLabel?: string;
  /** Alleen voor klant-items: preview van de geconcipieerde mail. */
  preview?: string;
}

export const MOCK_INBOX: InboxItem[] = [
  // --- Klant: follow-up mails ---
  {
    id: "k1",
    bucket: "klant",
    greeting: "Hey Stef,",
    body: "Peter (Klant Vendora) heeft de vragenlijst nog niet ingevuld die hij vorige week zou doen. Zal ik 'm een vriendelijke check-in sturen?",
    context: "Project · Vendora intake",
    age: "8 dagen wachtend",
    mailLabel: "Draft check-in",
    preview:
      "Onderwerp: Vragenlijst Vendora\n\nHoi Peter,\n\nIs het nog gelukt met de vragenlijst? Ik zie je antwoorden graag verschijnen — als je vastloopt op een vraag laat het me weten, dan denken we mee.\n\nGroet,\nStef",
  },
  {
    id: "k2",
    bucket: "klant",
    greeting: "Hey Stef,",
    body: "Klant Acme Corp heeft 12 dagen geleden gevraagd of de export-feature in deze sprint zat. Geen reactie van ons. Zal ik een check-in mail draften met de huidige status?",
    context: "Project · Acme Knowledge Hub",
    age: "12 dagen open",
    mailLabel: "Draft status-mail",
    preview:
      "Onderwerp: Update export-feature\n\nHi Marleen,\n\nJe vroeg 12 dagen geleden of de export-feature deze sprint live zou gaan. Stand van zaken: ticket #47 is af, we testen vandaag, release morgen...",
  },
  {
    id: "k3",
    bucket: "klant",
    greeting: "Hey Stef,",
    body: "We hebben gisteren met BrandLab een besluit genomen over het kleurpalet, maar dat is nog niet bevestigd richting hen. Zal ik een korte bevestigingsmail sturen zodat het zwart op wit staat?",
    context: "Meeting · BrandLab kickoff",
    age: "1 dag oud besluit",
    mailLabel: "Draft bevestiging",
  },
  {
    id: "k4",
    bucket: "klant",
    greeting: "Hey Stef,",
    body: "Klant DenkTank heeft 3 weken niets van ons gehoord. Project loopt nog, maar er is geen meeting gepland. Tijd voor een status-update?",
    context: "Project · DenkTank Portal",
    age: "21 dagen stilte",
    mailLabel: "Draft status-update",
  },

  // --- Intern: reminders ---
  {
    id: "t1",
    bucket: "intern",
    greeting: "Hey Stef,",
    body: "Het design schema voor BrandLab moet vóór vrijdag rond. Hier kan ik geen voorzet voor maken — dit vraagt jouw beslissing op kleuren, typografie en componenten.",
    context: "Project · BrandLab kickoff",
    age: "deadline vrijdag",
  },
  {
    id: "t2",
    bucket: "intern",
    greeting: "Hey Stef,",
    body: "Sprint planning voor week 19 staat nog open. Hier kan ik niet zelf prioriteren — jij kent de strategische context.",
    context: "Cockpit · Sprint week 19",
    age: "planning open",
  },
  {
    id: "t3",
    bucket: "intern",
    greeting: "Hey Stef,",
    body: "Denk je nog aan dat exportlijst-ding van Wouter? Hij vroeg dit 5 dagen geleden, geen update.",
    context: "Meeting · Sprint review 24/4",
    age: "5 dagen open",
  },
  {
    id: "t4",
    bucket: "intern",
    greeting: "Hey Stef,",
    body: "Er staan 4 meetings in de review-queue die nog op verificatie wachten. De oudste is van 12 dagen geleden.",
    context: "Cockpit · Review queue",
    age: "12 dagen oudste",
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
