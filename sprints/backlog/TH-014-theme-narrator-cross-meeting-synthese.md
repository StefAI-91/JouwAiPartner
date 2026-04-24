# Micro Sprint TH-014: Theme-Narrator — cross-meeting synthese per thema

## Doel

Elk thema krijgt een **"Verhaal"-tab** op de detail-page met een AI-gesynthetiseerde narrative over álle meetings onder dat thema samen. De bouwsteen is `meeting_themes.summary` (rijke per-meeting markdown uit TH-013); een nieuwe agent **theme-narrator** voegt die rijen samen tot één lopende thema-pagina met zes secties: De kern · Wat we terug zien komen · Waar jullie samen staan · Waar het schuurt · Wat nog hangt · De blinde vlek. Plus een kleine signaal-check onderin die de sterkte van het signaal zelf beoordeelt.

**Waarom nu.** Twee handmatige experimenten (Founder-ritme met 4 meetings, Team capaciteit met 3) tonen dat de synthese observaties oplevert die jij en Wouter niet uit losse meetings halen: _"op termijn wordt nooit"_-patronen, _"profiel wordt retroactief herschreven"_-patronen, alignment/frictie-analyses op founder-dynamiek. Zulke cross-meeting observaties zijn preventief (vóór een beslissing) in plaats van retrospectief (na de weekly). Zie de research-thread en de mockup `docs/specs/sketches/sketch-page-theme-narrative.html` voor de gevalideerde output-structuur + UI.

**Drie bewuste afwijkingen van de platform-defaults** (vastgelegd in research-thread):

1. **Geen verification-gate.** Narrative is direct zichtbaar voor alle authenticated users, AI-gegenereerd-as-is. Platform-principe _"all content must be human-verified before becoming queryable truth"_ wordt hier bewust genegeerd voor v1. Heroverwegen als misinformatie of gevoelige observaties over teamleden terugkomen uit gebruik.
2. **Regenereren op elke nieuwe `meeting_themes` rij** voor het thema, niet cron-scheduled. Duurder bij hoge mention-volumes, maar geeft altijd actuele narrative. Kost-plafond pas terugschroeven als we het zien lopen.
3. **Zichtbaar voor iedereen**, niet admin-only. Narrative kan persoonlijke observaties bevatten (_"Wouter verlaagt consequent Stefs bar"_), maar scoping op thema-niveau is v2.

**Guardrail.** Minder dan 2 meetings onder een thema → geen agent-call. De tab toont dan een empty-state (_"Nog te weinig materiaal"_). Voorkomt hallucinatie op één meeting, en voorkomt kosten op ruisige emerging themes.

**Eerste tastbare resultaat:** je opent `/themes/founder-ritme-samenwerking`, landt op tab "Verhaal" (default), en leest een editorial-memo-stijl pagina met "De kern" als serif-lede bovenaan, inline meeting-chips bij elke claim, en een amber-getinte "Blinde vlek"-sectie als visuele hero. Eén regenereer-knop rechts (alleen admin) voor handmatige trigger; verder komt de narrative automatisch langs na elke nieuwe meeting die aan dit thema linkt.

## Requirements

