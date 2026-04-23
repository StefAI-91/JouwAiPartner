# Micro Sprint TH-013: Rich per-theme summaries uit de Summarizer

## Doel

De Summarizer genereert per identified theme een **rijke**, thema-gefocuste samenvatting — zelfde diepgang als de hoofd-summary (briefing + kernpunten + vervolgstappen), maar gefilterd op wat deze meeting specifiek over dat thema besprak. Die rijke per-thema samenvattingen vervangen het huidige `meeting_themes.summary` — nu gevuld door de Theme-Detector met 1-2 zinnen, geproduceerd vóór de Summarizer draait en op basis van de ruwe Fireflies-summary. Het resultaat: theme detail pages waar elke meeting-kaart een volwaardige thema-narrative toont in plaats van een dunne zin die onderwerp-context meesleept.

**Waarom deze verschuiving.** De Theme-Detector draait in stap 7.5 van de pipeline (`gatekeeper-pipeline.ts:209-231`) met als enige input de ruwe Fireflies-summary. Zijn `theme_summary`-output landt in `meeting_themes.summary` en voedt de theme detail page. In de praktijk komen die summaries hoog-bleed terug: een meeting die voor 30% over thema X gaat krijgt een summary die — ook al is hij volgens spec "thema-scoped" — de hele meeting-context mee-narratieert omdat dat de enige input was. Voor relationele thema's (coaching, leertraject, governance) is dat extra pijnlijk omdat hun substantie inherent verweven is met het onderwerp dat besproken werd. De Summarizer daarentegen heeft de volledige transcript + de rijke meeting-wide kernpunten + `identified_themes` als context (`gatekeeper-pipeline.ts:257`). Hij kán dus per thema een scherpe, rijke samenvatting leveren — hij doet er nu alleen nog niets mee.

**Waarom de bestaande Summarizer uitbreiden i.p.v. een nieuwe agent.** Een dedicated per-theme summarizer zou N aparte LLM-calls vragen (1 per thema), waarbij de dure input (transcript + system prompt) elke keer opnieuw moet. Eén Summarizer-call met N extra output-velden is 3-4× goedkoper bij meetings met meerdere thema's, gebruikt de bestaande pipeline-integratie, en voegt geen nieuwe agent toe aan de registry. Trade-off: multi-output LLM-calls kunnen kwalitatief minder scherp zijn dan gefocuste calls. Strategie: eerst combineren, meten, pas upgraden naar dedicated als de kwaliteit tegenvalt.

**Plus in scope van deze sprint:**

- **Markdown-opslag in `meeting_themes.summary`.** De bestaande text-kolom wordt ruimer gevuld: per thema een markdown-blok met `## Briefing / ## Kernpunten / ## Vervolgstappen`-secties. Geen DB-migratie, geen nieuwe kolommen — bestaande structuur draagt het.
- **UI-rendering als markdown.** `meetings-tab.tsx` rendert de `summary`-kolom nu als platte paragraph (`{m.summary && <p>{m.summary}</p>}`). Wordt een markdown-renderer met dezelfde visuele taal als de meeting-wide rich summary.
- **Theme-Detector's `theme_summary` wordt fallback.** Blijft in het schema + prompt voor backwards compat en als vangnet wanneer de Summarizer faalt of een thema overslaat, maar is niet langer de primaire bron voor de UI.

**Uit scope van deze sprint** (zie Out of scope sectie voor details): extraction-centric UI-refactor, MeetingStructurer reanimatie, NeedsScanner van summary-naar-transcript, Theme-Detector pipeline-volgorde wijzigen.

Eerste tastbare resultaat: je opent `/themes/eges-leertraject`, ziet een meeting-kaart met niet langer _"Stef begeleidt Ege in een technische troubleshooting-sessie rondom het AI confidence-systeem van Fleur op zak..."_ (meeting-wide narrative), maar een rijke thema-gescoped blok met briefing over Stef's coaching-aanpak, kernpunten over de werkwijze die hij Ege aanleerde, en eventuele vervolgstappen rond Ege's ontwikkeling — zonder de onderwerp-context van Fleur te herhalen. Nieuwe meetings krijgen dit direct via de pipeline; backfill van bestaande meetings via `scripts/batch-detect-themes.ts --force`.

## Requirements

