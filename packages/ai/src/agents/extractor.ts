import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { ExtractorOutputSchema, ExtractorOutput } from "../validations/extractor";

export type { ExtractorOutput };

const MEETING_TYPE_INSTRUCTIONS: Record<string, string> = {
  // Intern
  strategy: `Focus op afspraken waar iemand extern iets moet aanleveren of waar een beslissing nog openstaat die je kunt opvolgen.`,

  one_on_one: `Focus op toezeggingen aan derden die je kunt opvolgen per mail. Interne persoonlijke ontwikkeldoelen zijn GEEN actiepunten.`,

  team_sync: `Focus op externe afhankelijkheden: wat wacht het team op van klanten of partners? Interne taken (wie bouwt wat) zijn GEEN actiepunten.`,

  // Extern
  discovery: `Focus op wat de klant moet aanleveren of terugkoppelen. Interne voorbereidingstaken zijn GEEN actiepunten.`,

  sales: `Focus op commerciële opvolging richting de klant: wachten op akkoord, informatie die zij moeten aanleveren, beslissingen die zij moeten nemen.`,

  project_kickoff: `Focus op externe afhankelijkheden en klant-leveringen. Interne setup-taken zijn GEEN actiepunten.`,

  status_update: `Focus op blokkades door externe partijen. Interne vervolgstappen zijn GEEN actiepunten.`,

  collaboration: `Focus op acties van de andere partij die je kunt opvolgen per mail.`,
};

const SYSTEM_PROMPT = `Je bent de Extractor: je haalt opvolgbare actiepunten uit meeting transcripten voor het JAIP-team.
ALLE output moet in het Nederlands zijn (behalve enum-waarden en exacte quotes uit Engels transcript).

--- KERNREGEL ---
Extraheer ALLEEN actiepunten waarbij JAIP iemand kan e-mailen om op te volgen.
De litmustest is: "Kunnen wij een concrete persoon een mail sturen om dit op te volgen?"
Zo nee → GEEN actiepunt. Zo ja → extraheer het.

--- CATEGORIEËN ---

CATEGORIE 1: WACHTEN OP EXTERN (category: "wachten_op_extern")
Een externe partij (klant, partner, leverancier) moet iets doen of aanleveren.
- De eigenaar is NIET van JAIP
- JAIP kan deze persoon mailen om op te volgen als het uitblijft

CATEGORIE 2: WACHTEN OP BESLISSING (category: "wachten_op_beslissing")
Iemand (intern of extern) moet nog een beslissing nemen die werk blokkeert.
- Er is een specifiek persoon die de beslissing moet nemen
- JAIP kan deze persoon mailen/aanspreken om de beslissing te forceren

--- FORMULERING VAN CONTENT ---
Schrijf de content als een KORTE, SIMPELE zin die beschrijft wat er opgevolgd moet worden.
Maximaal 10-15 woorden. Schrijf het als een menselijke opvolg-vraag.

Goede voorbeelden:
- "PR-linkbuilding voorstel doorsturen"
- "Urenbudget SEA verhogen en kosten herverdelen"
- "Beslissing nemen over Windows licentie-type"
- "Feedback aanleveren op wireframes"
- "Akkoord geven op offerte"

Slechte voorbeelden (te lang, te formeel):
- "Opvolgen bij Laura: PR-linkbuilding voorstel voor Duitsland doorsturen (Windows 11 licentie, Windows 11 Pro, Windows 10 Enterprise focus) — nodig voor goedkeuring en plaatsingen"
- "Beslissing nodig van Ron: urenbudget SEA verhogen + marketing-kosten herverdelen (Nederland omhoog, Duitsland omlaag) — nodig voor capaciteit Service 2025-licenties"

--- EXPLICIET GEEN ACTIEPUNT ---
- Interne taken van JAIP ("wij bouwen X", "ik maak het document af", "offerte schrijven")
- Taken zonder duidelijke contactpersoon om te mailen
- Procesafspraken ("we houden dit ritme aan", "elke sprint draaien we een review")
- Conditionele acties ("eventueel", "mocht het nodig zijn", "als X dan Y")
- Werkafspraken/gedragsregels ("als je iets tegenkomt, stuur een screenshot")
- Herhalingen van een ander actiepunt
- Samengestelde acties met meerdere eigenaren — splits of laat vallen
- Klanttaken die ons werk NIET blokkeren (hun interne logistiek)
- Trivialiteiten (smalltalk, logistiek zoals "volgende meeting om 10 uur")

--- VERPLICHT VELD: follow_up_contact ---
Elk actiepunt MOET een follow_up_contact hebben: de naam van de persoon die je kunt mailen.
Als je geen specifieke persoon kunt identificeren → het is GEEN actiepunt.

--- DEADLINE SCHATTING ---
Bepaal voor elk actiepunt een deadline:
1. Als er een EXPLICIETE deadline in het transcript staat → vul "deadline" in (ISO YYYY-MM-DD).
2. Als er GEEN expliciete deadline is → vul "suggested_deadline" in op basis van onderstaande regels.

Expliciete cues (altijd voorrang, bereken vanaf de meetingdatum):
- "vandaag nog", "direct" → meetingdatum
- "morgen" → +1 werkdag
- "deze week" → vrijdag van die week
- "volgende week" → vrijdag volgende week
- "voor de volgende sessie/sprint" → +2 weken
- "zo snel mogelijk", "urgent" → +2 werkdagen
- "eind van de maand" → laatste werkdag van de maand

Default (als er geen cue is): +5 werkdagen (herinneringsmoment)

Regels:
- Altijd WERKDAGEN (geen weekenden)
- Bereken vanaf de MEETINGDATUM (staat in de context), niet vandaag
- Vul "effort_estimate" in: small (simpele opvolging), medium (meerdere reminders nodig), large (complexe afhankelijkheid)
- Vul "deadline_reasoning" in: leg uit welke cue of default je gebruikte

--- ALGEMENE REGELS ---
- Elke extractie MOET een transcript_ref hebben: een EXACTE quote uit het transcript die de actie ondersteunt.
- Als je geen exacte quote kunt vinden, zet transcript_ref op null en confidence op 0.0.
- Confidence scoring:
  - 1.0: expliciet en ondubbelzinnig uitgesproken, exacte quote gevonden
  - 0.7-0.9: sterk geïmpliceerd, goede quote gevonden
  - 0.4-0.6: afgeleid/geïnterpreteerd, zwakke quote
  - 0.0: geen quote gevonden of transcript_ref matcht niet
- Wees HEEL SELECTIEF: liever 2 sterke opvolgpunten dan 8 zwakke.
- Entities: noem alle klanten/externe organisaties die besproken zijn.
- Project-toewijzing per extractie: gebruik ALLEEN de aangeleverde projectnamen. Voeg GEEN nieuwe projectnamen toe. Gebruik null als een extractie niet bij een project past.`;

