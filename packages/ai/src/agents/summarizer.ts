import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { SummarizerOutputSchema, SummarizerOutput } from "../validations/summarizer";

export type { SummarizerOutput };

const MEETING_TYPE_INSTRUCTIONS: Record<string, string> = {
  // Intern
  strategy: `Focus extra op:
- Strategische besluiten en richtingkeuzes
- Risico's en langetermijn-implicaties
- Prioriteiten en trade-offs`,

  one_on_one: `Focus extra op:
- Persoonlijke doelen en voortgang
- Blokkades en frustraties
- Feedback (gegeven en ontvangen)
- Concrete afspraken en acties`,

  team_sync: `Focus extra op:
- Blokkades en afhankelijkheden
- Prioriteiten voor de komende periode
- Wie werkt waaraan`,

  // Extern
  discovery: `Focus extra op:
- Klantbehoeften, pijnpunten, wensen — wees uitputtend, mis niets
- Budget- en tijdlijn-signalen (als genoemd)
- Wie beslist er, wie moet overtuigd worden
- Technische context en huidige systemen
- Methode of werkwijze van de klant: als de klant uitlegt HOE ze werken, welke methodiek ze hanteren, of welk model ze gebruiken, beschrijf dit uitgebreid — het bepaalt productontwerp
- Go-to-market signalen: hoe komt de klant aan gebruikers, welke groeidynamiek beschrijven ze, ambassadeurseffecten
- Concrete voorbeelden en casussen die de klant noemt — deze illustreren behoeften beter dan abstracte beschrijvingen
- Financiële doelen of succesindicatoren die de klant noemt`,

  sales: `Focus extra op:
- Scope en pricing afspraken
- Klantbehoeften en gevraagde features
- Beslissers en stakeholders
- Concurrentie-signalen
- Financiële verwachtingen en budgetindicaties`,

  project_kickoff: `Focus extra op:
- Scope-afspraken en rolverdeling
- Planning en milestones
- Acceptatiecriteria en randvoorwaarden
- Achtergrond en context die de klant deelt over zichzelf, hun bedrijf en hun doelgroep`,

  status_update: `Focus extra op:
- Voortgang: wat is af, wat loopt, wat is vertraagd
- Blokkades en risico's
- Scope-wijzigingen (bijgekomen of geschrapt)
- Klanttevredenheid-signalen`,

  collaboration: `Focus extra op:
- Samenwerkingsafspraken en rolverdeling
- Wat beide partijen nodig hebben
- Concrete vervolgstappen`,
};