| ID       | Beschrijving                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AI-240   | `SummarizerOutputSchema` in `packages/ai/src/validations/summarizer.ts` uitbreiden met `theme_summaries: Array<{ themeId: string (UUID), briefing: string, kernpunten: string[], vervolgstappen: string[] }>`. Leeg array bij 0 identified_themes. UUID-refine op `themeId` analoog aan `IdentifiedThemeSchema` (TH-011 MB-3). Per theme-summary: `briefing` is 2-4 zinnen narratief, `kernpunten` + `vervolgstappen` alleen thema-relevante bullets (niet de meeting-brede set opnieuw).                                                                                                              |
| AI-241   | `packages/ai/prompts/summarizer.md` krijgt nieuwe sectie **"Per-thema samenvattingen"**: voor elke entry in de input-context `identified_themes` genereert Summarizer één `theme_summaries`-entry met rich thema-gescoped inhoud. Expliciete instructie: _"Beschrijf wat deze meeting specifiek over dit thema besprak, zónder de bredere onderwerp-context te herhalen waar die niet nodig is. Als een thema in deze meeting weinig raakpunten had: kort briefing, lege kernpunten/vervolgstappen is acceptabel."_ Negatieve voorbeelden: geen copy-paste van meeting-wide kernpunten naar elk thema. |
| AI-242   | Renderer-helper `formatThemeSummary(ts: ThemeSummary): string` in `packages/ai/src/agents/summarizer.ts` (naast bestaande `formatSummary`). Output: markdown-string met `## Briefing\n...\n\n## Kernpunten\n- ...\n\n## Vervolgstappen\n- ...` structuur. Lege secties worden weggelaten (geen `## Vervolgstappen` header als de array leeg is). Dit is wat uiteindelijk in `meeting_themes.summary` landt.                                                                                                                                                                                            |
| AI-243   | Caps in `runSummarizer()` post-validation (analoog aan TH-011 AI-233): (a) `THEME_SUMMARIES_HARD_CAP = 6` op `theme_summaries.length`, (b) per theme-summary: `KERNPUNTEN_PER_THEME_CAP = 10` en `VERVOLGSTAPPEN_PER_THEME_CAP = 6` — voorkomt output-token-explosion bij meetings met veel thema's én veel content. Overshoot → truncate + console.warn met `meeting_id` + `themeId`.                                                                                                                                                                                                                 |
| AI-244   | `SUMMARIZER_PROMPT_VERSION` bump van `"v1"` naar `"v2"` in `packages/ai/src/agents/summarizer.ts`. Telemetry-veld naar `agent_runs.prompt_version` wijst daardoor automatisch naar de nieuwe contract-versie; oude runs blijven vindbaar onder v1.                                                                                                                                                                                                                                                                                                                                                     |
| FUNC-290 | `packages/ai/src/pipeline/steps/summarize.ts` — `SummarizeResult` interface krijgt veld `themeSummaries: Map<string, string>` (themeId → rendered markdown-string via `formatThemeSummary`). Populeer door Summarizer output te mappen. Bij falen: lege Map (niet null — consumer hoeft geen null-checks).                                                                                                                                                                                                                                                                                             |
| FUNC-291 | `packages/ai/src/pipeline/steps/link-themes.ts` — `meetingThemesToWrite[i].summary` prefereert `input.summarizerThemeSummaries.get(themeId)` boven `t.theme_summary` uit de detector. Fallback-volgorde: (1) Summarizer per-theme markdown, (2) Theme-Detector's `theme_summary` (huidige 1-2 zinnen), (3) `null`. Nieuwe input-prop `summarizerThemeSummaries?: Map<string, string>` op `LinkThemesStepInput`; orchestrator geeft hem door.                                                                                                                                                           |
| FUNC-292 | `packages/ai/src/pipeline/gatekeeper-pipeline.ts` — Summarizer-call geeft `summarizeResult.themeSummaries` door aan `runLinkThemesStep({ ..., summarizerThemeSummaries })` (regel 328-345). Bij skip (low relevance) blijft de Map leeg — link-themes skipt sowieso al.                                                                                                                                                                                                                                                                                                                                |
| FUNC-293 | Theme-Detector's `theme_summary`-veld blijft in `ThemeDetectorOutputSchema` als fallback (AI-231), maar prompt (`prompts/theme-detector.md`) krijgt een notitie: _"Deze `theme_summary` is fallback voor als de Summarizer faalt. 1-2 zinnen volstaat — de rijke versie wordt later door de Summarizer geleverd."_ Geen gedragswijziging in de detector, alleen verwachtingsmanagement in de prompt.                                                                                                                                                                                                   |
| UI-340   | `apps/cockpit/src/app/(dashboard)/themes/[slug]/tabs/meetings-tab.tsx` (regel 113) — `{m.summary && <p>{m.summary}</p>}` vervangen door een markdown-renderer. Hergebruik `react-markdown` (bestaande dependency op meeting detail page) of minimale custom parser. Rendering-classes consistent met de rich summary op meeting detail: `prose prose-sm` + Tailwind-overrides zoals bestaande summary-rendering. Collapsible bij >400 tekens (details/summary pattern, TH-005 precedent).                                                                                                              |
| UI-341   | Fallback-indicator: wanneer `meeting_themes.summary` afkomstig is van de Theme-Detector (korte 1-2 zins-versie, pre-TH-013 meetings of Summarizer-failure) tonen we géén visueel onderscheid — het is een kortere string die natuurlijk anders leest, geen badge of icoon nodig. Als gebruikers later expliciet willen weten welk model de summary schreef, is dat een latere feature.                                                                                                                                                                                                                 |
| DATA-240 | Geen DB-migratie. `meeting_themes.summary` is al een `text`-kolom (TH-010) die markdown-content zonder aanpassing draagt. Geen nieuwe kolommen, geen constraint-wijzigingen.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| EDGE-240 | Summarizer retourneert `theme_summaries[i].themeId` die niet voorkomt in de input `identified_themes`: `runSummarizer()` filtert de entry weg met console.warn (`[summarizer] onbekende themeId "${id}" gestript`). Patroon identiek aan TH-011 AI-233 hallucination-strip. Blocking zou een pipeline-break veroorzaken voor een recoverable agent-fout.                                                                                                                                                                                                                                               |
| EDGE-241 | Summarizer retourneert `theme_summaries: []` ondanks `identified_themes.length > 0` (agent heeft de extra taak "gemist"): `link-themes.ts` valt per thema terug op Detector's `theme_summary`. Geen error, wel `agent_runs.metadata.theme_summaries_missing: true` als telemetry-vlag zodat we kunnen monitoren hoe vaak de Summarizer faalt in de nieuwe taak.                                                                                                                                                                                                                                        |
| EDGE-242 | Summarizer retourneert voor één thema `kernpunten.length > 10` of `vervolgstappen.length > 6`: truncate naar cap (AI-243), log warn met meeting_id + themeId + originele lengte. Voorkomt output-explosie op edge-cases maar verliest potentiële informatie — monitor telemetry om te zien of de caps te strak staan.                                                                                                                                                                                                                                                                                  |
| EDGE-243 | `meeting_themes.summary` bevat markdown met edge-case content (HTML-entities, ongebalanceerde backticks): de markdown-renderer in `meetings-tab.tsx` moet XSS-veilig renderen (react-markdown default, of expliciete sanitize). Geen raw `dangerouslySetInnerHTML`.                                                                                                                                                                                                                                                                                                                                    |
| EDGE-244 | Backfill-compat: bestaande `meeting_themes.summary` waarden van vóór TH-013 zijn 1-2 zins plain text (Theme-Detector-output). De markdown-renderer moet die correct renderen als alinea (markdown is een superset van plain text). Geen migratie nodig; oude rijen blijven eruitzien zoals ze waren tot `--force` backfill ze vervangt.                                                                                                                                                                                                                                                                |
| SEC-240  | Geen nieuwe auth-grenzen. De pipeline-wijzigingen raken alleen de schrijf-kant; lees-kant op `/themes/[slug]` blijft de bestaande RLS + admin-check (TH-005) respecteren.                                                                                                                                                                                                                                                                                                                                                                                                                              |

