# Micro Sprint TH-010: Extraction-theme koppeling V1 (fundering)

## Doel

De bestaande meeting-level theme-koppeling rijker maken op het extraction-niveau. Nieuwe junction `extraction_themes` tussen `extractions` en `themes`, ThemeTagger geeft per match een lijst van `extractionIds` terug, pipeline schrijft die weg, en de bestaande theme detail page (`/themes/[slug]`) toont per meeting de concrete gekoppelde extractions als platte lijst onder de evidence-quote.

**Bewust minimaal.** Geen visuele typografie per extraction-type, geen grouping, geen AI narrative, geen moments-timeline. Alleen de fundering: welke concrete extracties horen bij welk thema. Alles daarbovenop (V2-visuele laag, narrative, moments) is aparte sprint.

Eerste tastbare resultaat: je opent `/themes/team-capaciteit-hiring`, klikt op de Meetings-tab, en ziet per meeting-kaart naast de evidence-quote een bullet-lijst met de gekoppelde extracties die de ThemeTagger aan dít thema hing — elke bullet toont het raw type-veld als prefix en de content, zonder cosmetica per type. De database kent 14 extraction-types (zie migratie `20260418130000_extractions_14_types.sql`); V1 behandelt ze allemaal gelijkwaardig en laat elegante labels + categorisering aan een V2-visuele-laag over.

## Requirements

| ID       | Beschrijving                                                                                                                                                                                                                                                                                    |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DATA-220 | Tabel `extraction_themes(extraction_id uuid, theme_id uuid, confidence text, created_at timestamptz default now())` met composite PK `(extraction_id, theme_id)`                                                                                                                                |
| DATA-221 | Foreign keys: `extraction_id → extractions(id) ON DELETE CASCADE`, `theme_id → themes(id) ON DELETE CASCADE`                                                                                                                                                                                    |
| DATA-222 | CHECK constraint `confidence IN ('medium', 'high')` — consistent met `meeting_themes`                                                                                                                                                                                                           |
| DATA-223 | RLS enabled + permissive policy (zelfde patroon als `meeting_themes`, `tasks`): read/write voor alle authenticated users                                                                                                                                                                        |
| DATA-224 | Indexes: `extraction_themes_theme_idx` op `theme_id`, `extraction_themes_extraction_idx` op `extraction_id`                                                                                                                                                                                     |
| DATA-225 | Types regenereren in `packages/database/src/types/database.ts`                                                                                                                                                                                                                                  |
| AI-220   | ThemeTagger Zod-schema (`ThemeTaggerOutputSchema`) krijgt per match `extractionIds: string[]` veld — verplicht aanwezig, mag leeg zijn                                                                                                                                                          |
| AI-221   | Prompt instrueert: _"Per match benoem je de `extractionIds` die dít thema dragen — kopieer exact de IDs uit de input-extractions-lijst. Minstens één per high/medium match."_                                                                                                                   |
| AI-222   | Post-Zod validatie in `tagMeetingThemes()`: (a) filter eerst non-UUID-shaped strings (regex-check, stillzwijgend), (b) strip daarna `extractionIds` die niet in de input voorkwamen (hallucinatie-guard, `console.warn` met meeting_id + theme_id). Niet crashen.                               |
| AI-225   | Post-Zod hard cap `EXTRACTION_IDS_PER_MATCH_CAP = 8` per match — consistent met `MATCHES_HARD_CAP = 4` patroon uit TH-002. Anthropic's structured-output schema accepteert geen `maxItems` op arrays; cap wordt in TS afgedwongen via `.slice(0, CAP)` na het filteren van AI-222.              |
| AI-223   | Input naar ThemeTagger bevat voortaan ook `id` per extraction (nu alleen `type` + `content`). Vereist contract-update in `MeetingContext.extractions`.                                                                                                                                          |
| AI-224   | Emerging-proposals krijgen géén extractionIds-veld terug — proposals leiden tot een nieuwe theme-row + meeting_themes-link met confidence `medium` (bestaand gedrag). V1 linkt proposal-emerging-themes nog niet op extraction-niveau.                                                          |
| FUNC-250 | Mutation `linkExtractionsToThemes(rows: {extractionId, themeId, confidence}[])` in `packages/database/src/mutations/extraction-themes.ts` met upsert op composite PK                                                                                                                            |
| FUNC-251 | Mutation `clearExtractionThemesForMeeting(meetingId)` — verwijdert alle `extraction_themes` rijen waar `extraction_id` hoort bij meeting (via join). Nodig voor regenerate + batch --force                                                                                                      |
| FUNC-252 | Pipeline-step `tag-themes.ts` schrijft `extraction_themes` weg nadat `meeting_themes` is gelinkt. Volgorde: proposals → clear (bij replace) → meeting_themes → extraction_themes → recalc stats                                                                                                 |
| FUNC-253 | Query `getThemeMeetings(themeId)` uitgebreid zodat per meeting-entry een `extractions: {id, type, content}[]` meekomt uit `extraction_themes`-junction (behalve `null` als geen match op extraction-niveau)                                                                                     |
| FUNC-254 | `regenerateMeetingThemesAction` cleart ook `extraction_themes` via `clearExtractionThemesForMeeting` — consistent met de bestaande `clearMeetingThemes`-cleanup                                                                                                                                 |
| FUNC-255 | `rejectThemeMatchAsAdmin` cascadet: bij verwijdering van `meeting_themes`-rij óók `extraction_themes` verwijderen voor (meeting_id, theme_id) paar. In dezelfde mutation, vóór het rejection-insert                                                                                             |
| UI-310   | Theme detail page — Meetings-tab: onder de evidence-quote per meeting-card een platte `<ul>` met gekoppelde extractions. Elke bullet: `<span>{type}:</span> {content}` — **raw type-string** als prefix in muted-kleur, geen NL-mapping, geen kleurvlak, geen icon. Type-cosmetica volgt in V2. |
| UI-311   | Meeting-card zonder gekoppelde extractions toont géén extractions-sectie (niet een lege lijst, niet een placeholder). Alleen de evidence-quote blijft zichtbaar — dat is hoe oude `meeting_themes`-rijen (pre-backfill) eruit zien                                                              |
| EDGE-220 | Match met 0 `extractionIds` in Tagger-output is valide — de `meeting_themes`-rij wordt wel ingeschoten, de `extraction_themes`-insert krijgt gewoon 0 rijen voor deze match                                                                                                                     |
| EDGE-221 | `linkExtractionsToThemes` met lege array: return `{ success: true, count: 0 }` zonder DB-call (consistent met bestaande `linkMeetingToThemes`)                                                                                                                                                  |
| FUNC-256 | Retroactieve backfill: `scripts/batch-tag-themes.ts --force` hergebruiken om bestaande meetings opnieuw te taggen zodat `extraction_themes` gevuld raakt. Geen code-werk nodig — script roept al `replace: true` op de pipeline-step aan, die nu via FUNC-252 óók de nieuwe junction vult       |

