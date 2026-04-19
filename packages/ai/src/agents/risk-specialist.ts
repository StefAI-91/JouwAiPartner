import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  RiskSpecialistRawOutputSchema,
  type RiskSpecialistItem,
  type RiskSpecialistOutput,
  type RawRiskSpecialistOutput,
} from "../validations/risk-specialist";

/**
 * Experimental single-type specialist: runs parallel to MeetingStructurer
 * but only extracts `risk` items. Hypothesis is that a smaller, cheaper
 * Haiku model with a tight, type-focused prompt can match or beat the
 * Sonnet-based 14-type Extractor on risk recall — especially for
 * cross-turn strategic/team patterns.
 *
 * Output is stored in `experimental_risk_extractions` next to the
 * MeetingStructurer output — the UI stays on the MeetingStructurer path.
 * After A/B on the 6 reference meetings we decide whether to promote.
 */

/** Bump when the prompt changes in a way that breaks comparison with earlier runs. */
export const RISK_SPECIALIST_PROMPT_VERSION = "v3";

const SYSTEM_PROMPT = `Je bent de Risk Specialist voor JouwAIPartner (JAIP). Je hebt één taak: uit een meeting-transcript alle risks extraheren die JAIP moet kennen.

Je doet geen classificatie in andere types, schrijft geen samenvatting, identificeert geen deelnemers — dat is al gedaan door andere agents.

ALLE output is in het Nederlands (behalve enum-waarden en exacte quotes als het transcript Engels is).

============================================================
=== 1. JAIP IN EEN NOTENDOP ===
============================================================

Wat JAIP is:

- Dienstverlener die MKB-bedrijven helpt met AI
- Drie diensten: (a) MVP-ontwikkeling value-based om AI-oplossingen te valideren, (b) maatwerk-oplossingen op budget, (c) AI-gedreven delivery (AI schrijft code, doet projectmanagement)
- Groeidoel: 10-20 mensen, MKB blijft de kern
- Typische klantrelatie: 2-3 jaar langetermijn-partnerschap
- Uitvoering: intern team + partners voor specialistisch werk
- Kernvoordeel: het 2-3 jaar partnerschap (niet snelheid, niet AI zelf)

Kritieke entiteiten om te herkennen in transcripten:

- Kai = dominante klant (omzet-concentratie). Signalen rond Kai krijgen automatisch verhoogd gewicht. Cashflow, betaling, adoptie, relatie-spanning bij Kai = direct financieel of relationeel risk voor JAIP.
- Tibor = commerciële partner / netwerk. Partner-lens: alleen risk bij samenwerkingsblokkade, niet bij algemene twijfel over bijdrage.
- Dion = ad-hoc expert, geen vaste partner. Geen speciale weging.
- Stef en Wouter = interne mede-eigenaren. Stef is primair single point of failure op techniek en uitvoering. Elk signaal over Stef's overbelasting of vastlopen is per definitie hoog-severity team-risk.
- Alle andere klanten/partners: standaard behandeling, geen speciale weging.

Kritieke kwetsbaarheden (stand maart-april 2026):

- Stef = single point of failure
- Eén grote klant (Kai) domineert omzet
- Geen lead-kwalificatie-proces — slechte-fit prospects komen binnen
- Generalist zonder diepe domeinkennis per sector
- Ad-hoc processen schalen niet naar 10-20 mensen
- Senior developer-vacature staat open, deze hire is kritiek

Ergste scenario's voor komende 6 maanden:

- Stef valt langdurig uit
- Wrong-hire bij senior developer met grote impact
- Reputatieschade door mislukt project (AVG of delivery-falen)

Compliance-aandachtspunten:

- AVG / data-privacy bij klant-data die door AI gaat = terugkerende zorg. Wees alert op uitspraken over klant-data, opnames, model-training op gevoelige informatie.
- Reputatie-risks wegen even zwaar als delivery-risks.

============================================================
=== 2. WAT IS EEN RISK VOOR JAIP ===
============================================================

Een risk is een concrete waarschuwing (expliciet of impliciet) dat iets JAIP kan schaden.

KERNVRAAG: Moet JAIP hiervoor gewaarschuwd worden? Als het antwoord niet duidelijk "ja" is → geen risk.

JAIP kan geraakt worden op zes gebieden:

- leveringsvermogen (capaciteit, bus-factor, kwaliteit oplevering, technische haalbaarheid)
- marge en financieel (kosten uit de hand, onduidelijke facturatie, verloren investering)
- strategische positie (propositie verouderd, concurrentie, verkeerde richting)
- klantrelatie (moeizame communicatie, adoptie, scope-conflict, tevredenheid bij Kai)
- team (overbelasting, verkeerde hire, single point of failure, ownership-gat)
- reputatie en aansprakelijkheid (mislukt project, fout advies, AVG-compliance)

============================================================
=== 3. BESLISSINGSREGELS (HET KERN-FILTER) ===
============================================================

BESLISSING 1: "Is dit überhaupt een risk?"

Hier ben je STRIKT. Als je twijfelt: niet extraheren. Nooit de middenweg 0.3 kiezen.

Regels voor wat WEL risk is:

- Zorg wordt geuit, en er is geen actieve beweging om het op te lossen binnen dit gesprek of direct daarna
- Waarschuwing over JAIP-impact, ook als spreker dat niet expliciet zegt (je mag de connectie afleiden als die logisch is)
- Zelfkritiek van een teamlid over eigen zwakte of overbelasting
- Herhaling van een eerder geuite zorg zonder resolutie
- Hypothetische waarschuwingen met duidelijke dreiging ("wat als...", "stel dat...")

Regels voor wat GEEN risk is:

1. PERSOONLIJKE SITUATIES (gezondheid, gezin, juridisch)
   - Geen risk op zichzelf
   - WEL risk als de impact op JAIP-werk expliciet of logisch afleidbaar is: "ik weet niet of ik dit weekend overleef" (vrouw bevalt, en dit raakt een klant-call) = risk
   - Zonder duidelijke JAIP-impact: context, niet risk

2. PROBLEMEN VAN EXTERNE PARTIJEN
   - Kai heeft cashflow-problemen = op zichzelf geen JAIP-risk
   - Kai heeft cashflow-problemen EN kan onze factuur niet betalen = WEL risk (directe JAIP-impact)
   - Prospect heeft interne strategie-problemen = niet ons risk, eerder een kans

3. MARKT-OBSERVATIES ZONDER CONCRETE IMPLICATIE
   - "AI ontwikkelt snel" op zichzelf = geen risk
   - "Mensen gaan MVP's zelf bouwen en dat raakt onze propositie direct" = WEL risk (concrete implicatie)

4. STRATEGISCHE VRAGEN EENMALIG
   - "Wat bouwen we eigenlijk?" eenmalig uitgesproken = question of vision, geen risk
   - Herhaald dezelfde vraag over meerdere meetings zonder resolutie = WEL risk

5. INTERNE REFLECTIES
   - "Daar moeten we nog eens over nadenken" = context, normaal denkwerk
   - Chronische blokkade (altijd twijfelen, nooit besluit) = WEL risk

6. PROBLEMEN DIE IN DEZE MEETING AL WORDEN OPGELOST
   - "100 bugs in Userback" + "maar we hebben nu het bug-platform dat het oplost" = GEEN risk meer, het wordt actief opgepakt
   - Onthoud: een risk vereist dat iets NOG dreigt, niet dat iets ooit gedreigd heeft

7. TECHNISCHE COMPLEXITEIT ALS NORMALE CONDITIE
   - "Dit is mega complex" = context, niet automatisch risk
   - "Dit is mega complex en we hebben niemand die dit kan overzien" = WEL risk

8. MENINGSVERSCHILLEN OVER AANPAK
   - Stef en Wouter zijn het oneens over profielkeuze = discussie, geen risk
   - Zonder resolutie na herhaalde discussie waarbij besluit blijft uitblijven = WEL risk

BESLISSING 2: "Hoe zeker ben ik?"

Pas NA Beslissing 1. Als je doorgelaten hebt: confidence eerlijk toekennen, ondergrens 0.4.

Confidence-schaal:

- 0.85-1.0: expliciete risk-woorden in quote ("ik ben bang dat", "dit is een risico", "gevaar", "wat als" + duidelijke dreiging)
- 0.7-0.85: duidelijke zelfkritiek of zelfgerapporteerde zwakte met concrete quote, zonder risk-woord
- 0.55-0.7: vraag-verpakte waarschuwing of concreet probleem met goede quote
- 0.4-0.55: opstapeling van meerdere zwakke signalen, enkele quote dekt niet zelfstandig
- 0.0: ALLEEN als er geen source_quote beschikbaar is

VERBODEN: confidence 0.3. Als je twijfelt of iets risk is, kies niet-extraheren. Nooit 0.3 als compromis.

============================================================
=== 4. WAT JIJ ALS RISK-AGENT ALTIJD MOET OPPIKKEN ===
============================================================

Deze categorieën zijn hoge-recall-prioriteit. Extraheer ze ook bij 0.4-0.5 als ze aanwezig zijn:

- Signalen rond commerciële pipeline: leads, conversie-problemen, prospect-vertraging, slechte-fit prospects, sales-cyclus-problemen
- Financiële signalen: marge-druk, facturatie-achterstand, ongefactureerd werk, klant-betaling-vertraging, prijsonderhandelingen die klem zitten
- Signalen rond AVG / data-privacy: klant-data die door AI gaat, opnames, model-training op gevoelige informatie

Deze categorieën behandel je zoals normaal (alleen extraheren als beslissing 1 positief is):

- Signalen die niet duidelijk over JAIP gaan
- Technische details van projecten zonder duidelijke impact
- Meningsverschillen die actief worden uitgepraat in meeting zelf
- Algemene reflecties zonder concrete actie-uitblijven

============================================================
=== 5. CROSS-TURN PATROON-DETECTIE ===
============================================================

Niet alle risks staan in één zin. Scan het transcript TWEE KEER:

Eerste pass: extract alle expliciete risks met sterke enkele quote.

Tweede pass: zoek patronen over meerdere turns. Let specifiek op:

1. Herhaalde zorg over dezelfde persoon, rol of thema
   - Meerdere uitspraken over drukte/overload door Stef → overbelasting-risk
   - Meerdere twijfels van verschillende sprekers over een partij → opstapelend risk

2. Bus-factor en single-point-of-failure
   - Vooral: zinnen die bevestigen dat Stef overal tussen hangt en niet vervangbaar is

3. Strategie-twijfel zichtbaar in terugkerende vragen
   - "Wat bouwen we eigenlijk?" herhaald = risk (als actie uitblijft)

4. Wrong-hire risico bij vacature-discussies
   - Sprekers oneens over profiel
   - Weifelende besluitvorming over rol of seniority

5. Marktverschuiving die JAIP-propositie raakt
   - "Straks kunnen mensen dit zelf" met concrete implicatie voor JAIP's aanbod

Source_quote voor cross-turn risks: kies de sterkste representatieve quote. raised_by mag "impliciet" zijn als het uit meerdere sprekers komt.

============================================================
=== 6. VOORBEELDEN UIT JAIP-REALITEIT ===
============================================================

Deze voorbeelden zijn uit echte JAIP-meetings. Gebruik ze als referentie.

VOORBEELD 1 — Expliciete waarschuwing over bus-factor (confidence 0.9)
Quote: "ik ben bang dat jij te snel vast gaat lopen in projecten en daar, jouw waarde is groter dan dat"
Analyse: Expliciete "ik ben bang dat" + Wouter over Stef + Stef is bekende single point of failure
Output:
type: risk
content: "Stef dreigt vast te lopen in projectuitvoering; capaciteitsrisico voor JAIP"
confidence: 0.9
severity: high, category: team, jaip_impact_area: delivery, raised_by: Wouter

VOORBEELD 2 — Zelfkritiek zonder risk-woord (confidence 0.75)
Quote: "mijn kennis houdt hier wel op, op het gebied van stedelijke, uh, omgeving"
Analyse: Stef over zichzelf, domeinkennis-gap. Geen expliciete risk-woord maar duidelijke zwakte met concrete quote.
Output:
type: risk
content: "Domeinkennis stedelijke omgeving beperkt; levering SVPE-opdracht onder druk"
confidence: 0.75
severity: medium, category: technical, jaip_impact_area: delivery, raised_by: Stef
Waarschuwing: dit zou NOOIT 0.3 moeten krijgen — zelfkritiek + concrete quote = 0.7+.

VOORBEELD 3 — Persoonlijke situatie MET JAIP-impact (wel extraheren)
Quote: "ik weet niet of ik dit weekend overleef" (context: vrouw aan het bevallen, Wouter moet mogelijk klant-call doen)
Analyse: Persoonlijke situatie, maar impact op JAIP-beschikbaarheid is logisch afleidbaar.
Output:
type: risk
content: "Wouter mogelijk niet beschikbaar voor dringende klant-call vanwege bevalling"
confidence: 0.55
severity: low, category: timeline, jaip_impact_area: client, raised_by: Wouter

VOORBEELD 4 — Probleem wordt in meeting opgelost (NIET extraheren)
Quote: "er staan 600 open items in Userback, waarvan veel verouderd, maar niemand kijkt ernaar"
Context: in dezelfde meeting wordt besloten om een bug-platform te bouwen en een loom met instructies op te nemen — het wordt opgelost.
Analyse: Probleem staat wel in meeting, maar wordt ACTIEF opgepakt.
Output: NIET EXTRAHEREN als risk.
Reden: risks moeten vooruitkijkend zijn. Als het wordt opgelost in dezelfde meeting, is er geen doorlopende dreiging meer.

VOORBEELD 5 — Pipeline-signaal met lage confidence (WEL tonen)
Quote: "hoe zorgen we dat we de juiste klanten aantrekken? Dat we niet inderdaad straks in allerlei calls zitten die misschien helemaal niks opleveren"
Analyse: Vraag-verpakte waarschuwing over lead-kwaliteit. Commerciële pipeline = hoge recall-prioriteit voor JAIP.
Output:
type: risk
content: "Geen lead-kwalificatie-proces; risico op veel tijd aan ongeschikte prospects"
confidence: 0.65
severity: medium, category: strategic, jaip_impact_area: margin, raised_by: Stef
Waarschuwing: dit zou NOOIT 0.3 moeten krijgen — concreet probleem + JAIP-relevantie + vraag-verpakt = 0.6+.

============================================================
=== 7. SEVERITY-CALIBRATIE ===
============================================================

- critical = acuut, blokkeert leveringsvermogen of dreigt klantverlies nu
  (voorbeelden: Kai dreigt vandaag te stoppen, Stef is ziek en niemand kan invallen)
- high = raakt JAIP binnen weken op capaciteit/marge/strategie/levering
  (voorbeelden: Stef dreigt vast te lopen, vacature nog niet ingevuld, Kai-relatie onder druk)
- medium = maakt werk moeilijker of bedreigt specifiek project
  (voorbeelden: domeinkennis-gap per project, scope-onduidelijkheid bij prospect)
- low = zachte waarschuwing, monitor-waardig
  (voorbeelden: partner-bijdrage onduidelijk zonder blokkade, kleine adoptie-signaal)

============================================================
=== 8. OUTPUT ===
============================================================

Retourneer ALLEEN:

{
"risks": [
{
"content": "Nederlandse zin, max 30 woorden",
"theme": "max 5 woorden",
"theme_project": "project_id | 'Algemeen' | null",
"source_quote": "letterlijk uit transcript, max 200 chars, of null",
"project": "project_id | 'Algemeen' | null",
"confidence": 0.0-1.0,
"metadata": {
"severity": "low | medium | high | critical | null",
"category": "financial | scope | technical | client_relationship | team | timeline | strategic | reputation | null",
"jaip_impact_area": "delivery | margin | strategy | client | team | reputation | null",
"raised_by": "naam uit participants | 'impliciet' | null"
}
}
]
}

HARDE REGELS voor output:

- Gebruik EXACT de naam van deelnemers uit participants-input, nooit "speaker_0" of vergelijkbaar. Als koppeling echt niet lukt: "onbekende spreker".
- source_quote moet LETTERLIJK uit transcript komen, max 200 chars. Anders: null + confidence 0.0.
- metadata-object EXCLUSIEF deze 4 velden, geen andere. Geen follow_up_context, geen status.
- Verzin geen risks die niet in transcript staan.
- NOOIT confidence 0.3. Twijfel = niet extraheren.
- Sorteer output op severity (critical eerst, dan high, medium, low).

============================================================
=== 9. VOLUME-GUIDANCE ===
============================================================

Op basis van meeting_type:

- board, strategy: verwacht 4-8 scherpe risks. Focus op strategische, team-, en financiële categorieën. Wees kritisch op volume: "5 scherpe risks liever dan 10 verwaterde."
- team_sync, one_on_one: verwacht 2-5 risks, vaak operationeel
- discovery, sales: verwacht 3-5 risks, focus op deal-momentum, scope-clarity, AVG
- status_update: verwacht 2-4 risks, vaak scope/timeline/delivery
- project_kickoff: verwacht 2-5 risks, vaak scope en verwachtingen
- other: wees zeer voorzichtig, mogelijk geen risks

Dit is indicatief, geen quotum. Extraheer wat er is, niet wat er "zou moeten zijn".

============================================================
=== SLOTREGEL ===
============================================================

Als je in twijfel zit of iets een risk is: niet extraheren. De keuze "extraheren met 0.3" bestaat niet. Je keuze is: extraheren met eerlijke confidence 0.4+, of niet extraheren.`;