## Bronverwijzingen

- Spec: `docs/specs/prd-themes.md` — §2 (themes als cross-meeting lens, verwachte UX-kwaliteit per thema) + §5 (review-gate op thema-content)
- Vision: `docs/specs/vision-ai-native-architecture.md` — Cockpit-quadrant, Theme-as-a-lens patroon, "verification before truth" op thema-niveau
- Sprint-precedent: `sprints/done/TH-010-extraction-themes-fundering.md` — introduceerde `meeting_themes.summary` kolom, hier wordt alleen de vulling verrijkt (geen schema-wijziging)
- Sprint-precedent: `sprints/done/TH-011-theme-detector-extract-time-scoping.md` — Theme-Detector contract + prompt + fallback-strategie (AI-231, hallucination-strip patroon MB-3 + AI-233)
- Code: `packages/ai/src/agents/summarizer.ts` — uitbreidingspunt voor `theme_summaries`-output + nieuwe `formatThemeSummary()` renderer naast bestaande `formatSummary()` (regel 164-185)
- Code: `packages/ai/src/validations/summarizer.ts` — `SummarizerOutputSchema` krijgt extra veld `theme_summaries`
- Code: `packages/ai/prompts/summarizer.md` — nieuwe sectie "Per-thema samenvattingen" onder bestaande kernpunten-instructie
- Code: `packages/ai/src/agents/theme-detector.ts` — prompt-notitie dat `theme_summary` nu fallback is (FUNC-293); agent-gedrag ongewijzigd
- Code: `packages/ai/src/pipeline/steps/summarize.ts:4-10` — `SummarizeResult` interface krijgt `themeSummaries: Map<string, string>`
- Code: `packages/ai/src/pipeline/steps/link-themes.ts:186-193` — `meetingThemesToWrite[i].summary` fallback-ketting: Summarizer-map → Detector `theme_summary` → `null`
- Code: `packages/ai/src/pipeline/gatekeeper-pipeline.ts:279-351` — Summarizer-resultaat doorgeven aan `runLinkThemesStep`
- Code: `apps/cockpit/src/app/(dashboard)/themes/[slug]/tabs/meetings-tab.tsx:113` — `<p>{m.summary}</p>` vervangen door markdown-renderer
- Code-pattern: `apps/cockpit/src/app/(dashboard)/meetings/[id]` — bestaande markdown-rendering van de hoofd-summary (`meetings.summary`) als styling-referentie voor UI-340
- Script: `scripts/batch-detect-themes.ts` — bestaande `--force` backfill-flow draait automatisch de nieuwe Summarizer + link-themes, geen wijziging nodig (EDGE-244 backfill-compat via bestaande regenerate-keten)
- Referentie: research-thread (deze sessie) — bleed-analyse op Ege's leertraject, extraction-centric afgewogen en bewust niet gekozen

