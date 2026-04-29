/**
 * Wat is er nieuw in DevHub. Handgepleegd, niet auto-gegenereerd uit
 * commits — de bedoeling is dat het *team* het in één minuut leest, niet
 * dat het kompleet is.
 *
 * Voeg een nieuwe entry bovenaan toe wanneer er iets noemenswaardigs is
 * opgeleverd. Schrijf in Jip-en-Janneke: wat ziet de gebruiker, niet welk
 * PR-nummer of welke tabel. Houd het bij hoofdlijnen — details staan in
 * commits en sprint-files.
 */

export interface ChangelogBatch {
  /** Datum-label, vrij format. Bv. "29 april 2026" of "Eerder dit jaar". */
  date: string;
  /** Korte kop boven de batch. Wat is het thema van deze release? */
  headline: string;
  /** Bullets — één regel elk, geen jargon, geen PR-nummers. */
  items: string[];
}

export const CHANGELOG: ChangelogBatch[] = [
  {
    date: "29 april 2026",
    headline: "Cluster-tool slimmer + duplicaten zichtbaar over filters heen",
    items: [
      "Topics gebruiken nu voorbeelden van eerder gekoppelde issues als 'vingerafdruk'. De cluster-tool matcht daardoor accurater en stelt minder verkeerde groeperingen voor.",
      "Op elke topic-rij zie je '+N buiten je filter' wanneer er onder hetzelfde topic nog werk in andere stadia ligt. Geen verstopte duplicaten meer.",
      "Hetzelfde geldt voor de inbox: 'Niet gegroepeerd' toont altijd alle stadia, ongeacht je status-filter.",
    ],
  },
  {
    date: "29 april 2026",
    headline: "Bulk-cluster-tool live + topic-resolutie",
    items: [
      "Eén knop in de inbox: AI groepeert alle ongegroepeerde issues onder bestaande topics of stelt nieuwe topics voor. Niets wordt automatisch gekoppeld — jij accepteert per cluster.",
      "Aparte tabs voor 'Open' en 'Afgerond' issues, zodat je ook ouder werk retroactief kunt opruimen.",
      "Per topic kun je een interne én een klant-zichtbare oplossing schrijven. De klant-versie verschijnt op de Portal-roadmap.",
      "Drie eerder gemelde haperingen in de cluster-flow zijn gefixt.",
    ],
  },
  {
    date: "28 april 2026",
    headline: "Topics als primaire view in de issue-list",
    items: [
      "Issues zijn standaard gegroepeerd per topic — één oogopslag laat zien waar alles staat.",
      "'Niet gegroepeerd'-toggle om snel naar de inbox te springen.",
      "Topic-pill direct op elke issue-rij, plus filter op topic via de URL.",
    ],
  },
  {
    date: "28 april 2026",
    headline: "Topics-feature compleet",
    items: [
      "Topics-pagina met lijst, detail en formulier. Issues handmatig koppelen of ontkoppelen aan een topic.",
      "Onder de motorkap: schema, queries en validaties zodat de Portal er straks bovenop kan bouwen.",
    ],
  },
  {
    date: "27 april 2026",
    headline: "Klant-vertaling editor",
    items: [
      "Schrijf de klant-versie van een topic-titel en -beschrijving direct in DevHub. De Portal toont automatisch de klant-versie waar die bestaat, en valt anders terug op de interne tekst.",
    ],
  },
  {
    date: "Eerder in april 2026",
    headline: "Foundation",
    items: [
      "Userback feedback-widget geïntegreerd: externe feedback komt automatisch in DevHub binnen.",
      "Issues-feature opgezet als verticale slice — alle code per domein op één plek.",
    ],
  },
];