## Bronverwijzingen

- PRD: `docs/specs/prd-themes.md` → §2.1 (intent: themes bundelen meetings + besluiten + open vragen + quotes)
- PRD: `docs/specs/prd-themes.md` → §9.3 Meetings-tab + §9.4 Besluiten-tab (wat nu te ruw werkt zonder junction)
- Code: `packages/ai/src/agents/theme-tagger.ts` — Tagger input/output contract
- Code: `packages/ai/src/pipeline/steps/tag-themes.ts` — pipeline-step volgorde
- Code: `packages/database/src/mutations/meeting-themes.ts` — patroon voor nieuwe mutations
- Code: `packages/database/src/queries/theme-detail.ts` — `getThemeMeetings` uitbreiden
- Prototype (V2-doelbeeld, geen V1-scope): `apps/cockpit/src/app/(dashboard)/theme-lab/storyline/` — hoe het eruit zou kunnen zien _ná_ deze fundering
- Sessie-discussie (deze PR): beslissing voor junction i.p.v. array/denormalisatie

## Context

### Waarom deze fundering nu

De huidige theme detail page toont _"alle extractions uit alle gekoppelde meetings"_. Dat is te ruw: een founders-sync die 3 thema's raakt laat al zijn decisions onder alle 3 verschijnen. De PRD-belofte (_"thema is een bundel van meetings, besluiten, open vragen en quotes"_) wordt nu niet waargemaakt op besluit-niveau.

Door per match ook de specifieke extractions vast te leggen lossen we dit op zonder het bestaande verification-model te raken — extractions hebben al types, hebben al een review-flow, hebben al content. We voegen alleen één junction-tabel toe.

### Waarom geen type-velden op de junction

`extraction_themes` heeft geen `type` kolom. Het type staat op `extractions.type` — join geeft de waarheid. Dupliceren op de junction zou drift tussen junction en source introduceren.

### Tagger contract-verandering — exact

**Voor:**

```ts
MeetingContext.extractions: { type: string, content: string }[]
matches[i]: { themeId, confidence, evidenceQuote }
```

**Na:**