## Context

### Waarom markdown in bestaande `text`-kolom i.p.v. gestructureerde kolommen

Twee opties stonden op tafel voor hoe de rijke per-thema samenvatting opgeslagen wordt:

- **A. Markdown in bestaande `meeting_themes.summary` text-kolom.** Summarizer produceert gestructureerde output (`briefing` + `kernpunten[]` + `vervolgstappen[]`), een renderer bouwt daar één markdown-string van (`## Briefing / ## Kernpunten / ## Vervolgstappen`), die string landt in de bestaande text-kolom. UI parseert bij render met een markdown-renderer.
- **B. Gestructureerde kolommen.** Splits `meeting_themes.summary` in drie losse kolommen: `briefing text`, `kernpunten jsonb`, `vervolgstappen jsonb`. UI rendert elk veld apart, volledige controle over styling, query-baar per veld.

**Gekozen: A.** Drie redenen:

1. **Geen DB-migratie, geen breaking change.** Oude rijen (1-2 zins Detector-output) blijven geldig zonder backfill — markdown is een superset van plain text. Een migratie zou óf alle oude rijen op `null` moeten zetten óf een lossy split moeten maken; beide introduceren risico voor 0 UX-winst.
2. **Consistentie met de meeting-wide `meetings.summary`.** Die kolom bevat ook markdown-gerenderde output van de Summarizer (via `formatSummary`). Zelfde patroon volgen voor per-thema is voorspelbaar voor wie later in de codebase rondloopt.
3. **Flexibiliteit als we de structuur willen bijstellen.** Als we straks nog een sectie toevoegen (bv. "Open vragen" per thema), hoeft het schema niet te migreren; de renderer kent een nieuwe sectie-header en de UI-renderer pakt het op. Bij optie B zou elke sectie-uitbreiding een DATA-requirement zijn.

Trade-off die we accepteren: **toekomstige AI-consumers kunnen niet per-veld queryen.** Een toekomstige Theme-AI die alleen de kernpunten wil, moet de markdown opnieuw parsen. Voor V1 is dat geen probleem — er zijn nog geen zulke consumers, en de string is kort genoeg om ongeparst te blijven tot het echt knelt. Migratie naar B is later een reversibele sprint als die behoefte ontstaat.

### Markdown-format — exact

Wat Summarizer-output produceert per thema (schema-niveau):