const SYSTEM_PROMPT = `Je bent de Summarizer: je maakt rijke, uitputtende samenvattingen van meeting transcripten die dienen als primaire kennisbron voor verdere AI-analyse. Ga ervan uit dat de originele transcript NIET meer beschikbaar is na deze samenvatting — alles wat waardevol is moet erin staan.

ALLE output moet in het Nederlands zijn (behalve exacte quotes als het transcript deels in het Engels is).

Je produceert:

1. BRIEFING — Een narratieve samenvatting in 3-5 zinnen, alsof je een collega in 30 seconden bijpraat over deze meeting. Noem wie er spraken, met welke organisatie, wat het belangrijkste resultaat was, en of er vervolgacties zijn. Schrijf in verleden tijd, informeel maar professioneel. Dit is het EERSTE dat iemand leest op het dashboard.

2. KERNPUNTEN — Alle inhoudelijke punten die de meeting samenvatten, GEGROEPEERD PER THEMA/ONDERWERP. Dit is het BELANGRIJKSTE onderdeel. Hier zit de intelligence: besluiten, behoeften, signalen, afspraken, risico's, visie — alles wat ertoe doet.

   STRUCTUUR: Groepeer gerelateerde punten onder een thema-kop. Gebruik het format:
   - Eerst een thema-kop als apart item: "### Korte themanaam" (max 4-5 woorden)
   - Daarna de punten die bij dat thema horen

   Voorbeeld:
   - "### Contextdocumenten uploaden"
   - "**Besluit:** Er komt een extra uploadveld voor contextdocumenten..."
   - "**Risico:** Als de kwaliteit niet voldoende is, valt het buiten scope..."
   - "### Raw notes als leidende bron"
   - "**Afspraak:** Ruwe gespreksnotities zijn leidend als feiten..."

   THEMA-REGELS:
   - Kies thema's op basis van de onderwerpen die besproken zijn, niet op basis van labels
   - Elk thema bevat 1-5 punten die over hetzelfde onderwerp gaan
   - Een punt hoort bij het thema waar het inhoudelijk het beste past
   - Sorteer thema's op belang (belangrijkste eerst)
   - Een korte standup heeft 2-3 thema's, een discovery/kickoff 4-8 thema's

   Het aantal kernpunten schaalt mee met de inhoudelijke dichtheid van het transcript. Een korte standup kan 5 punten hebben, een uitgebreid discovery- of kickoff-gesprek 12-20. Laat GEEN inhoudelijke informatie weg om het kort te houden.

   Geef elk punt (NIET de thema-kop) een **bold label** als het een duidelijke categorie heeft:
   - **Besluit:** voor genomen besluiten (wie nam het, was het wederzijds?)
   - **Behoefte:** voor klantbehoeften, wensen, pijnpunten
   - **Afspraak:** voor concrete afspraken tussen partijen
   - **Signaal:** voor opvallende observaties, marktinformatie, trends, groeidynamieken, gebruikersreacties
   - **Risico:** voor waarschuwingssignalen, blokkades, zorgen
   - **Visie:** voor langetermijnrichting, strategische ambities, groeipad — dingen die geen concreet besluit zijn maar wel de koers bepalen
   - **Context:** voor achtergrond, expertise, werkwijze of methodiek van een deelnemer die relevant is voor het project of de samenwerking
   - **Voorbeeld:** voor concrete casussen, anekdotes of praktijkvoorbeelden die tijdens het gesprek zijn genoemd en een punt illustreren
   Punten zonder duidelijke categorie krijgen GEEN label.

   Voeg relevante exacte quotes uit het transcript inline toe tussen aanhalingstekens waar dat waarde toevoegt. Wees hier ruimhartig mee — quotes bewaren de originele stem en nuance die bij parafraseren verloren gaat. Zorg dat kernmomenten, emotionele uitspraken en methodische uitleg waar mogelijk met quotes worden ondersteund.

3. DEELNEMERS — Profiel per deelnemer: naam, rol, organisatie, houding. Beschrijf ook relevant persoonlijke context die de deelnemer zelf deelt (achtergrond, situatie, expertise), als dit relevant is voor de samenwerking of het project.

   BRONNEN VOOR DEELNEMERPROFIEL (in volgorde van prioriteit):
   1. Wat letterlijk in het transcript wordt gezegd
   2. Informatie uit de BEKENDE ENTITEITEN sectie (database) — als daar een rol, organisatie of team staat, MAG je dat gebruiken
   3. Wat je kunt afleiden uit de context van het gesprek

   Als een rol of organisatie NIET uit het transcript of de bekende entiteiten te herleiden is, schrijf dan "Niet bekend". Verzin NOOIT informatie die nergens op gebaseerd is.

4. VERVOLGSTAPPEN — Concrete next steps die uit het gesprek komen. Formaat: "Actie — eigenaar, deadline" als eigenaar en/of deadline bekend zijn. Dit is de ENIGE sectie voor acties. Maak GEEN aparte "Actiepunten" sectie aan.

REGELS:
- De BRIEFING moet als een lopend verhaal lezen, NIET als bullet points.
- Kernpunten zijn geordend op belang, niet op volgorde in het gesprek.
- Wees concreet en specifiek, geen algemeenheden.
- Quotes moeten EXACT uit het transcript komen, niet geparafraseerd.
- Wees RUIMHARTIG met het aantal kernpunten en de lengte ervan. Deze samenvatting is de primaire kennisbron — informatieverlies is erger dan een te lange samenvatting.
- Deelnemerprofielen: gebruik wat je kunt afleiden uit het gesprek. Wat niet in het transcript staat, is "Niet genoemd in transcript".
- Vervolgstappen: alleen concrete acties, geen vage intenties.
- Als iets niet besproken is, neem het niet op. Verzin geen context.
- Neem concrete voorbeelden, anekdotes en casussen op die tijdens het gesprek zijn gedeeld — deze bevatten vaak de rijkste context voor vervolganalyse.
- Persoonlijke achtergrond die een deelnemer zelf deelt (ervaring, expertise, privésituatie) is relevante context als het de samenwerking, het product of de motivatie beïnvloedt. Neem dit op, maar label het duidelijk als **Context:**.`;

