# Micro Sprint TH-011: Theme-Detector — extract-time theme scoping

## Doel

Van **post-hoc tagging** (TH-010 ThemeTagger) naar **extract-time scoping**. Eén nieuwe agent — **Theme-Detector** — draait direct na de Gatekeeper en vóór de Summarizer, identificeert welke verified themes in deze meeting daadwerkelijk spelen (analoog aan hoe de Gatekeeper projecten identificeert) én stelt nieuwe themes voor als hij substantiële signalen ziet die in geen enkele verified theme passen. De Summarizer krijgt `identified_themes` als context en annoteert per kernpunt/vervolgstap optioneel een `[Themes: X, Y]` marker wanneer de inhoud het specifieke project overstijgt. Een nieuwe pipeline-step `link-themes.ts` resolvet die annotaties naar `theme_id`'s, schrijft `meeting_themes` + `extraction_themes` weg, en creëert emerging themes uit `proposed_themes[]`.

**Waarom deze verschuiving.** De huidige ThemeTagger ziet al-geëxtraheerde, theme-agnostische content en probeert achteraf te bepalen bij welk thema iets hoort. Dat is onvermijdelijk onnauwkeurig: een meeting die drie thema's raakt krijgt drie `meeting_themes` rijen die allemaal naar dezelfde brede extractie-set wijzen, met veel ruis per thema. Extract-time scoping — het mechanisme dat projecten al via Gatekeeper + Summarizer-prefix + `pipeline/tagger.ts` gebruiken — lost dit op: elke extractie draagt bij aan het thema waar hij over gaat, niet bij elke thema die de meeting in totaal raakt. Theme pages worden daardoor zuiver en relevant.

**Tegelijk:** TH-010 code (junction `extraction_themes`, `meeting_themes.summary` kolom, `/dev/tagger` harness) blijft bestaan en is direct herbruikbaar. Wat verhuist is de **runner**: `agents/theme-tagger.ts` + `pipeline/steps/tag-themes.ts` + `prompts/theme-tagger.md` worden vervangen door `agents/theme-detector.ts` + `pipeline/steps/link-themes.ts` + `prompts/theme-detector.md`. De harness wordt hernoemd naar `/dev/detector` en adresseert het nieuwe contract.

**Plus in scope van deze sprint:**

- **Substantialiteitsregel** — Theme-Detector stelt matches alleen voor als er (a) minstens 2 gerelateerde kernpunten/extracties zijn OF (b) ≥100 woorden van substantiële discussie. Losse vermeldingen creëren geen theme-link. Adresseert de "vermelding vs substantiële discussie"-blinde vlek uit het onderzoek.
- **Niveau 1 party-type split** — de theme detail page toont meetings gegroepeerd op `meetings.party_type` (internal / external / mixed). Zo zie je in één oogopslag wat wij intern bespreken over een thema, wat klanten erover zeggen, en welke mixed sessies beide stemmen combineren. Géén nieuwe kolommen, puur query + UI.
- **Emerging-in-meeting-review** — Theme-Detector's `proposed_themes[]` landen als `meeting_themes`-links naar hun origin-meeting, met status `emerging` op de theme-row. De reviewer bevestigt of wijst af ínside de meeting-review (nieuw tabblad _"Voorgestelde thema's"_), niet in een aparte queue. `EmergingThemesSection` op `/review` blijft bestaan als bulk-overzicht maar wordt lightweight.

**Uit scope van deze sprint** (zie TH-012): wekelijkse merge-cron, saturation-metric dashboard, reliability re-run delta, intra-speaker niveau 2/3 attributie.

Eerste tastbare resultaat: je opent `/themes/mcp-capabilities`, ziet drie secties (_Wij intern_ · _Klanten_ · _Gemengd_). Per meeting-kaart is de evidence-quote zuiverder en de gekoppelde extractions zijn gefilterd op wat over dít thema ging — niet alle decisions van de meeting. Nieuwe meetings krijgen deze rijkere laag direct via de pipeline; backfill van bestaande meetings gebeurt via `scripts/batch-detect-themes.ts --force`.

## Requirements

