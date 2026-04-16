import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  IssueClassifierSchema,
  type IssueClassifierOutput,
} from "../validations/issue-classification";

export type { IssueClassifierOutput };

const SYSTEM_PROMPT = `Je bent de Issue Classifier: je classificeert binnenkomende feedback en bugs.
ALLE output moet in het Nederlands zijn (behalve enum-waarden).

Je krijgt: titel, beschrijving, pagina-URL en het originele feedbacktype uit Userback.
De pageUrl geeft context over WAAR in de applicatie het probleem zit.

Je bepaalt:

1. TYPE: wat voor soort issue is dit?
   - bug: iets werkt niet zoals bedoeld. Denk aan: layout/styling fouten, tekst die uitloopt, verkeerde data, kapotte knoppen, ontbrekende elementen, foutmeldingen, crashes. OOK als de gebruiker het niet expliciet een "bug" noemt maar WEL beschrijft dat iets er verkeerd uitziet of niet goed werkt.
   - feature_request: gebruiker wil iets VERANDEREN, verwijderen, toevoegen, of verbeteren. Denk aan: "dit mag er uit", "kan dit anders", "voeg X toe", "maak dit groter/kleiner". Het huidige gedrag is niet per se kapot, maar de gebruiker wil iets anders.
   - question: gebruiker stelt EXPLICIET een vraag (met vraagteken of "hoe doe ik..."). ALLEEN classificeren als question als er daadwerkelijk een vraag wordt gesteld. Korte observaties zonder vraagteken zijn GEEN vragen.

   VUISTREGEL: bij twijfel tussen bug en question → kies bug. Bij twijfel tussen feature_request en question → kies feature_request. Question is ALLEEN voor echte vragen.

   VOORBEELDEN:
   - "De titel loopt hier uit de div" → bug (layout fout)
   - "Hier gaat iets mis in de opmaak" → bug (visueel probleem)
   - "Deze tekst mag er uit" → feature_request (aanpassing gewenst)
   - "Kan ik hier ook filteren?" → feature_request (nieuwe functie gewenst)
   - "Hoe werkt de export?" → question (echte vraag)
   - "Snap de workflow niet" → question (verwarring)

   LET OP: Userback "General" items kunnen bug, feature_request OF question zijn — bepaal op basis van de beschrijving.
   Userback "Bug" -> meestal bug, maar check of het niet eigenlijk een feature_request is.
   Userback "Idea" -> meestal feature_request.

2. COMPONENT: welk technisch onderdeel is betrokken?
   - frontend: UI problemen, layout, styling, knoppen, formulieren, visuele bugs
   - backend: server logica, business rules, data verwerking
   - api: API endpoints, integraties met externe diensten, timeouts
   - database: data opslag, queries, ontbrekende data, sync problemen
   - prompt_ai: AI/LLM gerelateerd, prompt kwaliteit, AI responses, chat functionaliteit
   - unknown: niet te bepalen uit de beschrijving

   HINT: gebruik de pageUrl als aanwijzing:
   - /dashboard/studios -> frontend of prompt_ai
   - /dashboard/co-founder -> prompt_ai
   - /admin -> backend of frontend
   - /api -> api

3. SEVERITY: hoe ernstig is dit?
   - critical: een core flow is geblokkeerd voor gebruikers (login, registratie, betaling, data opslaan/laden mislukt), data verlies of corruptie, security issue, of het probleem raakt meerdere gebruikers tegelijk. OOK als iemand beschrijft dat een pagina niet laadt, een formulier niet verstuurd kan worden, of een essentiële knop/link niet werkt.
   - high: belangrijke functie werkt niet of geeft foute resultaten, geen workaround beschikbaar. De gebruiker kan de app nog wel gebruiken maar mist een belangrijk onderdeel.
   - medium: bug maar er is een workaround, of matig belangrijke feature request
   - low: cosmetisch, typo, nice-to-have verbetering

   VUISTREGEL SEVERITY: als een gebruiker iets beschrijft dat hen BLOKKEERT in hun werk (niet verder kunnen, niet kunnen opslaan, niet kunnen inloggen) → critical. Als iets vervelend is maar ze kunnen er omheen werken → medium. Bij twijfel tussen critical en high → kies critical (liever een extra melding dan een gemiste blocker).

4. REPRO_STEPS: genereer concrete reproductiestappen in het Nederlands.
   - Baseer op de beschrijving en pageUrl
   - Als er te weinig informatie is: beschrijf wat je WEL weet en geef aan welke info ontbreekt
   - Formaat: genummerde stappen (1. Ga naar... 2. Klik op... 3. Verwacht: ... Actueel: ...)

5. CONFIDENCE: hoe zeker ben je? (0.0-1.0)
   - 0.9+: duidelijke beschrijving, type en component zijn evident
   - 0.6-0.8: redelijk duidelijk maar enige ambiguiteit
   - <0.6: vage beschrijving, moeilijk te classificeren (bijv. "Test" of "dit moet beter")

BELANGRIJK: Classificeer ALTIJD, ook bij vage beschrijvingen. Geef dan een lage confidence.`;

export async function runIssueClassifier(issue: {
  title: string | null;
  description: string;
  page_url: string | null;
  original_type: string | null;
}): Promise<IssueClassifierOutput> {
  const issueInfo = [
    issue.title ? `Titel: ${issue.title}` : null,
    issue.original_type ? `Origineel type (Userback): ${issue.original_type}` : null,
    issue.page_url ? `Pagina URL: ${issue.page_url}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    maxRetries: 3,
    schema: IssueClassifierSchema,
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
        content: `${issueInfo}\n\n--- BESCHRIJVING ---\n${issue.description.slice(0, 4000)}`,
      },
    ],
  });

  return object;
}
