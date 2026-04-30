/**
 * Mock data for the portal preview/dogfood page. Pure presentational —
 * no DB calls, no async work. Lives here so the page itself stays compositional.
 */

export const closedThisWeek = [
  {
    id: "JAP-642",
    title: "Witte schermen na inloggen",
    severity: "Critical",
    symptom:
      "Drie gebruikers konden niet inloggen tussen 14:02 en 16:18 op vrijdag — pagina bleef wit na het invoeren van credentials.",
    cause:
      "Race condition in session-refresh: de Userback-widget initialiseerde vóór de auth-handshake en blokkeerde het token-rewrite-event.",
    fix: "Widget-loader verplaatst naar na auth-handshake; session-refresh wacht nu expliciet op auth-state ‘ready’.",
    since: "do 16:42",
    effect: "0 nieuwe meldingen sinds deploy.",
    closedBy: "Wouter",
  },
  {
    id: "JAP-638",
    title: "Bug-reporter zag eigen ticket niet terug",
    severity: "Hoog",
    symptom:
      "Userback-meldingen kwamen niet terug in de eigen ticketlijst van de melder; alleen team zag ze.",
    cause:
      "Reporter-id werd opgeslagen op de issue maar niet meegenomen in de RLS-policy voor portal-readers.",
    fix: "RLS uitgebreid met reporter-clause; backfill gedraaid op 412 historische tickets.",
    since: "wo 11:08",
    effect: "Alle 412 historische tickets nu zichtbaar.",
    closedBy: "Ege",
  },
  {
    id: "JAP-629",
    title: "CSV-export kapte regels af bij komma",
    severity: "Midden",
    symptom: "Klanten meldden dat exports beschadigd waren bij velden met komma's of newlines.",
    cause: "Geen escaping in de CSV-encoder — naive join zonder quoting.",
    fix: "papaparse als drop-in encoder; tests toegevoegd voor edge cases (komma, quote, newline).",
    since: "ma 09:24",
    effect: "Geen nieuwe meldingen.",
    closedBy: "Stef",
  },
];

export const openRisks = [
  {
    title: "Metadata-prefill bij bugreports nog niet live",
    impact: "Reporter-info ontbreekt op nieuwe meldingen → triage trager.",
    status: "Ingepland week 19",
    tone: "warning" as const,
  },
  {
    title: "E-mail-pipeline draait nog op Cohere v3",
    impact: "Lagere embedding-kwaliteit op recente threads.",
    status: "Backlog · geen ETA",
    tone: "warning" as const,
  },
  {
    title: "Geen automatische backup op staging-DB",
    impact: "Bij corrupte seed verliezen we max 24u test-data.",
    status: "Acceptabel · staging only",
    tone: "info" as const,
  },
];

export const inProgress = [
  {
    id: "JAP-651",
    title: "Tweefactor-login (TOTP)",
    owner: "Wouter",
    since: "3 dagen",
    bucket: "Sprint 18",
  },
  {
    id: "JAP-647",
    title: "Userback v2 widget upgrade",
    owner: "Ege",
    since: "1 dag",
    bucket: "Sprint 18",
  },
  {
    id: "JAP-655",
    title: "CSV-export op de issue-lijst",
    owner: "Wouter",
    since: "5 uur",
    bucket: "Sprint 18",
  },
];

export const waitingOnYou = [
  {
    title: "Tekst voor onboarding-screen aanleveren",
    since: "3 dagen open",
    blocking: "JAP-651 · Tweefactor-login",
  },
  {
    title: "Goedkeuring SLA-voorstel v2",
    since: "1 dag open",
    blocking: "Contract-bijlage week 19",
  },
];

export const roadmapColumns: {
  label: string;
  tone: "success" | "warning" | "muted";
  items: { name: string; est: string; note: string }[];
}[] = [
  {
    label: "Ingepland · sprint 18",
    tone: "success",
    items: [
      { name: "Tweefactor-login", est: "6u", note: "in review" },
      { name: "Userback v2 widget", est: "4u", note: "" },
      { name: "CSV-export op issues", est: "3u", note: "" },
    ],
  },
  {
    label: "Wacht op jouw keuze",
    tone: "warning",
    items: [
      { name: "Slack-integratie meldingen", est: "12u", note: "vraagt vrijgave kanaal-budget" },
      { name: "Bulk-import CSV (klanten)", est: "8u", note: "scope-vraag uit" },
    ],
  },
  {
    label: "Bewust uitgesteld",
    tone: "muted",
    items: [
      { name: "Mobiele app", est: "—", note: "reden: focus op web-stabiliteit Q2" },
      { name: "AI-suggesties op feedback-form", est: "—", note: "reden: wacht op verifier-flow" },
    ],
  },
];
