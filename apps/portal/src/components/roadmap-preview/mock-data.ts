/**
 * Mock data voor de design-preview van de portal-roadmap.
 *
 * Deze data is hardcoded en heeft geen DB-verbinding. CAI Studio is de
 * fictieve referentie-klant uit de PRD. Datums en topics zijn gekozen
 * om realistisch te lijken voor een actief project rond eind april 2026.
 */

export type TopicType = "bug" | "feature";
export type TopicPriority = "P0" | "P1" | "P2" | "P3" | null;
export type ClientSignal = "must_have" | "nice_to_have" | "not_relevant" | null;

export type BucketKey = "recent_fixed" | "coming_week" | "high_prio_after" | "unprioritized";

export type Topic = {
  id: string;
  title: string;
  clientDescription: string;
  type: TopicType;
  priority: TopicPriority;
  linkedIssuesCount: number;
  sprintLabel: string | null;
  updatedDaysAgo: number;
  closedDaysAgo: number | null;
  bucket: BucketKey;
  clientSignal: ClientSignal;
  signalGivenDaysAgo: number | null;
  requestedAt: string;
};

export type RejectedTopic = {
  id: string;
  title: string;
  reason: string;
  closedAt: string;
};

export type AuditEntry = {
  date: string;
  text: string;
};

export type Pattern = {
  title: string;
  description: string;
};

export type Report = {
  id: string;
  title: string;
  compiledAt: string;
  compiledByName: string;
  compiledByInitials: string;
};

// ─── Roadmap topics ──────────────────────────────────────────────────────────