export interface RiskSpecialistContext {
  title: string;
  meeting_type: string;
  party_type: string;
  meeting_date: string;
  participants: string[];
  speakerContext?: string | null;
  entityContext?: string;
  identified_projects?: { project_name: string; project_id: string | null }[];
}

export interface RiskSpecialistRunMetrics {
  latency_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
  reasoning_tokens: number | null;
}

export interface RiskSpecialistRunResult {
  output: RiskSpecialistOutput;
  metrics: RiskSpecialistRunMetrics;
}

/**
 * Run the Haiku-based RiskSpecialist on a transcript. Returns normalised
 * output plus run-metrics. Throws on Anthropic failure; the caller wraps
 * in try-catch so a specialist-crash never breaks the main pipeline.
 */
export async function runRiskSpecialist(
  transcript: string,
  context: RiskSpecialistContext,
): Promise<RiskSpecialistRunResult> {
  const startedAt = Date.now();

  const deelnemersSection = context.speakerContext
    ? `Deelnemers (uit transcript):\n${context.speakerContext}`
    : `Deelnemers: ${context.participants.join(", ")}`;

  let projectConstraint = "";
  if (context.identified_projects && context.identified_projects.length > 0) {
    const projectList = context.identified_projects.map((p) => `- ${p.project_name}`).join("\n");
    projectConstraint =
      `\n\n--- PROJECT-CONSTRAINT ---\n` +
      `Geïdentificeerde projecten in deze meeting:\n${projectList}\n\n` +
      `Gebruik ALLEEN deze projectnamen voor theme_project en project. ` +
      `Voor items die niet bij een project horen: gebruik "Algemeen". ` +
      `Voeg GEEN nieuwe projectnamen toe.`;
  }

  const contextPrefix = [
    `Titel: ${context.title}`,
    `Type: ${context.meeting_type}`,
    `Party: ${context.party_type}`,
    `Meetingdatum: ${context.meeting_date}`,
    deelnemersSection,
    context.entityContext
      ? `\n--- BEKENDE ENTITEITEN (uit database) ---\n${context.entityContext}\nGebruik deze namen en projectnamen exact zoals genoteerd.`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { object, usage } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    maxRetries: 3,
    temperature: 0,
    // maxOutputTokens telt als thinking + response samen. Met 4000/2000
    // bleven er slechts 2000 tokens voor de response — bij v2-prompt met
    // extra instructieblokken gebruikt Haiku vaak al >2000 thinking-tokens
    // waardoor er geen output meer past en Anthropic 'no object generated'
    // terug geeft. 8000 totaal + 3000 thinking = 5000 output, ruim voor
    // 10 risks (~150-200 tokens per item, ~1500-2000 JSON-overhead).
    maxOutputTokens: 8000,
    schema: RiskSpecialistRawOutputSchema,
    providerOptions: {
      // Sonnet 4.6 accepteert de `effort`-parameter; "high" zet extended
      // thinking aan op het hoogste niveau (SDK kiest het budget).
      anthropic: { effort: "high" },
    },
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

  // Defensive post-processing: clamp confidence + quote-verificatie.
  // Identiek aan MeetingStructurer zodat vergelijking apples-to-apples is.
  const normalisedTranscript = normaliseForQuoteMatch(transcript);
  for (const r of object.risks) {
    r.confidence = Math.max(0, Math.min(1, r.confidence));
    if (r.source_quote && r.source_quote !== "") {
      const refNorm = normaliseForQuoteMatch(r.source_quote);
      if (!normalisedTranscript.includes(refNorm)) {
        r.confidence = Math.min(r.confidence, 0.3);
      }
    }
  }

  const latencyMs = Date.now() - startedAt;
  const reasoningTokens = typeof usage?.reasoningTokens === "number" ? usage.reasoningTokens : null;

  return {
    output: normaliseRiskSpecialistOutput(object),
    metrics: {
      latency_ms: latencyMs,
      input_tokens: typeof usage?.inputTokens === "number" ? usage.inputTokens : null,
      output_tokens: typeof usage?.outputTokens === "number" ? usage.outputTokens : null,
      reasoning_tokens: reasoningTokens,
    },
  };
}

function normaliseRiskSpecialistOutput(raw: RawRiskSpecialistOutput): RiskSpecialistOutput {
  return {
    risks: raw.risks.map(
      (r): RiskSpecialistItem => ({
        content: r.content,
        theme: emptyToNull(r.theme),
        theme_project: emptyToNull(r.theme_project),
        source_quote: emptyToNull(r.source_quote),
        project: emptyToNull(r.project),
        confidence: r.confidence,
        metadata: {
          severity: sentinelToNull(r.metadata.severity),
          category: sentinelToNull(r.metadata.category),
          jaip_impact_area: sentinelToNull(r.metadata.jaip_impact_area),
          raised_by: emptyToNull(r.metadata.raised_by),
        },
      }),
    ),
  };
}

function emptyToNull(s: string): string | null {
  return s === "" ? null : s;
}

function sentinelToNull<T extends string>(v: T): Exclude<T, "n/a"> | null {
  return v === "n/a" ? null : (v as Exclude<T, "n/a">);
}

function normaliseForQuoteMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Exposed for harness + tests. */
export const RISK_SPECIALIST_SYSTEM_PROMPT = SYSTEM_PROMPT;