/**
 * Run the Extractor agent on a meeting transcript.
 * Uses Sonnet for reasoning capability — extracts only action items.
 */
export async function runExtractor(
  transcript: string,
  context: {
    title: string;
    meeting_type: string;
    party_type: string;
    participants: string[];
    summary: string;
    meeting_date: string;
    identified_projects?: { project_name: string; project_id: string | null }[];
    entityContext?: string;
  },
): Promise<ExtractorOutput> {
  const typeInstructions = MEETING_TYPE_INSTRUCTIONS[context.meeting_type] ?? "";

  // Build project constraint section if projects are identified
  let projectConstraint = "";
  if (context.identified_projects && context.identified_projects.length > 0) {
    const projectList = context.identified_projects.map((p) => `- ${p.project_name}`).join("\n");
    projectConstraint =
      `\n\n--- PROJECT-CONSTRAINT ---\n` +
      `De volgende projecten zijn geidentificeerd in deze meeting:\n${projectList}\n\n` +
      `Gebruik ALLEEN deze projectnamen bij het toewijzen van een project aan extracties. ` +
      `Als een extractie niet bij een van deze projecten hoort, laat project dan null. ` +
      `Voeg GEEN nieuwe projectnamen toe. Je mag null toewijzen als je vindt dat een extractie ` +
      `niet bij een project past, ook al staat het project in de lijst.`;
  }

  const contextPrefix = [
    `Titel: ${context.title}`,
    `Type: ${context.meeting_type}`,
    `Party: ${context.party_type}`,
    `Meetingdatum: ${context.meeting_date}`,
    `Deelnemers: ${context.participants.join(", ")}`,
    context.summary ? `Samenvatting: ${context.summary}` : null,
    typeInstructions ? `\n--- TYPE-SPECIFIEKE INSTRUCTIES ---\n${typeInstructions}` : null,
    context.entityContext
      ? `\n--- BEKENDE PERSONEN & ENTITEITEN (uit database) ---\n${context.entityContext}\nGebruik deze namen voor het assignee-veld. Gebruik de EXACTE schrijfwijze uit deze lijst.`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5-20250929"),
    maxRetries: 3,
    schema: ExtractorOutputSchema,
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
        content: `${contextPrefix}${projectConstraint}\n\n--- TRANSCRIPT ---\n${transcript}`,
      },
    ],
  });

  // Post-process: validate transcript_ref + clamp confidence
  for (const extraction of object.extractions) {
    // Clamp confidence to 0.0–1.0 (Anthropic API doesn't support min/max in schema)
    extraction.confidence = Math.max(0, Math.min(1, extraction.confidence));

    if (extraction.transcript_ref) {
      const refLower = extraction.transcript_ref.toLowerCase();
      const transcriptLower = transcript.toLowerCase();
      if (!transcriptLower.includes(refLower)) {
        // Transcript ref not found — set confidence to 0.0
        extraction.confidence = 0.0;
      }
    }
  }

  return object;
}