export const TOPICS: Topic[] = [
  // Recent gefixt (status = done, closed_at <= 14d)
  {
    id: "t-001",
    title: "Witte schermen na publicatie",
    clientDescription:
      "Studio's bleven leeg laden na publish. We hebben de fout in de cache-laag teruggedraaid en monitoring toegevoegd zodat we het sneller zien als het terugkomt.",
    type: "bug",
    priority: "P0",
    linkedIssuesCount: 4,
    sprintLabel: null,
    updatedDaysAgo: 3,
    closedDaysAgo: 3,
    bucket: "recent_fixed",
    clientSignal: null,
    signalGivenDaysAgo: null,
    requestedAt: "2 april 2026",
  },
  {
    id: "t-002",
    title: "Co-Founder-pagina laadtijd",
    clientDescription:
      "De Co-Founder-pagina was traag bij het openen van een studio met meer dan 12 deelnemers. Verlaagd van ~6s naar onder de 1s.",
    type: "feature",
    priority: "P1",
    linkedIssuesCount: 2,
    sprintLabel: null,
    updatedDaysAgo: 6,
    closedDaysAgo: 6,
    bucket: "recent_fixed",
    clientSignal: null,
    signalGivenDaysAgo: null,
    requestedAt: "20 maart 2026",
  },
  {
    id: "t-003",
    title: "Inlog-stabiliteit op mobiel",
    clientDescription:
      "Inloggen vanaf mobiele Safari brak soms vast op de OTP-stap. Code is hersteld; getest op iOS 17 en 18.",
    type: "bug",
    priority: "P1",
    linkedIssuesCount: 3,
    sprintLabel: null,
    updatedDaysAgo: 9,
    closedDaysAgo: 9,
    bucket: "recent_fixed",
    clientSignal: null,
    signalGivenDaysAgo: null,
    requestedAt: "12 maart 2026",
  },
  {
    id: "t-004",
    title: "Foutmelding bij ontbrekende cover",
    clientDescription:
      "Als een studio gepubliceerd werd zonder cover, kreeg de bezoeker een onduidelijke 500-fout. Nu een nette uitleg + edit-link.",
    type: "bug",
    priority: "P2",
    linkedIssuesCount: 1,
    sprintLabel: null,
    updatedDaysAgo: 11,
    closedDaysAgo: 11,
    bucket: "recent_fixed",
    clientSignal: null,
    signalGivenDaysAgo: null,
    requestedAt: "1 maart 2026",
  },

  // Komende week (status in (in_progress, scheduled), in current/next sprint)
  {
    id: "t-005",
    title: "Publicatie-flow eindstap",
    clientDescription:
      "De laatste stap van publiceren slaat soms ongemerkt over en gebruikers zien hun studio niet live. We schrijven de hele flow opnieuw als één enkele transactie zodat dit niet meer kan.",
    type: "bug",
    priority: "P0",
    linkedIssuesCount: 5,
    sprintLabel: "Sprint 24",
    updatedDaysAgo: 1,
    closedDaysAgo: null,
    bucket: "coming_week",
    clientSignal: "must_have",
    signalGivenDaysAgo: 8,
    requestedAt: "16 april 2026",
  },
  {
    id: "t-006",
    title: "Bestandsgroottes en limieten",
    clientDescription:
      "Bestandslimieten (50 MB per upload, 1 GB totaal) waren niet duidelijk vooraf. We tonen het nu als progress + duidelijke melding bij overschrijding.",
    type: "feature",
    priority: "P1",
    linkedIssuesCount: 3,
    sprintLabel: "Sprint 24",
    updatedDaysAgo: 2,
    closedDaysAgo: null,
    bucket: "coming_week",
    clientSignal: "must_have",
    signalGivenDaysAgo: 12,
    requestedAt: "20 maart 2026",
  },
  {
    id: "t-007",
    title: "Landingspagina mobiele weergave",
    clientDescription:
      "Headerafbeeldingen werden afgesneden op telefoons en de CTA-knop viel onder de fold. Nieuw responsive grid wordt deze week opgeleverd.",
    type: "feature",
    priority: "P1",
    linkedIssuesCount: 2,
    sprintLabel: "Sprint 24",
    updatedDaysAgo: 4,
    closedDaysAgo: null,
    bucket: "coming_week",
    clientSignal: null,
    signalGivenDaysAgo: null,
    requestedAt: "8 april 2026",
  },

  // Hoge prio daarna (status = prioritized)
  {
    id: "t-008",
    title: "Drag-and-drop volgorde studio's",
    clientDescription:
      "Studio's stonden alfabetisch vast. Jullie willen ze handmatig ordenen voor de marketing-pagina. Ingepland direct na sprint 24.",
    type: "feature",
    priority: "P1",
    linkedIssuesCount: 2,
    sprintLabel: null,
    updatedDaysAgo: 5,
    closedDaysAgo: null,
    bucket: "high_prio_after",
    clientSignal: "must_have",
    signalGivenDaysAgo: 10,
    requestedAt: "5 april 2026",
  },
  {
    id: "t-009",
    title: "Bulk-export deelnemers",
    clientDescription:
      "Eén CSV met alle deelnemers per studio voor de jaarafsluiting. Niet hoogdringend voor publicatie, wel voor administratie.",
    type: "feature",
    priority: "P2",
    linkedIssuesCount: 1,
    sprintLabel: null,
    updatedDaysAgo: 8,
    closedDaysAgo: null,
    bucket: "high_prio_after",
    clientSignal: null,
    signalGivenDaysAgo: null,
    requestedAt: "30 maart 2026",
  },
  {
    id: "t-010",
    title: "Notificaties bij nieuw bericht",
    clientDescription:
      "Studio-eigenaren willen e-mail krijgen bij een nieuw deelnemer-bericht. Komt na de publicatie-flow stabiel is.",
    type: "feature",
    priority: "P2",
    linkedIssuesCount: 4,
    sprintLabel: null,
    updatedDaysAgo: 11,
    closedDaysAgo: null,
    bucket: "high_prio_after",
    clientSignal: null,
    signalGivenDaysAgo: null,
    requestedAt: "25 maart 2026",
  },

  // Niet geprioritiseerd (awaiting_client_input)
  {
    id: "t-011",
    title: "Donkere modus voor het studio-overzicht",
    clientDescription:
      "Twee deelnemers vroegen om dark mode. We willen weten of dit voor jullie hoofdgebruikers ook waardevol is voordat we het inplannen.",
    type: "feature",
    priority: null,
    linkedIssuesCount: 1,
    sprintLabel: null,
    updatedDaysAgo: 6,
    closedDaysAgo: null,
    bucket: "unprioritized",
    clientSignal: null,
    signalGivenDaysAgo: null,
    requestedAt: "15 april 2026",
  },
  {
    id: "t-012",
    title: "Eigen domeinnaam per studio",
    clientDescription:
      "In plaats van /studio/naam een eigen subdomein. Technisch fors werk, alleen waardevol als jullie het echt willen aanbieden.",
    type: "feature",
    priority: null,
    linkedIssuesCount: 2,
    sprintLabel: null,
    updatedDaysAgo: 14,
    closedDaysAgo: null,
    bucket: "unprioritized",
    clientSignal: null,
    signalGivenDaysAgo: null,
    requestedAt: "1 april 2026",
  },
  {
    id: "t-013",
    title: "Statistieken-pagina voor studio-eigenaren",
    clientDescription:
      "Bezoekersaantallen per studio, top-pagina's, verwijzingsbronnen. Concept staat; we wachten op signaal of dit prioriteit heeft.",
    type: "feature",
    priority: null,
    linkedIssuesCount: 2,
    sprintLabel: null,
    updatedDaysAgo: 17,
    closedDaysAgo: null,
    bucket: "unprioritized",
    clientSignal: null,
    signalGivenDaysAgo: null,
    requestedAt: "28 maart 2026",
  },
  {
    id: "t-014",
    title: "Integratie met Mailchimp",
    clientDescription:
      "Deelnemers automatisch toevoegen aan een Mailchimp-lijst. Geen technisch obstakel, maar buiten de scope van de huidige sprint-cyclus.",
    type: "feature",
    priority: null,
    linkedIssuesCount: 1,
    sprintLabel: null,
    updatedDaysAgo: 21,
    closedDaysAgo: null,
    bucket: "unprioritized",
    clientSignal: null,
    signalGivenDaysAgo: null,
    requestedAt: "20 maart 2026",
  },
];