| ID       | Beschrijving                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DATA-250 | Nieuwe tabel `theme_narratives` met kolommen: `theme_id uuid primary key references themes(id) on delete cascade`, `briefing text not null`, `patterns text`, `alignment text`, `friction text`, `open_points text`, `blind_spots text`, `signal_strength text check (signal_strength in ('sterk','matig','zwak','onvoldoende'))`, `signal_notes text`, `meetings_count_at_generation int not null`, `generated_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`.                |
| DATA-251 | RLS policies op `theme_narratives`: `enable row level security`, select-policy `read_authenticated` `using (auth.role() = 'authenticated')`; geen insert/update/delete policy — schrijven gebeurt uitsluitend via service-role (pipeline + admin action). Consistent met `meeting_themes` RLS-patroon (TH-010).                                                                                                                                                                                                         |
| DATA-252 | Migratie-file `supabase/migrations/20260425*_theme_narratives.sql` volgens bestaand naamgevings-patroon. Geen seed — narratives worden on-demand geschreven.                                                                                                                                                                                                                                                                                                                                                            |
| AI-250   | Zod-schema `ThemeNarratorOutputSchema` in `packages/ai/src/validations/theme-narrator.ts`: `{ briefing: string (niet leeg), patterns: string (optioneel), alignment: string (optioneel), friction: string (optioneel), open_points: string (optioneel), blind_spots: string (optioneel), signal_strength: 'sterk' \| 'matig' \| 'zwak', signal_notes: string }`. Secties optioneel zodat de agent mag skippen bij dun signaal; `briefing` is altijd verplicht.                                                          |
| AI-251   | Nieuwe prompt `packages/ai/prompts/theme-narrator.md`, gebaseerd op de gevalideerde Claude-Desktop-prompt uit de research-thread. Instructies: zes secties zoals in schema, **jullie**-aanspreken, verwijs bij elke claim naar bron-meeting (datum + korte titel inline), benoem tegenstrijdigheden tussen meetings expliciet, blijf binnen matching-guide van het thema, eerlijk over thin signal, Nederlands, max ~800 woorden totaal.                                                                                |
| AI-252   | Nieuwe agent `packages/ai/src/agents/theme-narrator.ts` met `runThemeNarrator(input)`: model **Sonnet 4.6** (`claude-sonnet-4-6`), `effort: "high"`, temperature 0.3. Input: `{ theme: ThemeRow, meetingSummaries: Array<{ meeting_id, date, title, confidence, evidence_quote, summary }> }` chronologisch nieuwste-eerst. Caps post-validation: totale output getrimd naar max 10.000 chars (voorkomt runaway). Telemetry via bestaand `agent_runs`-patroon met `agent_name='theme-narrator'`, `prompt_version='v1'`. |
| AI-253   | Registratie in `packages/ai/src/agents/registry.ts` als `{ id: 'theme-narrator', name: 'Theme Narrator', role: 'thema-verteller', model: 'Sonnet 4.6', status: 'live', entrypoint: 'packages/ai/src/pipeline/steps/synthesize-theme-narrative.ts' }`. Verschijnt op `/agents` observability-pagina.                                                                                                                                                                                                                     |
| FUNC-300 | Nieuwe pipeline-step `packages/ai/src/pipeline/steps/synthesize-theme-narrative.ts` export `runThemeNarrativeSynthesis(themeId: string): Promise<{ success: boolean, error?: string, skipped?: 'insufficient_meetings' }>`. Leest `themes` + alle `meeting_themes`-rijen voor `themeId` (via `listThemeMeetingSummaries` query FUNC-302), roept `runThemeNarrator`, schrijft via `upsertThemeNarrative` (FUNC-304). Never-throws — analoog aan `runLinkThemesStep`.                                                     |
| FUNC-301 | Guardrail in FUNC-300: als aantal `meeting_themes`-rijen met niet-null `summary` < 2 → skip de agent-call, upsert een rij met `briefing = '__insufficient__'`, `meetings_count_at_generation = <werkelijk aantal>`, `signal_strength = 'onvoldoende'`. UI herkent sentinel en toont empty-state (UI-408).                                                                                                                                                                                                               |
| FUNC-302 | Nieuwe query `packages/database/src/queries/themes/narrative.ts`: (a) `getThemeNarrative(themeId): Promise<ThemeNarrativeRow \| null>` met `is_stale: boolean` berekend door `themes.last_mentioned_at > theme_narratives.generated_at`; (b) `listThemeMeetingSummaries(themeId): Promise<Array<{ meeting_id, date, title, confidence, evidence_quote, summary }>>` — join op `meetings` gesorteerd op `meetings.date desc`, alleen rijen waar `meeting_themes.summary is not null`.                                    |
| FUNC-303 | Nieuwe mutation `packages/database/src/mutations/themes/narrative.ts` export `upsertThemeNarrative(input)`: upsert-by-theme_id, `updated_at = now()`, `generated_at = now()` bij insert of explicit overwrite. Client-scope beleid: default admin, optionele `client?: SupabaseClient` parameter.                                                                                                                                                                                                                       |
| FUNC-304 | Pipeline-hook in `packages/ai/src/pipeline/steps/link-themes.ts` — na `recalculateThemeStats(affected)` (regel ~386) een `Promise.allSettled(affected.map(runThemeNarrativeSynthesis))` fire-and-forget. Fouten `console.warn`, blokkeren nooit de hoofd-pipeline. Wordt alleen in persist-mode uitgevoerd (niet in dry-run/preview).                                                                                                                                                                                   |
| FUNC-305 | Server action `apps/cockpit/src/features/themes/actions/narrative.ts` export `regenerateThemeNarrativeAction(input: { themeId: string })`: admin-guard via `isAdmin()`, Zod-validatie via `regenerateThemeNarrativeSchema`, roept `runThemeNarrativeSynthesis`, `revalidatePath('/themes/[slug]')`. Return `{ success: true }` of `{ error: string }`.                                                                                                                                                                  |
| FUNC-306 | Zod-schema `regenerateThemeNarrativeSchema` in `apps/cockpit/src/features/themes/validations/themes.ts`: `{ themeId: z.string().uuid() }`. Geëxporteerd via bestaande `features/themes/validations/index.ts` barrel.                                                                                                                                                                                                                                                                                                    |
| UI-400   | Nieuwe tab-component `apps/cockpit/src/app/(dashboard)/themes/[slug]/tabs/narrative-tab.tsx` (server component). Consumeert `getThemeNarrative` + rendert zes secties volgens mockup-specificaties. Markdown-renderer (hergebruik van TH-013 UI-340 `react-markdown` + `prose`-classes) voor elke sectie-content. Inline meeting-chips via nieuwe presentational component (UI-404).                                                                                                                                    |
| UI-401   | Update `theme-detail-view.tsx`: tab-volgorde wordt `Verhaal · Overzicht · Meetings · Besluiten · Open vragen · Mensen`. Default activeTab (geen `?tab=`) wordt `narrative`. `VALID_TABS` uitgebreid naar 6. Tab-label "Verhaal".                                                                                                                                                                                                                                                                                        |
| UI-402   | Typografie voor "De kern"-lede (briefing): serif font via Google Fonts import in `layout.tsx` of dedicated CSS-file — **Instrument Serif** (consistent met mockup). Lede-class: `font-serif`, `text-[1.65rem]`, `leading-[1.4]`, `tracking-[-0.01em]`. Max-breedte content ~680px (`max-w-[680px] mx-auto`). Achtergrond `bg-stone-50` of warmer custom `#faf9f5` (design token in globals.css).                                                                                                                        |
| UI-403   | "De blinde vlek"-sectie krijgt amber accent: amber-50/100 background-gradient, `border-l-[3px] border-amber-600`, eerste zin in serif italic als pull-quote binnen de sectie. Exact patroon in mockup regel 195-215. Amber-tint is verplicht design-signaal — dit is de hero-sectie waar jij voor terugkomt.                                                                                                                                                                                                            |
| UI-404   | Meeting-chips als inline pills in de prose: `<a href="/meetings/[id]">` met classes `inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-stone-200 hover:bg-stone-300 rounded-full text-xs font-medium`. Content `<span class="dot" /> {datum} · {korte titel}`. Nieuw component `apps/cockpit/src/features/themes/components/meeting-chip.tsx` met props `{ meetingId, date, title }`. Klikbaar naar meeting-detail.                                                                                                     |
| UI-405   | Signaal-check als footer: `<dl>` met drie rijen (Signaal-sterkte, Wat mist, Bron), muted styling (`text-ink-500 text-[0.8125rem]`), bovenaan kleine eyebrow `Signaal-check`, gescheiden van content met `border-t border-ink-100 pt-8`. Sterkte als pill met dot: groen (sterk), amber (matig), stone (zwak).                                                                                                                                                                                                           |
| UI-406   | Meta-rij bovenaan narrative: klein AI-badge links (`text-xs text-ink-500` + icon) "Door AI gesynthetiseerd · {relatief tijdsverschil}", regenereer-knop rechts alleen bij `canEdit`. Icon-only (refresh-circle), tooltip "Opnieuw genereren". Klik roept `regenerateThemeNarrativeAction` via een mini client-component `narrative-regenerate-button.tsx`.                                                                                                                                                              |
| UI-407   | Staleness-banner: wanneer `is_stale === true`, toon boven de lede een zacht getinte banner `bg-amber-50 border border-amber-200 text-amber-900 text-sm`: "Er zijn nieuwe meetings sinds deze synthese — wordt binnenkort bijgewerkt." Geen dismiss-knop in v1; verdwijnt automatisch als pipeline de narrative heeft bijgewerkt.                                                                                                                                                                                        |
| UI-408   | Empty-state voor < 2 meetings (FUNC-301 sentinel): vervang alle secties door één gecentreerd tekstblok _"Dit thema is nog jong. Na meer meetings verschijnt hier het verhaal."_ + kleine meter (X / 2 meetings nodig). Regenereer-knop verborgen (geen bron). Layout blijft de narrative-tab — geen fallback naar Overzicht.                                                                                                                                                                                            |
| UI-409   | `theme-detail-view.tsx` accepteert nieuwe `narrative: ReactNode` prop en rendert in de `<TabsContent value="narrative">`-slot. `page.tsx` roept `getThemeNarrative` in de parallelle `Promise.all` (naast bestaande queries), passeert `<NarrativeTab theme={theme} narrative={narrative} canEdit={canEdit} />`.                                                                                                                                                                                                        |
| UI-410   | `features/themes/README.md` updaten: `regenerateThemeNarrativeAction` toevoegen aan actions-menu, `MeetingChip` aan components-menu, `theme_narratives` tabel aan Database-sectie. Routes-sectie vermeldt nieuwe default-tab.                                                                                                                                                                                                                                                                                           |
| EDGE-250 | Agent faalt (Anthropic 500, timeout, parse-error): `runThemeNarrativeSynthesis` vangt de fout, logt warn, retourneert `{ success: false, error }`. Pipeline-hook (FUNC-304) blijft doorlopen voor andere themes. Bestaande narrative in DB blijft staan (geen overwrite met error-state). UI toont de oude narrative + stale-banner als van toepassing.                                                                                                                                                                 |
| EDGE-251 | Meerdere `meeting_themes`-writes binnen seconden voor hetzelfde thema (bv. regenerate-batch): elke write triggert een eigen `runThemeNarrativeSynthesis`-call. Laatste wins via upsert. Geen debouncing in v1 — kost-impact is begrensd door `affected`-array per pipeline-run (<10 thema's typisch). Als dit in productie explodeert: debounce via simple 30-sec-timer in een latere sprint.                                                                                                                           |
| EDGE-252 | Thema wordt zojuist aangemaakt (emerging) met origin-meeting-id, maar `meeting_themes.summary` is nog null (Summarizer heeft nog niet gedraaid). FUNC-301 guardrail vangt dit op als <2 meetings met summary — sentinel-rij geschreven, UI toont empty-state. Zodra Summarizer klaar is + herhaalde link-themes draait, krijgt thema automatisch een echte narrative.                                                                                                                                                   |
| EDGE-253 | XSS-veiligheid: narrative-kolommen bevatten AI-gegenereerde markdown. Renderer gebruikt bestaande `react-markdown` met safe-defaults (géén `rehypeRaw`, géén `dangerouslySetInnerHTML`). Test met gecrafte payload `<script>`, `<img onerror>`, `[link](javascript:...)` → inert gerenderd. Meeting-chips zijn zelf-gegenereerd (geen AI-input in href), immuun.                                                                                                                                                        |
| EDGE-254 | `themes.last_mentioned_at` is null (nooit een meeting gehad): `is_stale` berekening returnt `false` — zonder referentie is er niks om stale tegenover te zijn. Technisch onmogelijk dat er een `theme_narratives`-rij is (guardrail blokkeert), maar verdedig het in de query voor safety.                                                                                                                                                                                                                              |
| EDGE-255 | Theme wordt gearchiveerd terwijl een narrative-rij bestaat: `on delete cascade` op `theme_id` ruimt de narrative-rij op. Geen orphan-state. Archive-flow (TH-005 bestaand) hoeft niet aangepast.                                                                                                                                                                                                                                                                                                                        |
| SEC-250  | Read: authenticated users (DATA-251). Write: service-role via pipeline + admin via `regenerateThemeNarrativeAction` (admin-guard in de action). Regenereer-knop in UI verborgen voor non-admin (`canEdit` flag uit bestaande `isAdmin()`). Geen team-role-scoping in v1 — heroverwegen als narratives persoonlijk gevoelig worden.                                                                                                                                                                                      |

## Bronverwijzingen

- Spec: `docs/specs/prd-themes.md` — §3.3 v2+ out-of-scope "Narrative-paragraaf (C13)" wordt met deze sprint in productie genomen (vervroeging naar v1.5 op basis van bewezen experiment-waarde)
- Vision: `docs/specs/vision-ai-native-architecture.md` — Cockpit quadrant, "Theme-as-a-lens" patroon, verification-principe (bewust afgeweken — zie Doel)
- Sprint-precedent: `sprints/backlog/TH-013-rich-per-theme-summaries.md` — levert de per-meeting `meeting_themes.summary` bouwsteen waar Theme-Narrator op staat. Out-of-scope-sectie van TH-013 benoemt Theme-Narrator expliciet als opvolger.
- Sprint-precedent: `sprints/backlog/TH-005-theme-detail-page.md` — bestaande 5-tabs structuur + admin-edit-mode als UI-precedent
- Sprint-precedent: `sprints/backlog/TH-011-theme-detector-extract-time-scoping.md` — hallucination-strip + caps-patroon in agents
- Mockup: `docs/specs/sketches/sketch-page-theme-narrative.html` — visueel gevalideerde UX (editorial memo stijl, serif lede, amber blinde-vlek, meeting-chips inline). Bindend voor UI-402..406.
- Research-thread (deze sessie): twee handmatige experimenten bevestigden output-kwaliteit (Founder-ritme 4 meetings, Team capaciteit 3 meetings); Signaal-check meta-reflectie bleek waardevol en is behouden in de prompt.
- Code: `packages/ai/src/agents/registry.ts:45-226` — registratie-patroon voor nieuwe agent
- Code: `packages/ai/src/pipeline/steps/link-themes.ts:384-390` — hookpunt na `recalculateThemeStats` voor FUNC-304
- Code: `packages/database/src/queries/themes/core.ts` — `ThemeRow`-type hergebruiken in narrative-query
- Code: `apps/cockpit/src/app/(dashboard)/themes/[slug]/page.tsx` + `theme-detail-view.tsx` — tab-extensie-punten
- Code: `apps/cockpit/src/features/themes/actions/regenerate.ts` — patroon voor admin-guarded server action
- Code-pattern: TH-013 UI-340 markdown-renderer op `meetings-tab.tsx` — stylingreferentie voor narrative-secties

## Context

### Waarom aparte `theme_narratives`-tabel i.p.v. JSON-kolom op `themes`

Twee opties stonden op tafel:

- **A. Nieuwe tabel `theme_narratives`** (1-op-1 met `themes`, `theme_id` als primary key).
- **B. JSON-kolom `narrative_json` op `themes`**.

**Gekozen: A.** Drie redenen:

1. **Schema-garanties.** Elke sectie is een eigen kolom met een check-constraint waar nuttig (`signal_strength`). Bij JSON zou de validatie aan application-kant moeten, en upserts kunnen half-geldige blobs schrijven.
2. **Geen schema-churn op de `themes`-hot-table.** `themes` wordt door het dashboard, pills, donut, en matching-guide gelezen bij élke pipeline-run. JSON-kolommen toevoegen die alleen op de detail-page gebruikt worden vervuilt de hot-table met grote text-blobs. Aparte tabel houdt de core-tabel slank.
3. **Cascades zijn cleaner.** `on delete cascade` op `theme_id` ruimt narrative automatisch op bij archive. JSON zou handmatig ge-nulled moeten worden.

Trade-off: één extra join in de query (`getThemeNarrative`). Verwaarloosbaar — het is één rij, unique-key op theme_id.

### Waarom regenereren op elke nieuwe `meeting_themes` vs. cron

**Gekozen: op elke write.** Twee kosten-scenario's als benchmark (schattingen, valideren bij deploy):

- Per narrative ~5k input-tokens (4 meetings × ~1k per summary + prompt) + ~1k output-tokens. Sonnet 4.5 claude-sonnet-4-5 (nu): ~$0.015-0.025 per call (input $3/M, output $15/M).
- Typische pipeline-run: 1-3 affected themes per meeting. Bij 20 meetings/week → ~40-60 narrative-regeneraties/week → ~$3-5/maand. Nog geen issue.

Breekpunt (ongeveer): bij >300 regeneraties/week wordt het interessant om te debouncen. Dán pas schakelen naar een 10-min-cron of queue. Niet nu.

**Wat niet:** een debounce-timer in v1. Adds state en complexiteit voor een niet-bestaand probleem. EDGE-251 beschrijft het scenario maar laat het bewust open.

### Waarom "iedereen kan zien" en niet admin-only

De narrative kan gevoelige observaties bevatten (founder-dynamiek, coaching-patronen). Admin-only zou de veiligste default zijn. Toch: deze sprint draait v1 voor de 3-koppige admin-core (Stef, Wouter, Ege gedeeltelijk). Het team is klein genoeg dat expliciete toegang-splitsing premature is. Als externen of nieuwe hires toegang krijgen vóór v2 zichtbaarheid-scoping gebouwd is: narratives privé-flaggen handmatig via `archiveThemeAction` is de noodrem.

Heroverwegen zodra (a) een 4e niet-founder toegang krijgt tot cockpit, of (b) iemand in een review zegt "dit had ik niet over mij willen lezen in het open".

### Waarom < 2 meetings guardrail

Synthese over 1 meeting ≈ herkauwen van die ene `meeting_themes.summary`. De agent zou óf letterlijk kopiëren (waardeloos), óf gaan hallucineren om "patronen over tijd" te fabriceren (schadelijk). Beide scenarios ondergraven het vertrouwen in de output meer dan de pagina laten zien dat er nog te weinig materiaal is.

Drempel 2 is minimum voor "cross-meeting" betekenis. Kan later opgehoogd worden naar 3 als experiment aantoont dat 2 ook te dun is. Nu weten we dat 3 (Team capaciteit) werkt en dat 4 (Founder-ritme) heel goed werkt.

### Waarom Sonnet 4.6 met `effort: "high"` i.p.v. Sonnet 4.5

Initiële keuze was Sonnet 4.5 (handmatige experimenten draaiden daarop). Bij uitvoering geüpgraded naar **Sonnet 4.6** met `effort: "high"` — zelfde model-tier als Theme-Detector en Risk-Specialist, die beide vergelijkbare cross-meeting patroon-taken doen. De blind-spots-sectie vraagt impliciete patroon-detectie over meerdere meetings (tegenstrijdigheden, onuitgesproken aannames, drift); extended reasoning helpt daar. De kosten-delta tegenover Sonnet 4.5 is niet verwaarloosbaar maar past in het budget zoals beschreven in "Waarom regenereren op elke nieuwe `meeting_themes` vs cron". Opus blijft overdreven — geen agentic tool-use of multi-step-planning. Bij kwaliteit-degradatie of kosten-druk: terug naar Sonnet 4.5 is een prompt_version-bump zonder schema-wijziging.

### Prompt-design keuzes

Zes secties in plaats van vijf (experiment had er vijf plus signaal-check): "Alignment & frictie" gesplitst naar `alignment` en `friction` als aparte velden zodat de UI ze apart kan stylen (alignment = rustige lijst, friction = prose met bold leads). Schema-keuze drijft UI-keuze.

Optioneel zijn: `patterns`, `alignment`, `friction`, `open_points`, `blind_spots`. Verplicht: `briefing`, `signal_strength`, `signal_notes`. Reden: bij thin signal moet de agent kunnen zeggen _"er is nu een lede en een signaal-check, meer eerlijkheid geven we niet"_ — dan is het beter om secties leeg te laten dan te vullen met fluff.

**Blinde vlek als aparte sectie** (niet als laatste alinea van briefing): bewust, want dit is de meest waardevolle sectie volgens experiment. UI geeft hem een eigen visuele ruimte (amber accent). Apart veld dwingt de agent om expliciet ruimte voor deze observatie te reserveren.

### Staleness-berekening

Simpel: `is_stale = themes.last_mentioned_at > theme_narratives.generated_at`. Geen aparte `is_stale`-kolom — berekend in de query. Twee voordelen: (a) blijft automatisch correct als `last_mentioned_at` wordt bijgewerkt, (b) geen second-order-invalidation ("stale-vlag moet gecleared bij regenerate").

Edge: `last_mentioned_at = null` (EDGE-254) → `is_stale = false`. In de praktijk kan deze combinatie niet ontstaan (guardrail blokkeert narratives voor themes zonder mentions), maar de query moet niet crashen op de combi.

## Bestanden om aan te raken

- [ ] `supabase/migrations/20260425*_theme_narratives.sql` — nieuwe tabel + RLS (DATA-250, DATA-251, DATA-252)
- [ ] `packages/database/src/queries/themes/narrative.ts` — `getThemeNarrative` + `listThemeMeetingSummaries` (FUNC-302)
- [ ] `packages/database/src/queries/themes/index.ts` — re-export narrative-queries
- [ ] `packages/database/src/mutations/themes/narrative.ts` — `upsertThemeNarrative` (FUNC-303)
- [ ] `packages/database/src/mutations/themes/index.ts` — re-export narrative-mutation
- [ ] `packages/ai/src/validations/theme-narrator.ts` — `ThemeNarratorOutputSchema` (AI-250)
- [ ] `packages/ai/prompts/theme-narrator.md` — nieuwe prompt (AI-251)
- [ ] `packages/ai/src/agents/theme-narrator.ts` — `runThemeNarrator` + `formatNarrative` helper (AI-252)
- [ ] `packages/ai/src/agents/registry.ts` — nieuwe registry-entry (AI-253)
- [ ] `packages/ai/src/pipeline/steps/synthesize-theme-narrative.ts` — nieuwe pipeline-step + guardrail (FUNC-300, FUNC-301)
- [ ] `packages/ai/src/pipeline/steps/link-themes.ts` — hook na `recalculateThemeStats` (FUNC-304)
- [ ] `apps/cockpit/src/features/themes/validations/themes.ts` — `regenerateThemeNarrativeSchema` (FUNC-306)
- [ ] `apps/cockpit/src/features/themes/actions/narrative.ts` — `regenerateThemeNarrativeAction` (FUNC-305)
- [ ] `apps/cockpit/src/features/themes/actions/index.ts` — re-export nieuwe action
- [ ] `apps/cockpit/src/features/themes/components/meeting-chip.tsx` — inline chip-component (UI-404)
- [ ] `apps/cockpit/src/features/themes/components/narrative-regenerate-button.tsx` — admin-only client mini-component (UI-406)
- [ ] `apps/cockpit/src/app/(dashboard)/themes/[slug]/tabs/narrative-tab.tsx` — nieuwe tab-content (UI-400, UI-402..407)
- [ ] `apps/cockpit/src/app/(dashboard)/themes/[slug]/theme-detail-view.tsx` — tab-registratie + default wijzigen (UI-401, UI-409)
- [ ] `apps/cockpit/src/app/(dashboard)/themes/[slug]/page.tsx` — parallel fetch narrative, doorgeven als prop (UI-409)
- [ ] `apps/cockpit/src/app/globals.css` (of nieuwe CSS-file) — Instrument Serif import + lede typography tokens (UI-402)
- [ ] `apps/cockpit/src/features/themes/README.md` — menu-update (UI-410)
- [ ] Tests (nieuwe + updates):
  - [ ] Nieuw: `packages/ai/__tests__/agents/theme-narrator.test.ts` — output-schema validatie, caps op output-length, briefing-verplicht-check, mock-LLM-response payload-capture
  - [ ] Nieuw: `packages/ai/__tests__/pipeline/synthesize-theme-narrative.test.ts` — guardrail-path (<2 meetings schrijft sentinel), happy path (≥2 meetings roept agent + upsert), EDGE-250 agent-failure laat oude rij staan
  - [ ] Update: `packages/ai/__tests__/pipeline/link-themes.test.ts` (of integration via `describeWithDb`) — hook roept `runThemeNarrativeSynthesis` voor elk `affected` theme_id na `recalculateThemeStats`
  - [ ] Nieuw: `apps/cockpit/__tests__/actions/themes-narrative.test.ts` — admin-guard, Zod-validatie, success-path via mock op `runThemeNarrativeSynthesis`, `revalidatePath`-call
  - [ ] Nieuw: `apps/cockpit/__tests__/queries/themes-narrative.test.ts` — `getThemeNarrative` staleness-berekening (generated_at < last_mentioned_at → is_stale=true), EDGE-254 null-safety, `listThemeMeetingSummaries` chronologische volgorde
  - [ ] Update: `apps/cockpit/__tests__/app/themes-detail.test.tsx` — nieuwe tab als default, markdown-render van narrative-secties, empty-state bij sentinel-briefing, staleness-banner bij `is_stale=true`, XSS-safety (EDGE-253), regenereer-knop verborgen voor non-admin
- [ ] Documentatie:
  - [ ] `docs/dependency-graph.md` — automatisch via pre-commit hook
  - [ ] `sprints/done/TH-014-theme-narrator-cross-meeting-synthese.md` — move bij afronding
  - [ ] Geen `docs/specs/prd-themes.md` wijziging in v1 — PRD covers v1 scope; deze sprint tekent de vervroeging van C13 aan in de sprint-footer

## Acceptance criteria

- `npm run type-check` en `npm run lint` groen.
- `npm run test` in `packages/ai`, `packages/database`, en `apps/cockpit` groen.
- `supabase db reset` groen — nieuwe migratie laadt schoon.
- Pipeline-draai op een test-meeting met identified_theme X (dat nu 3 mentions heeft): `theme_narratives` krijgt een rij met `theme_id = X`, alle zes secties gevuld, `signal_strength` in {sterk, matig, zwak}, `meetings_count_at_generation = 3`.
- Guardrail werkt: thema met 1 mention → `theme_narratives.briefing = '__insufficient__'`, `signal_strength = 'onvoldoende'`. UI toont empty-state UI-408 (meter 1/2, geen regen-knop).
- UI-check op `/themes/founder-ritme-samenwerking`: default-tab is "Verhaal". Lede in serif font, max 680px breed, achtergrond off-white (#faf9f5 of equivalent). De blinde vlek-sectie heeft amber accent + left-border. Meeting-chips inline klikbaar naar `/meetings/[id]`.
- Regenereer-knop werkt alleen voor admin: ingelogd als admin → klik triggert `regenerateThemeNarrativeAction`, pagina refresht, `updated_at` gewijzigd. Ingelogd als non-admin → knop niet zichtbaar; directe call naar action returnt `{ error: 'not authorized' }`.
- Staleness-banner verschijnt: handmatig `update themes set last_mentioned_at = now() where id = X` → refresh detail-page → banner zichtbaar. Na regenereer-klik verdwijnt banner (nieuwe `generated_at`).
- XSS-test: insert handmatig `<script>alert(1)</script>` + `<img src=x onerror=alert(1)>` in `theme_narratives.blind_spots` → open detail-page → geen alert, tags renderen inert. Geen `dangerouslySetInnerHTML` in renderpad.
- Observability: `/agents` toont theme-narrator in registry met correcte metadata. `agent_runs`-rijen verschijnen met `agent_name='theme-narrator'`, `prompt_version='v1'`, `metadata.theme_id=...`.
- EDGE-250: mock Anthropic-500 in test → `runThemeNarrativeSynthesis` returnt `{ success: false }`, console.warn gelogd, bestaande rij in `theme_narratives` blijft ongewijzigd, hoofd-pipeline blijft groen.
- Geen regressie: bestaande 5 tabs (Overzicht, Meetings, Besluiten, Open vragen, Mensen) blijven werken, `?tab=meetings` deeplinks blijven valide.
- Kost-check: één pipeline-run op een test-meeting met 3 affected themes → `agent_runs` toont 3 theme-narrator-calls, totaal input-tokens <20k, output-tokens <5k. Budget binnen verwachting.

## Handmatige test-stappen

1. Checkout TH-014 branch. `npm install` + `npm run type-check` + `npm run lint` + `npm run test` → groen.
2. `supabase db reset` → migratie laadt schoon; query `\d theme_narratives` in psql toont verwachte kolommen + RLS-policies.
3. Selecteer thema `Founder-ritme & samenwerking` (UUID `d0000000-0000-0000-0000-000000000005`, 4 mentions). Run handmatig `runThemeNarrativeSynthesis('d0000000-0000-0000-0000-000000000005')` via een tsx-script of de admin-action.
4. Query `select briefing, signal_strength, meetings_count_at_generation from theme_narratives where theme_id = 'd0000000-...';` → rij bestaat, briefing niet-leeg, strength in {sterk, matig, zwak}, count=4.
5. Open `/themes/founder-ritme-samenwerking` → default-tab "Verhaal" actief. Briefing in serif font bovenaan. Zes secties volgens mockup. Meeting-chips klikbaar.
6. Klik een meeting-chip → navigeert naar `/meetings/[id]`.
7. Tab-switch naar "Overzicht" → URL wordt `?tab=overview`, render werkt. Terug naar Verhaal via URL `/themes/founder-ritme-samenwerking` (geen param) → Verhaal is default.
8. **Guardrail-test.** Pak een emerging theme met 0 meeting_themes-rijen (recent aangemaakte proposal). Roep `runThemeNarrativeSynthesis` → `theme_narratives.briefing = '__insufficient__'`. Open detail-page → empty-state zichtbaar, geen regenereer-knop.
9. **Staleness-test.** `update themes set last_mentioned_at = now() where id = 'd0000000-...';` → refresh detail-page → amber banner bovenaan "Er zijn nieuwe meetings sinds deze synthese". Klik regenereer (als admin) → banner verdwijnt, content vernieuwd.
10. **Admin-only regenereer.** Log in als non-admin (bv. via tweede test-user) → regenereer-knop niet zichtbaar. Via netwerk-tool directe call naar `regenerateThemeNarrativeAction` met themeId → response `{ error: 'not authorized' }`.
11. **XSS-test.** Psql: `update theme_narratives set blind_spots = '<script>alert("xss")</script>Test<img src=x onerror=alert(1)>' where theme_id = 'd0000000-...';` → refresh detail-page → geen alert, `<script>`-tag rendert als tekst of wordt gestript, `onerror` triggert niet.
12. **Pipeline-hook-test.** Ingest een nieuwe Fireflies-meeting die aan thema X link → na pipeline-completion: `select updated_at from theme_narratives where theme_id = X;` → recent (<60s). Detail-page toont verse narrative. `agent_runs` heeft nieuwe theme-narrator-rij.
13. **Multi-thema-hook-test.** Meeting die aan 3 themes linkt → pipeline-hook roept synthese voor alle 3. `agent_runs` toont 3 nieuwe rijen met verschillende `metadata.theme_id`. Alle 3 `theme_narratives`-rijen hebben recente `updated_at`.
14. **Agent-failure.** Mock Anthropic API naar 500 in dev → ingest nieuwe meeting → pipeline loopt succesvol (geen crash), `theme_narratives` ongewijzigd, console.warn in logs. Theme detail page toont nog de vorige narrative + stale-banner.
15. **Registry-check.** Open `/agents` → theme-narrator zichtbaar met model Sonnet 4.5, status live, entrypoint-pad klikbaar. `agent_runs`-kolom toont recent uitgevoerde runs.

## Out of scope

- **Verification-gate (review/approve-flow voor narratives).** Bewust afwijkend van platform-principe in v1. Heroverwegen als de output in gebruik schadelijk of onjuist blijkt.
- **Versioning/history van narratives.** Elke regenerate overschrijft. Geen audit-trail van eerdere versies. Als jullie ooit "hoe zag dit thema er 3 weken geleden uit" willen kunnen vragen: aparte sprint met `theme_narrative_versions`-tabel.
- **Cron/scheduled regeneratie.** Nu: op elke `meeting_themes`-write. Kan later vervangen worden door cron als kosten of latency druk geven.
- **Debouncing van snelle herhaalde writes.** Beschreven in EDGE-251, uit scope in v1. Toevoegen als een batch-regenerate een rush-hour produceert.
- **Per-thema zichtbaarheids-scoping (private/internal/public).** Alle narratives zichtbaar voor authenticated users. Admin-only of team-scoped narratives: v2 als het team groeit.
- **MCP-tool `get_theme_narrative(theme_id)`.** Eerder in research-thread overwogen als MCP-first pad. Besloten om direct in UI te bouwen. MCP-tool later als jullie de narrative vanuit Claude Desktop willen opvragen — niet in v1.
- **Narrative in weekly-summary / management-insights.** Weekly en management-insights zijn tijdsgebaseerde syntheses; narrative is thema-gebaseerd. Combineren (bv. "wat speelde er deze week per thema") is een eigen sprint.
- **Narrative-gedreven e-mail digest.** Wekelijkse mail met "stale themes" of "nieuwe blinde vlekken": latere sprint. Kan leunen op de bestaande `theme_narratives`-tabel.
- **Export naar markdown/PDF.** Download-knop voor een narrative — niet gevraagd, niet nodig in v1.
- **Narrative-compare (diff tussen twee tijdstippen).** Vereist versioning. Niet nu.
- **Sentiment- of topic-tags op narrative.** Geen meta-classificatie in v1. Narrative is prose, niet data.
- **Empty-state-meter met "nodig tot drempel" voor alle drempelgebieden.** Guardrail-drempel hardcoded op 2. Configurable maken (per thema, per gebruiker): niet nodig.
- **Auto-translate naar Engels voor externe stakeholders.** Nederlands only in v1.
- **Theme-Narrator fine-tuning op historische correcties.** Human-in-the-loop correctie-flow bestaat niet (geen verification-gate). Fine-tuning komt pas in beeld als die flow er is.