| ID       | Beschrijving                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI-230   | Nieuwe agent `packages/ai/src/agents/theme-detector.ts` — Sonnet 4.6, input: meeting summary (uit Fireflies/pre-processing) + identified_projects + participants + title + meeting_type + verified themes catalog met matching_guides + negative_examples                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| AI-231   | Zod-schema `ThemeDetectorOutputSchema` in `packages/ai/src/validations/theme-detector.ts`: `{ identified_themes: Array<{ themeId, confidence: 'medium'\|'high', relevance_quote: string, theme_summary: string, substantialityEvidence: { extractionCount?: number, wordCount?: number, reason: string } }>, proposed_themes: Array<{ name, description, matching_guide, emoji, rationale, evidence_quote }> }`. **`theme_summary`** = 1-2 zinnen die beschrijven wát deze meeting over het thema besprak (analoog aan TH-010's `themeSummary` in `ThemeTaggerOutputSchema`) — wordt rechtstreeks weggeschreven naar `meeting_themes.summary` door `link-themes.ts`. Pas wanneer `summary` genereren per identified_theme onhaalbaar blijkt in de Detector-prompt, fall back op JS-composer uit de gelinkte extractions — dat besluit hoort in het agent-ontwerp, niet in link-themes. |
| AI-232   | Prompt `packages/ai/prompts/theme-detector.md`: expliciete instructie _"Match een thema alléén als de discussie los van specifieke projecten relevant is voor andere contexten. Twijfel? Geen match. Losse vermeldingen (minder dan 2 kernpunten of 100 woorden over het onderwerp) zijn géén match."_ Plus voorbeelden voor grensgevallen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| AI-233   | Post-Zod validatie in `runThemeDetector()`: (a) filter `identified_themes` waarvan `themeId` niet in de meegestuurde catalogus staat (hallucinatie-strip, console.warn), (b) cap `MATCHES_HARD_CAP = 6` per meeting op `identified_themes.length`, (c) cap `PROPOSALS_HARD_CAP = 3` per meeting op `proposed_themes.length` — **de twee caps gelden onafhankelijk**, zodat een meeting in het worst-case maximum 6 identifieds + 3 proposals = 9 links kan opleveren. Nooit crashen.                                                                                                                                                                                                                                                                                                                                                                                                   |
| AI-234   | Model-constanten + `THEME_DETECTOR_PROMPT_VERSION = "v1"` export voor telemetry (patroon uit Risk Specialist: `RISK_SPECIALIST_PROMPT_VERSION`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| AI-235   | Summarizer prompt-uitbreiding in `packages/ai/prompts/summarizer.md`: instrueer Summarizer om bij substantiële kernpunten/vervolgstappen een `[Themes: Name1, Name2]` marker toe te voegen achter (óf na) de `[ProjectName]` prefix, wanneer de inhoud los van het project ook relevant is voor andere contexten. Input aan Summarizer krijgt nieuwe `identified_themes: {name, description}[]` context-sectie (analoog aan `entityContext` met projecten).                                                                                                                                                                                                                                                                                                                                                                                                                            |
| AI-236   | `identified_themes` wordt óók doorgegeven aan RiskSpecialist als context (analoog aan `identified_projects` — zie `risk-specialist.ts:52`), zodat zijn output vrijwillig `[Themes: X]` in extraction-content kan annoteren waar van toepassing. Niet verplicht — de extractor blijft theme-agnostisch, de annotatie is een hint voor de linker-step. **NeedsScanner wordt in deze sprint bewust níét aangepast**: de scanner draait niet in de hoofdpipeline (`pipeline/scan-needs.ts`, post-verification trigger) en heeft geen `identified_projects` param. Koppelen vereist een apart ontwerp — zie Out of scope.                                                                                                                                                                                                                                                                   |
| FUNC-270 | Nieuwe pipeline-step `packages/ai/src/pipeline/steps/link-themes.ts` — draait na alle extractors, vóór embed. Input: meeting_id, identified_themes + proposed_themes (van Theme-Detector), alle saved extractions, Summarizer output. Output: `meeting_themes` + `extraction_themes` rijen + emerging theme-rows voor proposals                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| FUNC-271 | `link-themes.ts` resolvet per extraction welke themes bij hem horen: (1) parse `[Themes: X, Y]` annotatie in `extraction.content` of in Summarizer-kernpunten-die-deze-extraction-dragen, (2) resolve naam → theme_id via identified_themes match + DB-fallback (patroon uit `pipeline/tagger.ts` maar voor theme i.p.v. project), (3) fallback-regel: als een extraction géén annotatie heeft maar de meeting had wél identified_themes, match dan via substring van extraction.content tegen theme.matching_guide (cheap, no LLM). Ambiguous → geen link                                                                                                                                                                                                                                                                                                                             |
| FUNC-272 | `link-themes.ts` schrijft per identified_theme één `meeting_themes` rij weg: `meeting_id`, `theme_id`, `confidence`, `evidence_quote` (= `relevance_quote` uit detector), `summary` (= `theme_summary` uit detector, zie AI-231). Voor emerging proposals: maakt theme-row met `status='emerging'` + `origin_meeting_id` (DATA-232), plus meeting_themes-link met confidence `medium` en `summary` afgeleid uit `proposed_themes[].rationale`                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| FUNC-273 | Volgorde van wegschrijven in `link-themes.ts`: (a) clear bestaande `meeting_themes` + `extraction_themes` voor deze meeting indien `replace=true` — hergebruik `clearMeetingThemes` + `clearExtractionThemesForMeeting` uit TH-010, (b) upsert proposals → nieuwe theme-rows met `status='emerging'`, (c) insert `meeting_themes` rijen (identified + emerging), (d) insert `extraction_themes` rijen, (e) recalc theme stats via bestaande `recalculate_theme_stats()` RPC                                                                                                                                                                                                                                                                                                                                                                                                            |
| FUNC-274 | `link-themes.ts` respecteert bestaande `theme_match_rejections`: als (meeting_id, theme_id) is gerejected door een admin, sla deze match over bij het insert-pad. Geen nieuwe rejection nodig — tabel en helper bestaan al (zie TH-006, `listThemeMatchRejections`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| FUNC-275 | Pipeline-orchestrator `packages/ai/src/pipeline/gatekeeper-pipeline.ts` — nieuwe volgorde: Gatekeeper → **Theme-Detector** (nieuwe stap, serieel na Gatekeeper, blocking zodat Summarizer + RiskSpecialist zijn output als context krijgen) → Summarizer (met `identified_themes` in context) + RiskSpecialist (parallel, beide krijgen `identified_themes`) → `pipeline/tagger.ts` (rule-based project-resolve, ongewijzigd) → `await riskSpecialistPromise` (zelfde plek als nu) → **`link-themes.ts`** (vervangt oude `runTagThemesStep` positie, parallel met embed) → embed. NeedsScanner blijft buiten de main pipeline (aparte flow, zie AI-236).                                                                                                                                                                                                                               |
| FUNC-276 | `link-themes.ts` skipt net als de oude stap wanneer `relevance_score < 0.4` — consistent met `THEME_TAGGER_MIN_RELEVANCE`. Hernoem constante naar `THEME_DETECTOR_MIN_RELEVANCE` (zelfde waarde) voor naam-consistentie                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| DATA-230 | Geen nieuwe tabellen of kolommen. `meeting_themes` (inclusief TH-010's `summary` kolom), `extraction_themes` junction en bestaande `themes.status` enum (`emerging`/`verified`/`archived`) dekken alles. Alleen `THEME_TAGGER_MIN_RELEVANCE` → `THEME_DETECTOR_MIN_RELEVANCE` hernoeming (TS-constante, geen DB-migratie)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| DATA-231 | ~~`themes.structured_content` toevoegen~~ — **geverifieerd aanwezig** in `packages/database/src/types/database.ts:1447` (dus ook in productie). Geen migratie, geen deliverable in deze sprint. Requirement bewust behouden in het register zodat een toekomstige ThemeNarrator-sprint niet per ongeluk de kolom dubbel aanbrengt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| FUNC-277 | Deprecate TH-010 runner: verwijder `packages/ai/src/pipeline/steps/tag-themes.ts` + `packages/ai/src/agents/theme-tagger.ts` + `packages/ai/prompts/theme-tagger.md` + `packages/ai/src/validations/theme-tagger.ts`. Alle imports omzetten naar de Theme-Detector equivalenten. Behoud `extraction_themes` junction + `meeting_themes.summary` kolom + mutations (`linkExtractionsToThemes`, `clearExtractionThemesForMeeting`) — die zijn agent-agnostisch.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| FUNC-278 | Script `scripts/batch-tag-themes.ts` hernoemd naar `scripts/batch-detect-themes.ts` en aangepast op het nieuwe contract (roept `link-themes.ts` aan i.p.v. `tag-themes.ts`, draait dus ook de Theme-Detector + Summarizer voor elke meeting — force vervangt bestaande matches volledig). CLI-interface blijft identiek (`--limit`, `--force`, `--concurrency`). NPM-script `detect-themes-batch` **toevoegen** aan root `package.json` (er is momenteel géén `tag-themes-batch` script — aanroep gebeurt nu via `npx tsx scripts/batch-tag-themes.ts`; deze sprint formaliseert 'm als npm-script).                                                                                                                                                                                                                                                                                   |
| FUNC-279 | `/dev/tagger` harness wordt hernoemd naar `/dev/detector`. Route, component-bestanden, action-file en query-file vernoemen: `apps/cockpit/src/app/(dashboard)/dev/detector/`, `apps/cockpit/src/actions/dev-detector.ts`, `packages/database/src/queries/dev-detector.ts`. Oude `/dev/tagger` route redirect naar `/dev/detector` (1 sprint, dan verwijderen). Internals aangepast op Theme-Detector contract: input-panel toont identified_projects als hint, output-panel toont identified_themes + proposed_themes separaat, diff-panel vergelijkt met DB                                                                                                                                                                                                                                                                                                                           |
| UI-330   | Meeting-review detail (`apps/cockpit/src/components/review/review-detail.tsx`) — nieuw tabblad **Voorgestelde thema's** in het rechterpaneel, naast Risks en Followups. Toont emerging-themes waarvan de origin-meeting deze meeting is (query: `themes WHERE status='emerging' AND origin_meeting_id = ?` — origin-meeting tracking vereist nieuwe kolom, zie DATA-232). Per proposal: emoji + naam + description + matching_guide + rationale + evidence_quote. Acties: **Bevestigen** (status → `verified`), **Afwijzen** (soft-delete of `status='archived'`)                                                                                                                                                                                                                                                                                                                      |
| DATA-232 | Kolom `themes.origin_meeting_id uuid nullable` + FK naar `meetings(id) ON DELETE SET NULL`. Wordt gezet door `link-themes.ts` wanneer de Theme-Detector een proposal voorstelt. Laat zien welke meeting een emerging theme heeft aangebracht. Index op `origin_meeting_id` voor review-queries                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| FUNC-280 | Server Action `confirmThemeProposalAction({ themeId })` en `rejectThemeProposalAction({ themeId, reason? })` in `apps/cockpit/src/actions/themes.ts`. Confirm: set `status='verified'`, keep meeting_themes link. Reject: set `status='archived'`, delete meeting_themes link. Beide acties revalidaten **álle** proposal-surfaces zodat bulk-tab en per-meeting-tab synchroon blijven: `/review` (bulk-sectie `EmergingThemesSection`, UI-331) + `/review/${origin_meeting_id}` (per-meeting-tab, UI-330) + `/themes` (dashboard-lijst bij confirm). Admin-only (hergebruik `requireAdminInAction`)                                                                                                                                                                                                                                                                                   |
| UI-331   | `EmergingThemesSection` op `/review` (bestaand, TH-007) blijft behouden als lightweight bulk-overzicht. Geen gedragswijziging — toont bij admin-login alle themes met status `emerging`, met link naar de origin-meeting review. Dubbele surface is acceptabel: bulk-queue voor snelle scan, per-meeting-tab voor review-in-context                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| UI-332   | Theme detail page `/themes/[slug]` Meetings-tab — nieuw: groepering op `meetings.party_type` in drie secties onder elkaar: **Wij intern** (party_type = internal), **Klanten** (external), **Gemengd** (mixed). Lege secties krijgen geen header. Binnen elke sectie: huidige meeting-cards sortering (nieuwste eerst) blijft. Geen nieuwe queries — `getThemeMeetings` JOIN met `meetings.party_type` toevoegen, groepering in de render-laag                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| SEC-230  | `/dev/detector` route + `runDevDetectorAction` checken admin-whitelist (identiek aan TH-010 SEC-220). Non-admins 403. `confirmThemeProposalAction` + `rejectThemeProposalAction` admin-only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| EDGE-230 | Meeting met 0 identified_themes én 0 proposals: `link-themes.ts` doet niets (geen inserts, geen errors, keert met success:true terug). Theme detail page toont deze meeting niet — consistent met huidige gedrag voor meetings zonder theme-matches                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| EDGE-231 | Theme-Detector retourneert een identified_theme waarvan de theme_id ondertussen is gearchiveerd tussen detect-tijd en link-tijd (zeer korte race): `link-themes.ts` slaat de match over zonder te crashen. Log een warning met `meeting_id` + `theme_id`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| EDGE-232 | Proposal met naam die exact matched een bestaande verified theme (case-insensitive): upsert-logica in `link-themes.ts` herkent dit en linkt naar de bestaande theme in plaats van een duplicaat aan te maken. Behoud origin_meeting_id van het origineel                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| EDGE-233 | Backfill-compat: bestaande `meeting_themes` rijen die door de oude ThemeTagger zijn geschreven blijven respectabel (niet verwijderen). De `scripts/batch-detect-themes.ts --force` overschrijft ze één voor één. Zonder backfill draait de pipeline voor nieuwe meetings direct met het nieuwe gedrag; oude meetings blijven eruitzien zoals vóór TH-011 tot ze worden geregenereerd                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| EDGE-234 | Substantialiteitsregel falsely-negatief: als de Theme-Detector een duidelijk relevant thema mist omdat het net onder de threshold zit, komt het in de volgende iteratie vanzelf terug zodra er meer data is. Niet catastrofaal; accepteren in V1. Monitoring: `identified_themes.length` per meeting als telemetry in `agent_runs`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| FUNC-281 | Dry-run parameter `persist?: boolean` (default `true`) op `runLinkThemesStep()` in `packages/ai/src/pipeline/steps/link-themes.ts`. Bij `persist=false` voert de step alle berekeningen uit (parse annotaties, resolve theme_ids, bereken to-be-written rijen, pas rejection-filter toe) maar skipt álle DB-writes. Retourneert in plaats daarvan een `PreviewResult`: `{ meetingThemesToWrite[], extractionThemesToWrite[], proposalsToCreate[], skippedDueToRejection[] }`                                                                                                                                                                                                                                                                                                                                                                                                           |
| FUNC-282 | Server Action `runDevDetectorAction` uitbreiden met optionele mode `"full-pipeline"`. Standaard-mode (`"detector-only"`) gedraagt zich zoals TH-010 — alleen Theme-Detector draait. In `"full-pipeline"` mode: (a) Theme-Detector, (b) **`runSummarizer` direct** (agent-level, import uit `@repo/ai/agents/summarizer`) met verse `identified_themes` context — **níét** `runSummarizeStep`, want die roept `updateMeetingSummary` → DB-write (zie `packages/ai/src/pipeline/steps/summarize.ts:33`). De harness leest de agent-output in memory en geeft die aan (c), (c) `runLinkThemesStep({ persist: false })` met fresh Detector + in-memory Summarizer output, (d) retourneer samengestelde `DevFullPipelinePreview` met alle tussenstappen. Tests moeten hard verifiëren: `updateMeetingSummary` wordt níét aangeroepen tijdens full-pipeline preview.                         |
| UI-333   | `/dev/detector` krijgt tweede primaire knop **"Preview Full Pipeline"** naast de bestaande **"Run Detector"**. Visueel onderscheid (primary/secondary of iconen), beide tonen spinner tijdens execution. Bij full-pipeline run: alle 4 preview-panelen hieronder renderen; bij detector-only run: alleen het detector-panel                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| UI-334   | Preview-UI in `/dev/detector` na full-pipeline run, vier panelen onder elkaar: **(A) Detector output** — bestaand (identified_themes + proposed_themes + substantialityEvidence). **(B) Summarizer preview** — kernpunten[] + vervolgstappen[] gerenderd als readable markdown, `[Themes: X, Y]` markers gehighlight (bv. gekleurd pill achter de tekst), side-by-side met huidige DB-`summary`. **(C) Link-themes preview** — tabel met to-be-written `meeting_themes` (theme-naam, evidence_quote, summary, confidence) + collapsible tabel met `extraction_themes` (extractie-content preview, gelinkte theme-namen, confidence). **(D) Full diff** — uitbreiding van huidige diff-panel met: welke `meeting_themes` rijen nieuw/verdwenen/ongewijzigd, welke `extraction_themes` rijen nieuw/verdwenen/ongewijzigd, welke proposals zouden worden gecreëerd als emerging theme     |
| UI-335   | Preview-panelen tonen duidelijke "DRY-RUN — GEEN DB WRITES" banner bovenaan zolang full-pipeline output gerendered wordt. Plus: refresh-knop die de preview leegmaakt. Voorkomt dat een admin denkt dat writes hebben plaatsgevonden                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| EDGE-235 | Full-pipeline run faalt halverwege (bv. Summarizer-error): retourneer partial-preview — detector-output is altijd zichtbaar, downstream-panelen tonen error-state met oorzaak. Geen crash. Consistent met bestaande error-handling in de pipeline                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| FUNC-283 | `regenerateMeetingThemesAction` in `apps/cockpit/src/actions/themes.ts:211` (aangeroepen door `RegenerateMenu` op `/meetings/[id]` én `/review/[id]`) moet mee in deze migratie. **V1-keuze voor deze sprint:** de action draait de volle keten — Theme-Detector → Summarizer (re-run, schrijft opnieuw `meetings.summary` weg — geen dry-run) → `runLinkThemesStep({ replace: true, persist: true })`. Dat is duurder dan de oude ThemeTagger-only regenerate, maar consistent: zonder verse Detector+Summarizer zijn er geen `[Themes:]` annotaties om te linken. Alternatief (annotation-only re-link op bestaande summary) bewust **out of scope** — kan later als FUNC-toevoeging als het praktisch knelt. Revalidate paths ongewijzigd (`/` + `/meetings/${id}`); voeg `/review/${id}` toe wanneer de meeting nog in draft staat.                                                |
| FUNC-284 | Pipeline-volgorde subtiliteit: de huidige `gatekeeper-pipeline.ts:274-277` await `riskSpecialistPromise` **vóór** de ThemeTagger runt, zodat risk-extractions al zijn weggeschreven voordat de tagger ze ophaalt. In TH-011 heeft `link-themes.ts` dezelfde afhankelijkheid (hij parset `[Themes:]` annotaties uit extraction.content) → behoud de await op dezelfde positie. Summarizer writes moeten óók klaar zijn voor de extraction-annotatie-pass, dus de await-volgorde = `await summarizePromise → await riskSpecialistPromise → runTagAndSegment → link-themes`.                                                                                                                                                                                                                                                                                                              |

## Bronverwijzingen

- PRD: `docs/specs/prd-themes.md` → §2 (intent: themes zijn emergent cross-cutting lenzen) + §4 (scoping op extract-time)
- Vision: `docs/specs/vision-ai-native-architecture.md` — Cockpit-quadrant (Curator/Analyst agents), Theme-as-a-lens patroon
- Code: `packages/ai/src/agents/gatekeeper.ts` — patroon voor agent met `identified_projects[]`, vertalen naar `identified_themes[]`
- Code: `packages/ai/src/agents/risk-specialist.ts` — patroon voor Sonnet 4.6 agent met `withAgentRun`, telemetry, prompt-version export
- Code: `packages/ai/src/agents/summarizer.ts` — prompt-uitbreiding punt voor `[Themes:]` annotatie, hergebruik `entityContext`-pattern
- Code: `packages/ai/src/pipeline/gatekeeper-pipeline.ts:82-319` — volgorde-aanpassing: Gatekeeper → Theme-Detector → Summarizer
- Code: `packages/ai/src/pipeline/steps/tag-themes.ts` — te vervangen door `link-themes.ts`, hergebruik mutations
- Code: `packages/ai/src/pipeline/tagger.ts:64-127` — `parsePrefix` + `resolvePrefixProject` als blueprint voor `parseThemesAnnotation` + `resolveThemeRefs`
- Code: `packages/database/src/mutations/extraction-themes.ts` — bestaande `linkExtractionsToThemes` + `clearExtractionThemesForMeeting` hergebruiken
- Code: `packages/database/src/mutations/meeting-themes.ts` — bestaande `linkMeetingToThemes` hergebruiken
- Code: `apps/cockpit/src/components/review/review-detail.tsx` — tabs-structuur voor nieuw "Voorgestelde thema's" tabblad
- Code: `apps/cockpit/src/components/themes/emerging-themes-section.tsx` + `theme-approval-card.tsx` — bestaande approval-UI hergebruiken in meeting-review tabblad
- Code: `apps/cockpit/src/app/(dashboard)/dev/tagger/*` — harness-bestanden te hernoemen + contract te updaten
- Referentie: research-sessie (deze thread) — Braun & Clarke thematic analysis + substantialiteit + niveau 1 party-type split

## Context

### Waarom extract-time i.p.v. post-hoc — de kernbeslissing

De TH-010 ThemeTagger draait nu aan het einde van de pipeline, ziet alle al-geëxtraheerde content en probeert die te clusteren naar themes. Dit patroon heeft twee fundamentele beperkingen die we in TH-011 oplossen:

1. **Onzuiverheid per theme.** Een meeting die drie themes raakt ("MCP Capabilities", "AI-Native Architecture", "Hiring") genereert 3 `meeting_themes` rijen. Elk van die rijen suggereert dat de hele meeting over dat thema gaat. De theme detail page toont dan effectief dezelfde meeting drie keer, met drie evidence-quotes, maar de reviewer kan aan de quote niet zien welk deel van de extractions er daadwerkelijk bij hoort. TH-010 loste dit deels op met `extraction_themes`, maar de Tagger kopieert nu vaak dezelfde extractie naar meerdere themes omdat hij alle matches per meeting ziet. Extract-time scoping daarentegen bepaalt per kernpunt/extractie waar het thematisch thuishoort, niet achteraf over het totaal.
2. **Projectpatroon werkt al.** Gatekeeper identificeert projecten, Summarizer gebruikt exact die projectnamen als prefix, `pipeline/tagger.ts` parset de prefix en resolvet naar UUID. Extractions krijgen daardoor hun `project_id` op extract-time en zijn scherp gescoped. We hebben dit patroon alleen nog niet voor themes toegepast. TH-011 sluit die cirkel.

### Pipeline-volgorde — exact

**Nu (post-TH-010):**

```
Gatekeeper (Haiku)
  → Summarizer (Sonnet) — parallel met RiskSpecialist
  → pipeline/tagger.ts (rule-based, project-resolve)
  → RiskSpecialist + NeedsScanner + others
  → ThemeTagger (post-hoc, scant alle extractions)
  → embed
```

**Na TH-011:**

```
Gatekeeper (Haiku)
  → Theme-Detector (Sonnet 4.6, nieuw) — serieel, briefje aan Summarizer
  → Summarizer (Sonnet) + RiskSpecialist (parallel, beide krijgen identified_themes)
  → pipeline/tagger.ts (rule-based, project-resolve, ongewijzigd)
  → NeedsScanner + overige extractors (krijgen identified_themes als context)
  → link-themes.ts (NIEUW, vervangt tag-themes.ts positie) — parse annotaties, resolve, insert
  → embed
```

De Theme-Detector zit bewust **serieel** na Gatekeeper: hij heeft `identified_projects` nodig als context (om beter te kunnen oordelen of iets project-specifiek is vs cross-cutting), en zijn output moet beschikbaar zijn als input voor Summarizer + RiskSpecialist. Parallel draaien zou de data-flow breken.

### Substantialiteitsregel — waarom en hoe

Het onderzoek naar LLM thematic analysis waarschuwt expliciet voor over-segmentation: LLMs neigen naar "elk onderwerp is een thema". In TH-010 zagen we dit al: de Tagger trok soms een theme-link op een enkele losse vermelding. Dat vervuilt theme pages met meetings waar het thema eigenlijk niet substantieel besproken is.

De Theme-Detector krijgt in zijn prompt expliciet:

> Match een thema alléén als er minstens 2 kernpunten/extracties over dit onderwerp gaan, OF als er minimaal 100 woorden van substantiële discussie aan gewijd zijn. Een losse vermelding ("we zouden ooit eens naar MCP moeten kijken") is géén match. Twijfel? Geen match — de review-gate vangt missers op.

De `substantialityEvidence` in de output-schema forceert de agent om zijn keuze te onderbouwen (`extractionCount` of `wordCount` of `reason`). Dit is zowel een kwaliteitsanker als een debug-signaal voor `/dev/detector`.

### Summarizer annotatie-contract — exact

**Voor (huidige `[ProjectName]` prefix):**

```
### [JAP Cockpit] Scope-discussie
- **Besluit:** Portal MVP voor eind mei live
- **Behoefte:** meer duidelijkheid over wat wel/niet in scope is
```

**Na (optionele `[Themes:]` marker toegevoegd):**

```
### [JAP Cockpit] [Themes: MCP Capabilities] Scope-discussie
- **Besluit:** Portal MVP voor eind mei live
- **Behoefte:** meer duidelijkheid over wat wel/niet in scope is [Themes: Delivery Risk]
```

De `[Themes:]` marker is **optioneel**: Summarizer laat hem weg als de inhoud volledig project-specifiek is. Meerdere themes gescheiden door comma's. Onbekende naam → parser laat de string staan, link-themes.ts strippt 'm in de fallback-pass. Volgorde tussen `[ProjectName]` en `[Themes:]` is vrij; parser zoekt beide tokens onafhankelijk.

### Niveau 1 party-type split — implementatie

`getThemeMeetings(themeId)` retourneert nu een platte lijst. Uitbreiding: JOIN met `meetings.party_type`, en de render-laag op `/themes/[slug]` groepeert de resultaat-array in drie secties:

```tsx
const { internal, external, mixed } = groupBy(meetings, (m) => m.party_type ?? "unknown");
return (
  <>
    {internal.length > 0 && <Section title="Wij intern" meetings={internal} />}
    {external.length > 0 && <Section title="Klanten" meetings={external} />}
    {mixed.length > 0 && <Section title="Gemengd" meetings={mixed} />}
  </>
);
```

Geen DB-migratie, geen nieuwe query. Puur een JOIN-uitbreiding + render-groepering. Label-texts vaststaand in V1; niveau 2/3 (intra-speaker, rol-gebaseerd) is TH-012+.

### Review-UI — waar landt het tabblad

`review-detail.tsx:65-257` rendert in het rechterpaneel een Tabs-component. Nu: `Risks` + `Followups`. Toevoeging: derde tab `Voorgestelde thema's` met badge voor het aantal proposals voor deze meeting.

```tsx
<Tabs>
  <TabsList>
    <TabsTrigger value="risks">Risks ({risks.length})</TabsTrigger>
    <TabsTrigger value="followups">Followups ({followups.length})</TabsTrigger>
    <TabsTrigger value="themes">
      Voorgestelde thema's {proposals.length > 0 && <Badge>{proposals.length}</Badge>}
    </TabsTrigger>
  </TabsList>
  ...
</Tabs>
```

Query: `SELECT * FROM themes WHERE status='emerging' AND origin_meeting_id = ?`. Per proposal een kaart met naam + emoji + matching_guide + evidence_quote + twee knoppen. Hergebruik `ThemeApprovalCard` (bestaand, TH-006) — past direct, misschien een kleine prop-uitbreiding voor `context='meeting-review'` vs `context='bulk-review'`.

**Auto-approve vangnet.** Als de meeting auto-approved wordt (niet nu, maar mogelijk in V3), gaan theme-proposals niet automatisch mee. De server-action `confirmThemeProposalAction` vereist expliciet een admin + kan niet via meeting-approve cascaden.

### Waarom blijft `/dev/detector` bestaan

De harness is cruciaal voor prompt-tuning. Nu de Theme-Detector een belangrijker agent wordt (hij bepaalt wat wel/niet een theme-match wordt), is snelle iteratie op prompt + matching_guides essentieel. `/dev/detector` laat admins één meeting selecteren, de detector draaien in dry-run modus, en het verschil met de huidige DB-state zien. Zelfde patroon als `/dev/tagger` (TH-010 UI-320/321), alleen nu geënt op het nieuwe contract.

Contract-delta in de harness:

- Input-panel toont extra: `identified_projects` (van Gatekeeper), meeting-type, party-type — als hint waarom de detector bepaalde keuzes maakt
- Output-panel splitst in twee kolommen: `identified_themes[]` (met substantialityEvidence) links, `proposed_themes[]` rechts
- Diff-panel vergelijkt fresh output met huidige DB — nieuwe/verdwenen/ongewijzigde matches
- Substantialiteits-transparantie: per match zichtbaar wat de agent als onderbouwing teruggaf (helpt bij prompt-tuning)

### End-to-end verificatie via `/dev/detector` full-pipeline mode

De detector-only modus volstaat voor prompt-tuning van de Theme-Detector zelf, maar de kernbelofte van TH-011 — _extract-time scoping levert zuivere theme pages_ — is pas verifieerbaar als je het hele ketting van Theme-Detector → Summarizer → link-themes kunt volgen zonder naar productie te schrijven. De full-pipeline modus brengt die verificatie binnen handbereik: één klik, alle tussenstappen zichtbaar, geen DB-writes.

**Wat je per paneel moet kunnen concluderen:**

- **Panel A (Detector)**: identificeert de agent de juiste themes? Zijn de substantialityEvidence-onderbouwingen plausibel? Worden de juiste proposals voorgesteld voor wat écht nieuw is?
- **Panel B (Summarizer)**: zet de Summarizer de `[Themes:]` markers op de juiste kernpunten — dus niet op alles (over-annotatie) en niet vergeten bij evident cross-cutting content? Markers matchen met Detector output?
- **Panel C (link-themes)**: resolvet de parser de annotaties correct naar theme_id's? Schrijft hij de juiste meeting_themes + extraction_themes rijen? Respecteert hij bestaande rejections?
- **Panel D (diff)**: als je nu écht zou runnen, wat verandert er? Meer rijen, minder rijen, andere confidences?

Dit geeft de admin — vooral Stef bij eerste deploy — de tools om TH-011 op een real-world meeting te laten zien en te valideren vóór de pipeline daadwerkelijk nieuwe meetings verwerkt. Ook bij prompt-iteraties later (bv. als substantialiteitsregel gekalibreerd moet worden) draai je dit op een reference-meeting en zie je direct of de output beter of slechter werd.

**Dry-run veiligheid.** Het `persist: false` pad in `link-themes.ts` moet écht álle writes skippen — inclusief emerging theme-creatie voor proposals. De unit tests van FUNC-281 moeten dat hard verifiëren (mock DB-client, assert zero inserts). De UI-banner (UI-335) is een secundaire bescherming, niet de primaire.

### Backfill-strategie

Twee paden, identiek aan TH-010:

1. **Batch-backfill** (aanbevolen): `scripts/batch-detect-themes.ts --force` over alle verified meetings. Draait serieel of met beperkte concurrency (Sonnet 4.6 is duurder dan Haiku — 5-10 parallel max). Vereist Anthropic budget-check vooraf. Kost-schatting: ~$0.05-0.15 per meeting × aantal verified meetings (tegen de tijd van deploy maken we dat scherp).
2. **Rolling regeneration**: geen bulk; laat de pipeline voor nieuwe meetings het nieuwe pad volgen, en regenereer oude meetings alleen als ze opnieuw in review komen. Theme pages zijn dan een mix van oude en nieuwe kwaliteit tot alles geregenereerd is.

Keuze bij deploy; pad 1 is de default tenzij budget een issue is.

### Wat van TH-010 bewust overleeft

- `extraction_themes` junction tabel + indexes + RLS (DATA-220..225) — ongewijzigd
- `meeting_themes.summary` kolom (TH-010 laatste migratie) — ongewijzigd, wordt door Theme-Detector geschreven
- Mutations `linkExtractionsToThemes` + `clearExtractionThemesForMeeting` — ongewijzigd, hergebruikt door `link-themes.ts`
- Mutations `linkMeetingToThemes` + `clearMeetingThemes` — ongewijzigd
- `rejectThemeMatchAsAdmin` + `theme_match_rejections` tabel — ongewijzigd, `link-themes.ts` respecteert rejections (FUNC-274)
- Dashboard pills, donut, mention-count (TH-004) — ongewijzigd
- Theme detail page Meetings-tab basis-UI (TH-005 + TH-010 UI-310/311) — uitgebreid met party-type split (UI-332), rest blijft

## Deliverables

- [ ] `supabase/migrations/YYYYMMDDHHMMSS_themes_origin_meeting_id.sql` — kolom `themes.origin_meeting_id uuid nullable FK` + index (DATA-232)
- [x] ~~`supabase/migrations/YYYYMMDDHHMMSS_themes_structured_content.sql`~~ — kolom bestaat al, geen migratie (DATA-231)
- [ ] `packages/database/src/types/database.ts` — regenereerd via `supabase gen types`
- [ ] `packages/ai/src/validations/theme-detector.ts` — `ThemeDetectorOutputSchema` + types export (AI-231)
- [ ] `packages/ai/src/agents/theme-detector.ts` — agent met `runThemeDetector()`, `THEME_DETECTOR_PROMPT_VERSION`, `THEME_DETECTOR_MODEL`, post-validation filters + caps (AI-230, AI-233, AI-234)
- [ ] `packages/ai/prompts/theme-detector.md` — system prompt met substantialiteitsregel + voorbeelden (AI-232)
- [ ] `packages/ai/prompts/summarizer.md` — uitbreiding met `[Themes:]` annotatie-instructie + `identified_themes` context-sectie (AI-235)
- [ ] `packages/ai/src/agents/summarizer.ts` — context-parameter `identified_themes` doorgeven in user-content
- [ ] `packages/ai/src/agents/risk-specialist.ts` — context-parameter `identified_themes` toevoegen aan `RiskSpecialistContext` (AI-236)
- [ ] ~~`packages/ai/src/agents/needs-scanner.ts`~~ — bewust niet in deze sprint (AI-236, zie Out of scope)
- [ ] `apps/cockpit/src/actions/themes.ts` — `regenerateMeetingThemesAction` laten draaien via Detector → Summarizer → `runLinkThemesStep({ replace: true })` (FUNC-283)
- [ ] `packages/ai/src/pipeline/tagger.ts` — nieuwe export `parseThemesAnnotation(text): string[]` + `resolveThemeRefs(names, identifiedThemes, knownThemes)` — patroon uit bestaande `parsePrefix` + `resolvePrefixProject`
- [ ] `packages/ai/src/pipeline/steps/link-themes.ts` — nieuwe step die alles samenbrengt (FUNC-270..276)
- [ ] `packages/ai/src/pipeline/gatekeeper-pipeline.ts` — volgorde-aanpassing, Theme-Detector invoegen, identified_themes propageren naar Summarizer + RiskSpecialist + NeedsScanner, `link-themes` vervangt `tag-themes` (FUNC-275)
- [ ] `packages/ai/src/pipeline/steps/tag-themes.ts` — **verwijderen** (FUNC-277)
- [ ] `packages/ai/src/agents/theme-tagger.ts` — **verwijderen** (FUNC-277)
- [ ] `packages/ai/src/validations/theme-tagger.ts` — **verwijderen** (FUNC-277)
- [ ] `packages/ai/prompts/theme-tagger.md` — **verwijderen** (FUNC-277)
- [ ] `packages/ai/src/agents/registry.ts` — Theme-Tagger entry verwijderen, Theme-Detector entry toevoegen
- [ ] `scripts/batch-tag-themes.ts` → hernoemen `scripts/batch-detect-themes.ts`, aanpassen op nieuwe pipeline-step (FUNC-278)
- [ ] `package.json` root — `tag-themes-batch` script hernoemen naar `detect-themes-batch`
- [ ] `apps/cockpit/package.json` (indien aanwezige scripts) — zelfde hernoeming
- [ ] `apps/cockpit/src/app/(dashboard)/dev/tagger/` → hernoemen naar `dev/detector/` + contract-aanpassingen (FUNC-279)
- [ ] `apps/cockpit/src/actions/dev-tagger.ts` → hernoemen `dev-detector.ts` + `runDevDetectorAction` contract (FUNC-279)
- [ ] `packages/database/src/queries/dev-tagger.ts` → hernoemen `dev-detector.ts` + naamgeving interne helpers
- [ ] `apps/cockpit/src/app/(dashboard)/dev/tagger/page.tsx` — **tijdelijke redirect** naar `/dev/detector` (1 sprint, TH-012 verwijdert 'm)
- [ ] `packages/ai/src/pipeline/steps/link-themes.ts` — `persist?: boolean` parameter + `PreviewResult` return-type bij dry-run (FUNC-281)
- [ ] `apps/cockpit/src/actions/dev-detector.ts` — `mode: "detector-only" | "full-pipeline"` parameter + `DevFullPipelinePreview` return-shape (FUNC-282)
- [ ] `apps/cockpit/src/app/(dashboard)/dev/detector/client.tsx` — "Preview Full Pipeline" knop + vier preview-panelen + dry-run banner (UI-333, UI-334, UI-335)
- [ ] `apps/cockpit/src/components/review/review-detail.tsx` — nieuw tabblad "Voorgestelde thema's" + rendering van `ThemeApprovalCard` (UI-330)
- [ ] `apps/cockpit/src/components/themes/theme-approval-card.tsx` — optionele `context`-prop voor in-meeting-review vs bulk-review gedrag
- [ ] `apps/cockpit/src/actions/themes.ts` — `confirmThemeProposalAction` + `rejectThemeProposalAction` (FUNC-280)
- [ ] `packages/database/src/queries/themes.ts` — `listProposedThemesForMeeting(meetingId)` helper (joint met `origin_meeting_id`)
- [ ] `packages/database/src/queries/theme-detail.ts` — `getThemeMeetings` JOIN met `meetings.party_type` (UI-332)
- [ ] `apps/cockpit/src/app/(dashboard)/themes/[slug]/tabs/meetings-tab.tsx` — render-laag groepering op party_type (UI-332)
- [ ] Tests (nieuwe + updates):
  - [ ] Nieuw: `packages/ai/__tests__/agents/theme-detector.test.ts` — schema-parse, caps, UUID-filter, substantialityEvidence verplicht aanwezig, happy-path + edge-cases
  - [ ] Nieuw: `packages/ai/__tests__/pipeline/tagger.test.ts` sectie voor `parseThemesAnnotation` + `resolveThemeRefs` — boundary cases: nested brackets, comma-separated, case-insensitive match, ambiguous name
  - [ ] Nieuw: `packages/ai/__tests__/pipeline/link-themes.test.ts` — rejection-respect (FUNC-274), proposal → emerging theme, identified-only match, cascade op regenerate, EDGE-230..234
  - [ ] Update: `packages/ai/__tests__/pipeline/gatekeeper-pipeline.test.ts` — nieuwe volgorde, Theme-Detector wordt aangeroepen tussen Gatekeeper en Summarizer, identified_themes bereikt Summarizer + RiskSpecialist context
  - [ ] Update: `packages/ai/__tests__/agents/summarizer.test.ts` — context-parameter identified_themes komt aan in user-content, prompt-wijziging heeft geen regressie op kernpunten/vervolgstappen output
  - [ ] Nieuw: `apps/cockpit/__tests__/actions/themes-proposals.test.ts` — `confirmThemeProposalAction` (admin-only, status transitie), `rejectThemeProposalAction` (cleanup meeting_themes), non-admin forbidden
  - [ ] Update: `apps/cockpit/__tests__/components/review/review-detail.test.tsx` — tab "Voorgestelde thema's" rendert bij proposals, leeg bij geen proposals
  - [ ] Nieuw: `packages/database/__tests__/queries/theme-detail.test.ts` sectie — `getThemeMeetings` retourneert party_type per meeting
  - [ ] Update: `apps/cockpit/__tests__/app/themes-detail.test.tsx` — render groepeert op party_type, lege secties verbergen header
  - [ ] Update: bestaande ThemeTagger tests — geconverteerd of verwijderd conform FUNC-277
  - [ ] Nieuw: `packages/ai/__tests__/pipeline/link-themes-dry-run.test.ts` — `persist=false` schrijft geen enkele rij (mock DB-client, assert zero `.insert()` / `.upsert()` / `.update()` / `.delete()` calls), retourneert correcte `PreviewResult` shape met alle te-schrijven rijen
  - [ ] Nieuw: `apps/cockpit/__tests__/actions/dev-detector-full-pipeline.test.ts` — `mode="full-pipeline"` kettint Theme-Detector → Summarizer → link-themes dry-run, retourneert `DevFullPipelinePreview` met alle tussenstappen, EDGE-235 partial-error pad
  - [ ] Update: `apps/cockpit/__tests__/app/dev-detector.test.tsx` — "Preview Full Pipeline" knop rendert alle 4 panelen, DRY-RUN banner zichtbaar, refresh cleart state
  - [ ] Nieuw: `apps/cockpit/__tests__/actions/regenerate-meeting-themes.test.ts` — `regenerateMeetingThemesAction` roept Detector + Summarizer + `runLinkThemesStep({ replace: true })` in die volgorde aan, vervangt bestaande `meeting_themes`, respecteert `theme_match_rejections`, admin-only (FUNC-283)
  - [ ] Update: `apps/cockpit/__tests__/actions/dev-detector-full-pipeline.test.ts` — **assert dat `updateMeetingSummary` NIET wordt aangeroepen** tijdens full-pipeline preview (FUNC-282 dry-run semantiek)
- [ ] Documentatie:
  - [ ] `docs/dependency-graph.md` — automatisch regeneratie via pre-commit hook
  - [ ] `CLAUDE.md` — Theme-Detector agent entry in registry-lijst, ThemeTagger entry weghalen
  - [ ] `sprints/done/TH-matrix.md` — TH-011 rij toevoegen na afronding

## Acceptance criteria

- `npm run type-check` en `npm run lint` groen.
- `npm run test` in `packages/ai` + `apps/cockpit` + `packages/database` groen.
- Migration draait schoon op lokale Supabase (`supabase db reset`).
- Pipeline-draai op een test-meeting: logs tonen volgorde `gatekeeper → theme-detector → summarizer → extractors → link-themes → embed`, agent_runs tabel bevat `theme-detector` entries met `prompt_version='v1'`.
- DB-check na pipeline: `meeting_themes` rijen bevatten `summary` (niet-null), `extraction_themes` junction gevuld, emerging theme heeft `origin_meeting_id` gezet, `theme_match_rejections` blijft respected.
- Substantialiteitsregel werkt: meeting met alleen losse vermelding van MCP → geen `meeting_themes` rij voor MCP-theme; meeting met 3+ kernpunten over MCP → wél.
- Theme detail page `/themes/mcp-capabilities` toont drie party-type secties (mits er meetings in alle drie zijn), elk met meeting-cards, lege secties onzichtbaar.
- Meeting-review detail (`/review/[id]` met proposals): derde tab "Voorgestelde thema's" met count-badge, card per proposal, Bevestigen → theme status=`verified` + theme verschijnt in bulk, Afwijzen → theme status=`archived`.
- `/dev/detector` (oud `/dev/tagger` redirect werkt): harness laadt, Run-knop schiet Theme-Detector af, output-panel toont identified_themes + proposed_themes separaat, diff-panel vergelijkt met DB, geen writes.
- `/dev/detector` **Preview Full Pipeline** knop: op een test-meeting draait detector → Summarizer → link-themes dry-run binnen 30 seconden, alle vier panelen gerendered, DRY-RUN banner zichtbaar, `SELECT count(*) FROM meeting_themes WHERE meeting_id='...'` voor en na de preview gelijk (0 writes geverifieerd). Plus: `SELECT summary, updated_at FROM meetings WHERE id='...'` onveranderd (bewijs dat `updateMeetingSummary` níét is aangeroepen, FUNC-282).
- Backfill-script `npm run detect-themes-batch -- --force --limit=3` draait zonder errors op 3 verified meetings, console-output toont success/skip counts.
- Geen regressie: dashboard pills + donut + mention-count identiek aan pre-TH-011, theme emerging-bulk-overzicht op `/review` identiek.
- `RegenerateMenu` op zowel `/meetings/[id]` als `/review/[id]` werkt nog: knop triggert de volle keten (Detector → Summarizer → link-themes replace), bestaande `meeting_themes` worden vervangen door nieuwe, `meetings.summary` wordt bijgewerkt, geen errors in console (FUNC-283).

## Handmatige test-stappen

1. `supabase db reset` → alle migrations draaien, inclusief `themes.origin_meeting_id`.
2. Via Supabase Studio: `\d themes` → `origin_meeting_id uuid` + FK + index aanwezig.
3. Selecteer een verified meeting met meerdere identified_projects en substantiële discussie over minstens één cross-cutting onderwerp (bv. MCP of AI-architecture). Noteer `meeting_id`.
4. Run `npm run detect-themes-batch -- --force --limit=1` op die meeting (filter eventueel via env of edit). Bevestig console-output: `link-themes` loggen van meeting_themes + extraction_themes writes.
5. Query `SELECT theme_id, summary, evidence_quote FROM meeting_themes WHERE meeting_id = '...';` → rijen bevatten niet-null `summary`, `evidence_quote` is een concrete zin uit de meeting.
6. Query `SELECT t.name, et.confidence, count(*) FROM extraction_themes et JOIN themes t ON t.id=et.theme_id JOIN extractions e ON e.id=et.extraction_id WHERE e.meeting_id='...' GROUP BY t.name, et.confidence;` → counts kloppen met identified_themes output.
7. Open `/themes/[slug]` van een theme die zojuist gelinkt is → Meetings-tab toont drie mogelijke secties (Wij intern / Klanten / Gemengd). Lege secties geen header.
8. Genereer of fake een proposal (handmatig via detector-harness of via een meeting met een nieuw cross-cutting onderwerp). Ga naar `/review/[id]` van die meeting → tab "Voorgestelde thema's" toont de proposal met matching_guide.
9. Klik **Bevestigen** → theme-row `status` wordt `verified`, meeting_themes-link blijft staan, bulk-sectie op `/review` toont 'm niet meer.
10. Klik **Afwijzen** op een andere proposal → theme-row `status='archived'`, meeting_themes-link verwijderd, bulk-sectie ook leeg.
11. Open `/dev/tagger` (oude URL) → redirect naar `/dev/detector`, harness laadt met contract-aanpassingen (identified_themes + proposed_themes kolommen zichtbaar).
12. Run harness op dezelfde meeting als stap 3 → output matcht met wat er in de DB staat (diff-panel toont geen delta's, of alleen een niet-persisted proposal).
    12a. Klik **Preview Full Pipeline** op dezelfde meeting. Noteer `SELECT count(*) FROM meeting_themes` + `SELECT count(*) FROM extraction_themes` vooraf. Wacht op output (tot ~30 sec). Verifieer: DRY-RUN banner zichtbaar, alle 4 panelen gerendered, Summarizer-panel toont kernpunten met `[Themes:]` markers gehighlight, link-themes-panel toont tabel met to-be-written rijen, diff-panel toont verwachte wijzigingen. Query counts nogmaals → identiek aan vooraf (geen writes).
    12b. Draai handmatig een variant met een net-gerejectte (meeting_id, theme_id) paar in `theme_match_rejections` → link-themes preview-panel toont dat paar in `skippedDueToRejection`, niet in `meetingThemesToWrite`. Bevestigt FUNC-274 + FUNC-281 samenwerking.
13. Substantialiteit-check: pick een meeting met duidelijk één losse MCP-vermelding zonder verdere discussie. Run detector → output `identified_themes` bevat géén MCP-match, `substantialityEvidence.reason` bij potentiële match zou "losse vermelding" vermelden in een debug-run.
14. Regression-check: open dashboard `/`, tel pills en donut-waarden → identiek aan screenshot van pre-TH-011. Mention-count op een theme-card identiek.
15. Admin-gate: log in als non-admin → `/dev/detector` geeft 403, `confirmThemeProposalAction` via directe action-call returneert `{error:'forbidden'}`.

## Out of scope

- **Wekelijkse consolidation cron** — zie TH-012.
- **Saturation-metric dashboard** — zie TH-012.
- **Reliability re-run delta (Cohen's Kappa / cosine similarity)** — zie TH-012.
- **Niveau 2/3 speaker-attributie** — huidige party_type is meeting-level; per-extraction speaker-voice (intern vs klant-CEO vs contractor) is een latere sprint die een nieuw `source_voice` veld op extractions zou toevoegen.
- **ThemeNarrator agent** — per-theme cross-meeting synthese (analoog aan project-summarizer) is een aparte sprint. `themes.structured_content` kolom in DATA-231 is daarvoor de voorbereiding.
- **Auto-approve theme-proposals** — proposals blijven altijd expliciete admin-actie. Zelfs als meeting-approve later auto-triggert, theme-proposals cascaden niet mee.
- **Visuele type-laag op theme detail page** — kleurvlakken, icons, groupings per extraction-type. TH-010 out-of-scope; blijft out-of-scope.
- **Email-extractions theme-koppeling** — `email_extractions` staat buiten deze pipeline. Latere sprint met eigen `email_extraction_themes` tabel of polymorphic link.
- **Gatekeeper-upgrade naar Sonnet** — Gatekeeper blijft Haiku 4.5. Theme-Detector krijgt zijn eigen Sonnet 4.6 call. Twee aparte agent-calls, duidelijke verantwoordelijkheden.
- **ML-based theme-tagging fallback** — als de Theme-Detector een thema mist en een extractie strandt zonder theme-link, dan blijft die extractie theme-loos. Geen tweede pass, geen embeddings-fallback. Houd V1 simpel.
- **NeedsScanner theme-context** — NeedsScanner (`packages/ai/src/pipeline/scan-needs.ts`) draait niet in de main pipeline en krijgt in deze sprint géén `identified_themes`. Vereist aparte design-spike: óf de scanner DB-side themes ophalen (geen pipeline-context-flow), óf de scanner in de main pipeline trekken (bredere refactor). AI-236 beperkt zich daarom tot RiskSpecialist.
- **Annotation-only regenerate** — de regenerate-knop roept in deze sprint de volle keten aan (FUNC-283). Een lichtere variant die alleen `link-themes` herdraait op bestaande Summarizer-output (zonder Detector+Summarizer opnieuw te betalen) kan later als optimalisatie — vereist dat `meetings.summary` de `[Themes:]` markers al bevat, wat pas geldt voor meetings die na TH-011 zijn geprocesseerd.