// ─── Bucket configuratie ─────────────────────────────────────────────────────

export const BUCKETS: Array<{
  key: BucketKey;
  label: string;
  blurb: string;
  count: number;
  cssVarPrefix: "fixed" | "soon" | "priority" | "unprio";
}> = [
  {
    key: "recent_fixed",
    label: "Recent gefixt",
    blurb: "Opgeleverd in de afgelopen veertien dagen",
    count: TOPICS.filter((t) => t.bucket === "recent_fixed").length,
    cssVarPrefix: "fixed",
  },
  {
    key: "coming_week",
    label: "Komende week",
    blurb: "Wat in de huidige of eerstvolgende sprint zit",
    count: TOPICS.filter((t) => t.bucket === "coming_week").length,
    cssVarPrefix: "soon",
  },
  {
    key: "high_prio_after",
    label: "Hoge prio daarna",
    blurb: "Geprioriteerd, nog geen sprint toegewezen",
    count: TOPICS.filter((t) => t.bucket === "high_prio_after").length,
    cssVarPrefix: "priority",
  },
  {
    key: "unprioritized",
    label: "Niet geprioritiseerd",
    blurb: "Wachtend op jullie signaal",
    count: TOPICS.filter((t) => t.bucket === "unprioritized").length,
    cssVarPrefix: "unprio",
  },
];

// ─── Wont_do (afgewezen wensen) ──────────────────────────────────────────────

export const REJECTED_TOPICS: RejectedTopic[] = [
  {
    id: "r-001",
    title: "Native iOS-app",
    reason:
      "Buiten scope van het huidige contract. Web blijft leidend; native app pas relevant na 1 000+ actieve studio's.",
    closedAt: "12 april 2026",
  },
  {
    id: "r-002",
    title: "Geïntegreerde betaalmodule",
    reason:
      "Vervangen door koppeling met Stripe Checkout — zie topic 'Stripe-integratie' (gemerged).",
    closedAt: "8 april 2026",
  },
  {
    id: "r-003",
    title: "Aangepaste lettertypen per studio",
    reason:
      "Technisch haalbaar maar haalt de visuele consistentie van het platform onderuit. We onderzoeken in plaats daarvan een vaste keuze uit drie type-bibliotheken.",
    closedAt: "2 april 2026",
  },
  {
    id: "r-004",
    title: "AI-gegenereerde studio-omschrijvingen",
    reason:
      "Jullie hebben aangegeven dat dit niet past bij de redactionele toon. Markeren als 👎 niet relevant.",
    closedAt: "26 maart 2026",
  },
];

// ─── Audit-timeline (klant-versie, t-005) ────────────────────────────────────

export const AUDIT_TIMELINE: AuditEntry[] = [
  { date: "14 april", text: "Opgepakt op basis van vier meldingen" },
  { date: "16 april", text: "Door jullie gemarkeerd als must-have" },
  { date: "18 april", text: "Ingepland voor sprint 24" },
  { date: "22 april", text: "Werk gestart" },
  { date: "Vandaag", text: "Drie van de vijf gekoppelde issues afgerond" },
];

// ─── Reports ─────────────────────────────────────────────────────────────────

export const REPORTS: Report[] = [
  {
    id: "rep-2026-04-23",
    title: "Wekelijks rapport — week 17",
    compiledAt: "23 april 2026",
    compiledByName: "Stef Banninga",
    compiledByInitials: "SB",
  },
  {
    id: "rep-2026-04-16",
    title: "Wekelijks rapport — week 16",
    compiledAt: "16 april 2026",
    compiledByName: "Wouter de Jong",
    compiledByInitials: "WJ",
  },
  {
    id: "rep-2026-04-09",
    title: "Wekelijks rapport — week 15",
    compiledAt: "9 april 2026",
    compiledByName: "Stef Banninga",
    compiledByInitials: "SB",
  },
  {
    id: "rep-2026-04-02",
    title: "Wekelijks rapport — week 14",
    compiledAt: "2 april 2026",
    compiledByName: "Wouter de Jong",
    compiledByInitials: "WJ",
  },
];