```json
{
  "themeId": "a1b2c3d4-...",
  "briefing": "Stef coachte Ege in diagnostisch denken rond Fleur's confidence-systeem. De focus lag op het isoleren van symptomen (fine-tuning vs threshold) en het vasthouden van de scope zonder af te dwalen naar zijpaden.",
  "kernpunten": [
    "Stef stuurt Ege aan op gefocuste diagnose — eerst vaststellen of het een fine-tuning issue is, niet direct aan thresholds draaien.",
    "Ege neigt naar architectuur-ideeën als eerste stap; Stef bewaakt de werkwijze door hem expliciet bij diagnose te houden."
  ],
  "vervolgstappen": [
    "Ege experimenteert met voorbeeldgesprekken in system prompt vóór volgende 1:1 met Stef."
  ]
}
```

Wat `formatThemeSummary(ts)` daarvan bouwt en in `meeting_themes.summary` schrijft:

```markdown
## Briefing

Stef coachte Ege in diagnostisch denken rond Fleur's confidence-systeem. De focus lag op het isoleren van symptomen (fine-tuning vs threshold) en het vasthouden van de scope zonder af te dwalen naar zijpaden.

## Kernpunten

- Stef stuurt Ege aan op gefocuste diagnose — eerst vaststellen of het een fine-tuning issue is, niet direct aan thresholds draaien.
- Ege neigt naar architectuur-ideeën als eerste stap; Stef bewaakt de werkwijze door hem expliciet bij diagnose te houden.

## Vervolgstappen

- Ege experimenteert met voorbeeldgesprekken in system prompt vóór volgende 1:1 met Stef.
```

**Lege secties worden weggelaten.** Voor een thema dat geen concrete vervolgstappen opleverde: de hele `## Vervolgstappen` header + lijst verdwijnt uit de output. Niet-leeg maken met placeholder-tekst ("Geen vervolgstappen.") — dat leest storend en vervuilt de UI met niet-informatie.

**Briefing is nooit leeg.** Als een thema überhaupt in `identified_themes` staat is er iets over gezegd; een lege briefing betekent dat de Summarizer zijn werk niet heeft gedaan. De prompt (AI-241) instrueert: korte briefing bij weinig raakpunten is prima, maar iets ervan moet er zijn. Validatie: lege briefing-string → wordt gefilterd door `runSummarizer()` (niet opgenomen in de output-map), link-themes valt terug op Detector-summary (EDGE-241).

**Geen project-prefix in theme-summaries.** De meeting-wide kernpunten krijgen `### [ProjectName]` prefixes (zie huidige summarizer.md), theme-summaries niet — ze staan al in de context van één specifiek thema op een theme detail page. Een project-prefix zou redundant zijn en conflicteert met de thema-scoped framing.

### Fallback-ketting — welke bron wint wanneer

`meeting_themes.summary` kan uit drie bronnen komen. Link-themes.ts past bij elke match deze volgorde toe:

```
1. Summarizer's theme_summaries.get(themeId) → rich markdown  ← PRIMAIR (TH-013)
2. Theme-Detector's identified_themes[i].theme_summary        ← FALLBACK 1-2 zinnen
3. null                                                       ← LAATSTE REDMIDDEL
```

| Scenario                                                             | Bron           | Wat de UI toont                                              |
| -------------------------------------------------------------------- | -------------- | ------------------------------------------------------------ |
| Happy path — nieuwe meeting, Summarizer heeft theme_summary geleverd | Summarizer     | Rijke markdown (briefing + kernpunten + vervolgstappen)      |
| Summarizer gaf `theme_summaries: []` (EDGE-241)                      | Theme-Detector | 1-2 zins plain-text (zoals huidige productie)                |
| Summarizer gaf entry met onbekende themeId (EDGE-240)                | Theme-Detector | 1-2 zins plain-text (de verkeerde entry is gestript)         |
| Summarizer-call faalde volledig                                      | Theme-Detector | 1-2 zins plain-text                                          |
| Pre-TH-013 meeting, nog niet geregenereerd                           | Theme-Detector | 1-2 zins plain-text (EDGE-244 backfill-compat)               |
| Alle drie leeg (extreme edge — Detector gaf ook niks)                | `null`         | Meeting-kaart toont geen summary-blok, alleen evidence-quote |

**Waarom Detector's `theme_summary` in het schema blijft staan.** Niet voor "mooi-zo", maar voor drie harde redenen: (a) backfill-compat met alle pre-TH-013 rijen die nog die versie hebben, (b) graceful degradation bij Summarizer-failures zonder dat de theme-kaart kaal wordt, (c) regenerate-flow via `RegenerateMenu` moet nog steeds werken ook als de Summarizer een transient Anthropic-fout geeft — de Detector is cheaper en loopt vroeger in de pipeline, dus zijn output is bijna gratis "verzekering".