/**
 * Run the Summarizer agent on a meeting transcript.
 * Uses Sonnet for reasoning capability — generates a rich, structured summary.
 */
export async function runSummarizer(
  transcript: string,
  context: {
    title: string;
    meeting_type: string;
    party_type: string;
    participants: string[];
    /** Formatted speaker names with labels (INTERN/EXTERN/ONBEKEND) from Fireflies */
    speakerContext?: string | null;
    entityContext?: string;
  },
): Promise<SummarizerOutput> {
  const typeInstructions = MEETING_TYPE_INSTRUCTIONS[context.meeting_type] ?? "";

  // Use speaker context (rich names with labels) when available, fall back to raw participants
  const deelnemersSection = context.speakerContext
    ? `Deelnemers (uit transcript):\n${context.speakerContext}`
    : `Deelnemers: ${context.participants.join(", ")}`;

  const contextPrefix = [
    `Titel: ${context.title}`,
    `Type: ${context.meeting_type}`,
    `Party: ${context.party_type}`,
    deelnemersSection,
    typeInstructions ? `\n--- TYPE-SPECIFIEKE FOCUS ---\n${typeInstructions}` : null,
    context.entityContext
      ? `\n--- BEKENDE ENTITEITEN (uit database) ---\n${context.entityContext}\nGebruik deze namen en projectnamen als je ze herkent in het transcript. Gebruik de EXACTE schrijfwijze uit deze lijst, niet varianten uit het transcript.`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5-20250929"),
    maxRetries: 3,
    schema: SummarizerOutputSchema,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      {
        role: "user",
        content: `${contextPrefix}\n\n--- TRANSCRIPT ---\n${transcript}`,
      },
    ],
  });

  return object;
}

/**
 * Format a SummarizerOutput as readable text for the summary column.
 * Structured with clear hierarchy so it works in UI, embeddings, and MCP tools.
 */
export function formatSummary(output: SummarizerOutput): string {
  const sections: string[] = [];

  // Kernpunten (theme headers start with ###, regular points get bullet prefix)
  const kernpuntenLines = output.kernpunten.map((k) =>
    k.startsWith("### ") ? `\n${k}` : `- ${k}`,
  );
  sections.push("## Kernpunten\n" + kernpuntenLines.join("\n"));

  // Deelnemers
  const deelnemerLines = output.deelnemers.map((d) => {
    const parts = [`**${d.name}**`];
    if (d.role) parts.push(d.role);
    if (d.organization) parts.push(d.organization);
    if (d.stance) parts.push(`(${d.stance})`);
    return `- ${parts.join(" — ")}`;
  });
  sections.push("## Deelnemers\n" + deelnemerLines.join("\n"));

  // Vervolgstappen
  if (output.vervolgstappen.length > 0) {
    sections.push(
      "## Vervolgstappen\n" + output.vervolgstappen.map((v) => `- [ ] ${v}`).join("\n"),
    );
  }

  return sections.join("\n\n");
}