```ts
MeetingContext.extractions: { id: string, type: string, content: string }[]
matches[i]: { themeId, confidence, evidenceQuote, extractionIds: string[] }
```

De pipeline-step in `tag-themes.ts:82` mapt `extractionRows` nu al — ID-veld gewoon meenemen uit `getMeetingExtractions()` output.

### UI — exact wat wél en wat niet

**Wel in scope:**

- In `getThemeMeetings` nieuwe `extractions` field per meeting-entry
- Meetings-tab rendert die als `<ul>` onder de evidence-quote
- Raw `extractions.type` als platte tekst-prefix in muted-kleur (bv. `decision:`, `action_item:`, `risk:`, `need:` — exact de string uit de DB)

**Niet in scope:**

- NL-vertaling of anders vriendelijke labels per type — dat is een V2-helper
- Kleurvlakken per type (emerald/sky/amber/violet badges uit de prototype)
- Icon per type (Lucide icons zoals `CheckCircle2`, `Target`)
- Grouping: eerst "Besluiten" blok dan "Overig besproken"
- Collapse/expand per meeting-card
- "Toon oudere meetings" footer
- AI narrative / moments-rail / tab-herinrichting → allemaal latere sprints

### Proposal → emerging theme backfill-pad

AI-224 laat emerging-proposals bewust zonder `extractionIds` — ze krijgen alleen een `meeting_themes`-link vanuit hun origin-meeting. Als een proposal later via de review-flow `verified` wordt:

- De `meeting_themes`-link uit de origin-meeting staat er al (geschreven tijdens tagging).
- `extraction_themes` voor die theme bestaat nog **niet** (proposal kreeg geen IDs mee).
- Fix in V1: reviewer draait **"Thema's opnieuw taggen"** op de origin-meeting ná approve. Het nu-verified theme staat in `listVerifiedThemes`, de Tagger matcht normaal, en `extraction_themes` wordt alsnog gevuld.

Dit is handwerk in de review-flow. Automatiseren (approve-action triggert auto-regenerate op de origin-meetings) is een V2-verbetering, vraagt een extra veld op `themes` om origin-meetings te onthouden.

### Backfill-strategie

Bestaande `meeting_themes`-rijen hebben geen bijbehorende `extraction_themes`. Twee paden:

1. **Backfill-run uitvoeren** (aanbevolen): `scripts/batch-tag-themes.ts --force` over alle verified meetings. Goedkoop (Haiku), één middag, vult alles.
2. **Niks doen**: oude matches tonen alleen evidence-quote (zie UI-311). Nieuwe meetings krijgen de rijkere laag. Acceptabel tijdens rollout maar onbevredigend.

Kies bij deploy voor pad 1 tenzij Haiku-budget roet in het eten gooit.

## Deliverables

- [ ] `supabase/migrations/YYYYMMDDHHMMSS_create_extraction_themes.sql` — tabel, FK's, RLS, indexes
- [ ] `packages/database/src/types/database.ts` — regenereerd via `supabase gen types`
- [ ] `packages/database/src/mutations/extraction-themes.ts` — `linkExtractionsToThemes`, `clearExtractionThemesForMeeting`
- [ ] `packages/ai/src/validations/theme-tagger.ts` — Zod-uitbreiding met `extractionIds: string[]` per match
- [ ] `packages/ai/prompts/theme-tagger.md` — prompt-instructie toegevoegd
- [ ] `packages/ai/src/agents/theme-tagger.ts` — `MeetingContext.extractions` krijgt `id`, post-validation strip-logica voor onbekende IDs
- [ ] `packages/ai/src/pipeline/steps/tag-themes.ts` — `extractionIds` doorgeven aan `linkExtractionsToThemes`, clear-cascade bij replace
- [ ] `packages/database/src/queries/theme-detail.ts` — `getThemeMeetings` retourneert ook `extractions[]` per meeting
- [ ] `packages/database/src/mutations/meeting-themes.ts` — `rejectThemeMatchAsAdmin` cascadet naar `extraction_themes`
- [ ] `apps/cockpit/src/actions/themes.ts` — `regenerateMeetingThemesAction` cleart `extraction_themes` mee
- [ ] `apps/cockpit/src/app/(dashboard)/themes/[slug]/` — Meetings-tab toont extractions-lijst per meeting-card
- [ ] Tests (nieuwe + updates):
  - [ ] Nieuw: `packages/database/__tests__/mutations/extraction-themes.test.ts` — `linkExtractionsToThemes` upsert (lege array, duplicates, FK-errors), `clearExtractionThemesForMeeting` join-correctheid
  - [ ] Update: `packages/ai/__tests__/agents/theme-tagger.test.ts` — `extractionIds` in schema, non-UUID-filter, hallucinatie-filter, `EXTRACTION_IDS_PER_MATCH_CAP`
  - [ ] Update: `packages/ai/__tests__/pipeline/tag-themes.test.ts` — assert dat `extraction_themes`-rijen worden weggeschreven, replace-flow cleart junction, proposals schrijven nog steeds geen extraction-links
  - [ ] Update: `packages/database/__tests__/queries/themes.test.ts` (of theme-detail suite) — `getThemeMeetings` nieuwe `extractions[]` shape, inclusief meeting zonder gekoppelde extractions
  - [ ] Update: `apps/cockpit/__tests__/actions/themes.test.ts` — `regenerateMeetingThemesAction` cascadet naar `extraction_themes`, rejections blijven staan
  - [ ] Update: `apps/cockpit/__tests__/actions/themes-review.test.ts` — `rejectThemeMatchAsAdmin` cascadet naar `extraction_themes` vóór rejection-insert