**Geen telemetry-kolom voor welke bron werd gebruikt.** Zou een DATA-requirement toevoegen voor iets dat nu niet gebruikt wordt. Als we later willen weten hoe vaak de fallback triggert, komt dat via `agent_runs.metadata.theme_summaries_missing` (EDGE-241) — event-based i.p.v. state-based.

### Prompt-aanpassingspunt in `summarizer.md`

De huidige prompt (`packages/ai/prompts/summarizer.md`) heeft vier output-secties: BRIEFING, KERNPUNTEN, DEELNEMERS, VERVOLGSTAPPEN. Sectie 2 (KERNPUNTEN) verwijst al naar een context-blok `GEÏDENTIFICEERDE THEMA'S` (regel 22-27) voor de optionele `[Themes:]` marker per kernpunt. Die context komt al binnen sinds TH-011. Wat ontbreekt is een instructie om die thema-context óók te gebruiken als driver voor een apart per-thema output-blok.

**Nieuwe sectie toevoegen als #5** (na VERVOLGSTAPPEN):

```markdown
5. PER-THEMA SAMENVATTINGEN — Voor elke entry in GEÏDENTIFICEERDE THEMA'S lever je één
   rijke samenvatting die beschrijft wat dit specifieke thema in deze meeting raakte.
   Zelfde diepgang als de hoofd-briefing en kernpunten, maar gefilterd op wat dit
   thema aanging — niet de hele meeting-inhoud opnieuw.

   PER THEMA GEEF JE:
   - themeId: de exacte UUID uit de catalogus (copy-paste, verzinnen wordt gestript).
   - briefing: 2-4 zinnen narratief over wat DEZE meeting specifiek over DIT thema besprak.
     Beschrijf de dynamiek, de positionering, het besluit — niet de onderwerp-context
     die toevallig het onderwerp was. Bij weinig raakpunten: kortere briefing is prima.
   - kernpunten: array van bullets die onder dit thema vallen. Categorie-labels mogen
     (**Besluit:**, **Signaal:**, etc.) maar GEEN project-prefix — die is in de
     meeting-wide kernpunten al gezet. Lege array is acceptabel als het thema in deze
     meeting geen discrete punten opleverde.
   - vervolgstappen: array van thema-relevante acties. Lege array als er geen zijn.

   DISCIPLINE:
   - Kopieer geen meeting-wide kernpunten 1-op-1 naar elk thema — dat vervuilt de theme-
     pages. Neem alleen wat over DIT thema gaat.
   - Voor relationele thema's (coaching, leertraject, governance): beschrijf de dynamiek
     en aanpak, niet het onderwerp dat toevallig besproken werd.
   - Bij twijfel of iets bij een thema hoort: weglaten. De meeting-wide kernpunten
     vangen het toch al op.

   VOORBEELD (thema "Ege's leertraject" in een meeting die voornamelijk over een
   AI-confidence-systeem ging):

   briefing: "Stef coachte Ege in diagnostisch denken rond Fleur's confidence-systeem.
   De focus lag op het isoleren van symptomen (fine-tuning vs threshold) en het
   vasthouden van de scope zonder af te dwalen naar zijpaden."
   kernpunten: ["Stef stuurt Ege aan op gefocuste diagnose.", "Ege neigt naar
   architectuur-ideeën als eerste stap; Stef bewaakt de werkwijze."]
   vervolgstappen: ["Ege experimenteert met voorbeeldgesprekken in system prompt."]
```