// ─── Active report (rep-2026-04-23) ──────────────────────────────────────────

export const ACTIVE_REPORT_NARRATIVE = `Drie van de vijf topics deze sprint raken aan de publicatie-flow. Dat is geen toeval. We hebben in week 14 en 15 losse symptomen aangepakt — een witte schermen-bug, een trage Co-Founder-pagina, een onduidelijke uploadfout — maar het patroon eronder bleef onaangeraakt: de publicatie-stap doet te veel dingen in één synchrone keten, en als één stap haperen onbreekt de hele kaart.

Deze week schrijven we die keten als één transactie opnieuw. Dat is groter werk dan een patch, maar kleiner dan jullie ervaring de afgelopen weken suggereert. Het verklaart waarom 'opgelost' soms tijdelijk voelt: een fix in stap drie hielp niet als stap zes vervolgens stilletjes faalde.

Wat we van jullie nodig hebben deze week: een snelle blik op de twee 'Niet geprioritiseerd'-topics die er al een tijdje staan — eigen domeinnaam en de statistieken-pagina. Een 🔥, 👍 of 👎 helpt ons keuzes maken voor sprint 25. Geen reactie is ook een antwoord; dan parkeren we ze.`;

export const ACTIVE_REPORT_PATTERNS: Pattern[] = [
  {
    title: "Publicatie-flow blijft regressies vertonen",
    description:
      "Drie incidenten in zes weken raken aan dezelfde keten. Aanpak verschuift deze week van symptoom-fix naar architectuur-fix.",
  },
  {
    title: "Limieten en grenzen onduidelijk vooraf",
    description:
      "Bestandsgroottes, deelnemer-limiet, beschrijvingslengte — gebruikers ontdekken dit pas tijdens uploaden. We voegen progressieve duidelijkheid toe op uploadmomenten.",
  },
  {
    title: "Mobiele weergave loopt achter op desktop",
    description:
      "Twee van de vier afgesloten topics de afgelopen weken waren mobile-first regressies. We voegen mobile-checks toe aan ons sprint-protocol.",
  },
];

// Topic mapping for report content (linked by ID)
export const ACTIVE_REPORT_TOPICS = {
  recent_fixed: ["t-001", "t-002", "t-003", "t-004"],
  coming_week: ["t-005", "t-006", "t-007"],
  high_prio_after: ["t-008", "t-009", "t-010"],
  unprioritized: ["t-011", "t-012", "t-013", "t-014"],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getTopicById(id: string): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}

export function getTopicsByBucket(bucket: BucketKey): Topic[] {
  return TOPICS.filter((t) => t.bucket === bucket);
}

export const SECTIONS = [
  {
    id: "intro",
    marker: "§ 00",
    title: "Inleiding",
    fase: null,
    summary: "Wat dit document is en hoe je het leest",
  },
  {
    id: "roadmap",
    marker: "§ 01",
    title: "Roadmap-overzicht",
    fase: "Fase 1",
    summary: "Vier buckets, één blik. Klant ziet wat speelt.",
  },
  {
    id: "topic-detail",
    marker: "§ 02",
    title: "Topic-detail",
    fase: "Fase 1",
    summary: "Eén topic uitgelicht, read-only.",
  },
  {
    id: "signals",
    marker: "§ 03",
    title: "Klant-signalen",
    fase: "Fase 2",
    summary: "Drie staten van de signaal-knoppen, plus de uitleg-tooltip.",
  },
  {
    id: "signal-elsewhere",
    marker: "§ 04",
    title: "Signaal blijft zichtbaar",
    fase: "Fase 2",
    summary: "Hoe een eerder gegeven signaal in andere buckets meeleeft.",
  },
  {
    id: "rejected",
    marker: "§ 05",
    title: "Bekijk afgewezen wensen",
    fase: "Fase 3",
    summary: "wont_do met expliciete reden — niemand verdwijnt in een zwart gat.",
  },
  {
    id: "audit",
    marker: "§ 06",
    title: "Audit-timeline",
    fase: "Fase 3",
    summary: "Vereenvoudigde geschiedenis, klanttaal.",
  },
  {
    id: "reports-archive",
    marker: "§ 07",
    title: "Rapporten-archief",
    fase: "Fase 4",
    summary: "Lijst van bevroren wekelijkse rapporten.",
  },
  {
    id: "report-detail",
    marker: "§ 08",
    title: "Rapport-detail",
    fase: "Fase 4",
    summary: "Het hart van de Portal — een doordacht document, geen dashboard.",
  },
];