## Acceptance criteria

- Migration draait schoon op lokale Supabase (`supabase db reset`).
- `npm run type-check` en `npm run lint` groen.
- Tagger run op een test-meeting: `extraction_themes`-rijen staan in de tabel, `extraction_id` zit in de meeting's extractions, `theme_id` is een verified theme, `confidence` match met `meeting_themes`.
- Theme detail page `/themes/team-capaciteit-hiring` toont per meeting-card een extractions-lijst (mits de batch-backfill is gedraaid).
- Reject één theme-match via de review-UI → `meeting_themes` row weg + bijbehorende `extraction_themes` rijen óók weg + `theme_match_rejections` aangemaakt.
- Regenerate één meeting → alle bestaande `extraction_themes` voor die meeting weg, nieuwe rijen geschreven, `theme_match_rejections` blijft staan.
- Tagger die een hallucinated `extractionId` teruggeeft → DB krijgt 'm niet, console-warning logt.

## Handmatige test-stappen

1. `supabase db reset` → migrations draaien, inclusief `extraction_themes`.
2. Via Supabase Studio: `\d extraction_themes` → juiste kolommen + FK's + indexes.
3. `npm run tag-themes-batch -- --force` in cockpit → batch-backfill draait over verified meetings.
4. Check `SELECT count(*) FROM extraction_themes` → groter dan 0, verhouding ~1:1 tot 1:4 met `meeting_themes`-rijen.
5. Open cockpit `/themes/team-capaciteit-hiring` → Meetings-tab → per meeting zie je extractions onder de quote met type-prefixes.
6. Review-flow: open een meeting-review met theme-links → reject één match → refresh theme-detail → die meeting's extractions zijn weg (niet meer verschenen onder dit thema).
7. Regenerate via `/meetings/[id]` _"Thema's opnieuw taggen"_-knop → detail-page update met nieuwe extraction-links (rejections blijven in effect).
8. Dashboard pills + donut: ongewijzigd. Mention-counts ongewijzigd. (Geen regressie op TH-004.)

## Out of scope

- **Visuele type-laag**: kleurvlakken, icons, groupings per extraction-type — aparte V2-sprint zodra we in de praktijk zien of type-scanning waarde toevoegt.
- **AI narrative + ThemeNarrator agent** — aparte V2-sprint.
- **Moments-timeline (clusters van meetings)** — aparte V2-sprint.
- **Tab-herinrichting (Overzicht als verhaal-view)** — aparte V2-sprint.
- **Proposal-emerging themes op extraction-niveau koppelen** (AI-224) — V2, vraagt ontwerp-keuze of een net-voorgesteld theme direct extractie-links krijgt.
- **Open vragen / needs als aparte UI-categorie** op de theme-page — blijft plat in de extractions-lijst via type-prefix.
- **Mention-count op extraction-niveau** — mention_count blijft meeting-gebaseerd (geen wijziging in `recalculate_theme_stats`).
- **Retroactieve rejection-replay**: als een rejection bestaat maar de junction-fundering is nieuw, tellen oude rejections niet mee voor extraction-links tot een regenerate draait. Acceptabel.
- **`email_extractions` (aparte tabel)**: wordt niet door ThemeTagger geraakt en blijft buiten deze junction. Emails krijgen pas theme-koppeling in een latere sprint; apart datamodel-ontwerp nodig (aparte `email_extraction_themes` tabel of een polymorphic link).
- **`risk` + andere tier-2 types**: behandelen we als elke andere `extractions`-rij. De Tagger krijgt ze via de extractions-input en linkt ze net als decisions/action_items — geen speciale weging, geen filter.