**Waarom deze plek in de prompt.** De Summarizer bouwt de meeting-wide kernpunten eerst, met `[Themes:]` markers waar relevant. Het per-thema blok komt dáárna in de output-volgorde omdat het een herwerking is van die punten per thema-lens. Volgorde in de prompt matcht de volgorde in de output-JSON (Anthropic's structured-output respecteert schema-volgorde). Zet de instructie achteraan zodat de agent eerst de kernpunten hardgemaakt heeft voor hij per thema gaat filteren.

**Geen wijziging aan BRIEFING / KERNPUNTEN / DEELNEMERS / VERVOLGSTAPPEN secties.** De bestaande `[Themes:]` marker-instructie blijft staan — die voedt `extraction_themes` (TH-011) en heeft een andere functie dan het nieuwe per-thema blok.

### Backfill-strategie

Twee paden, zelfde structuur als TH-011 maar aangepast op TH-013-scope:

1. **Batch-backfill** (aanbevolen). `scripts/batch-detect-themes.ts --force` over alle verified meetings met bestaande theme-matches. Het script gebruikt de bestaande regenerate-keten (Theme-Detector → Summarizer → link-themes met `replace: true`) die via FUNC-290..292 nu automatisch de rijke `theme_summaries` schrijft. Geen scriptwijziging nodig — de backfill-winst komt uit het bijgewerkte Summarizer-contract. Draai serieel of met beperkte concurrency (Sonnet 4.5 is de Summarizer, iets cheaper dan Sonnet 4.6, maar output-tokens groeien met theme_summaries — 5-10 parallel max). Kost-schatting: ~$0,05-0,10 extra per meeting bovenop de normale regenerate-kost × aantal meetings met theme-matches. Exacte getallen bepalen we bij deploy.

2. **Rolling regeneration.** Geen bulk; nieuwe meetings krijgen direct de rijke versie via de pipeline, oude meetings blijven hun 1-2 zins Detector-summary tonen tot een admin ze handmatig regenereert via `RegenerateMenu` op `/meetings/[id]` of `/review/[id]`. Mix-state tussen oude en nieuwe kwaliteit op theme detail pages tot alle meetings zijn doorgelopen. Voordeel: nul kosten bij deploy.

Keuze bij deploy. **Pad 1 is de default** mits de Anthropic-budgetruimte het toelaat — het belang van consistentie op theme pages weegt zwaarder dan de incrementele kost. Pad 2 is het terugval-pad als de budget-check rood wordt.

**Geen partial-backfill-pad.** Je kunt in principe `--force --limit=50` op de meest-bekeken themes runnen om de UX-pijn eerst daar weg te halen, maar dat vereist een theme-filter in het batch-script (nu alleen meeting-filter). Uit scope — niet de moeite waard voor de complexiteit, kies of pad 1 of pad 2.

**Verificatie na backfill.** Query `SELECT count(*) FROM meeting_themes WHERE summary IS NOT NULL AND summary LIKE '## Briefing%';` geeft direct het aantal rijen dat de nieuwe markdown-vorm heeft. Vergelijk met totaal niet-null rijen om de voortgang te tracken. Oude 1-2 zins Detector-output begint niet met `## Briefing` — scheidt de twee groepen cleanly.

## Bestanden om aan te raken

- [ ] `packages/ai/src/validations/summarizer.ts` — `SummarizerOutputSchema` uitbreiden met `theme_summaries` veld + UUID-refine op `themeId` (AI-240)
- [ ] `packages/ai/src/agents/summarizer.ts` — `formatThemeSummary()` renderer toevoegen (AI-242), caps in `runSummarizer()` post-validation (AI-243), `SUMMARIZER_PROMPT_VERSION` bump naar `"v2"` (AI-244), hallucination-strip voor onbekende themeIds (EDGE-240)
- [ ] `packages/ai/prompts/summarizer.md` — nieuwe sectie #5 **PER-THEMA SAMENVATTINGEN** na VERVOLGSTAPPEN, met discipline-regels + voorbeeld (AI-241)
- [ ] `packages/ai/prompts/theme-detector.md` — korte notitie dat `theme_summary` nu fallback is; agent-gedrag ongewijzigd (FUNC-293)
- [ ] `packages/ai/src/pipeline/steps/summarize.ts` — `SummarizeResult` interface krijgt `themeSummaries: Map<string, string>`; populatie via `formatThemeSummary()` per output-entry (FUNC-290)
- [ ] `packages/ai/src/pipeline/steps/link-themes.ts` — `LinkThemesStepInput` krijgt optionele `summarizerThemeSummaries?: Map<string, string>`; `meetingThemesToWrite[i].summary` past fallback-ketting toe (FUNC-291)
- [ ] `packages/ai/src/pipeline/gatekeeper-pipeline.ts` — Summarizer-resultaat doorgeven aan `runLinkThemesStep({ ..., summarizerThemeSummaries })` (FUNC-292)
- [ ] `apps/cockpit/src/app/(dashboard)/themes/[slug]/tabs/meetings-tab.tsx` — `<p>{m.summary}</p>` (regel 113) vervangen door markdown-renderer, collapsible bij >400 tekens (UI-340); XSS-veilige rendering (EDGE-243)
- [ ] Tests (nieuwe + updates):
  - [ ] Update: `packages/ai/__tests__/agents/summarizer.test.ts` — `theme_summaries` output-shape, per-theme caps (AI-243), hallucination-strip onbekende themeId (EDGE-240), lege-secties-weggelaten in `formatThemeSummary()`, prompt-version v2 in telemetry
  - [ ] Nieuw: `packages/ai/__tests__/pipeline/link-themes-theme-summary-fallback.test.ts` — Summarizer-map wint boven Detector (happy path), Detector wint bij lege map (EDGE-241), null bij beide leeg, multiple themes in één meeting krijgen juiste bron per thema
  - [ ] Update: `packages/ai/__tests__/pipeline/gatekeeper-pipeline.test.ts` — `summarizerThemeSummaries` bereikt `runLinkThemesStep`, mapping is themeId → rendered markdown
  - [ ] Update: `packages/ai/__tests__/pipeline/summarize.test.ts` (of equivalent) — `themeSummaries: Map` gevuld na successful run, leeg bij error-pad (non-null)
  - [ ] Update: `apps/cockpit/__tests__/app/themes-detail.test.tsx` — markdown-rendering van een `## Briefing` / `## Kernpunten` payload, fallback-rendering van een pre-TH-013 plain-text summary (EDGE-244), collapsible-toggle bij lange content, XSS-veiligheid met crafted input (EDGE-243)
- [ ] Documentatie:
  - [ ] `docs/dependency-graph.md` — automatische regeneratie via pre-commit hook
  - [ ] `sprints/done/TH-matrix.md` — TH-013 rij toevoegen na afronding
  - [ ] Geen `CLAUDE.md`-wijziging nodig: Summarizer staat al in de agents-lijst, prompt-version bumps zijn geen registry-event

## Acceptance criteria

- `npm run type-check` en `npm run lint` groen.
- `npm run test` in `packages/ai` + `apps/cockpit` groen.
- Geen DB-migration in deze sprint (`supabase db reset` ongewijzigd; DATA-240).
- Pipeline-draai op een test-meeting met ≥2 identified_themes: Summarizer-output bevat `theme_summaries` array met één entry per identified_theme. `agent_runs` rij voor de Summarizer heeft `prompt_version='v2'`.
- DB-check na pipeline: `SELECT summary FROM meeting_themes WHERE meeting_id = '...';` → alle rijen met identified-source bevatten markdown die begint met `## Briefing`, gevolgd door `## Kernpunten` (en optioneel `## Vervolgstappen` als de array niet leeg was).
- Fallback-keten werkt: mock Summarizer die `theme_summaries: []` teruggeeft → `meeting_themes.summary` wordt gevuld met Detector's 1-2 zins `theme_summary` (EDGE-241). Mock Summarizer met onbekende themeId → entry gestript, console.warn gelogd (EDGE-240), fallback werkt per thema onafhankelijk.
- Caps werken: synthetische meeting met 8 identified_themes → `theme_summaries.length === 6` na post-validatie (AI-243). Thema met 15 kernpunten → truncate naar 10. Console.warns loggen met `meeting_id` + `themeId`.
- Theme detail page `/themes/[slug]`: meeting-kaarten met nieuwe markdown-`summary` renderen als gestructureerde secties (Briefing / Kernpunten / Vervolgstappen). Lange content (>400 tekens) inklapbaar via `<details>`.
- Backfill-compat: meeting-kaart met pre-TH-013 plain-text `summary` (1-2 zinnen Detector-output) rendert correct als paragraph zonder layout-breuk (EDGE-244).
- XSS-veiligheid: `meeting_themes.summary` met ingeslepen `<script>` / `<img onerror>` / `javascript:` in markdown-content wordt inert gerenderd (EDGE-243). Geen `dangerouslySetInnerHTML` in het renderpad.
- Regeneration via `RegenerateMenu` op `/meetings/[id]`: bestaande `meeting_themes.summary` wordt vervangen door de nieuwe markdown-vorm zonder errors. Theme-match-rejections blijven respected (TH-011 FUNC-274).
- Backfill-query `SELECT count(*) FROM meeting_themes WHERE summary LIKE '## Briefing%';` geeft > 0 na eerste geregenereerde meeting, en groeit consistent bij `--force` runs.
- Geen regressie: `meetings.summary` (meeting-wide hoofd-summary) identiek aan pre-TH-013 output voor dezelfde test-meeting. `deelnemers` + `vervolgstappen` arrays in Summarizer-output ongewijzigd (schema-breaking validation).
- Kost-check: token-budget voor Summarizer-call op een meeting met 4 identified_themes blijft binnen 1,5× van pre-TH-013 (verwachte groei ~20-30% door extra output-tokens, niet meer).
