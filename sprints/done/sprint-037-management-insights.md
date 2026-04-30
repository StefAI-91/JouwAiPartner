# Sprint 037: Management Insights — cross-meeting signalering

> **Scope-afbakening.** Bouwt voort op sprint 035 (board-meetings + management-hub). Voegt een AI-inzichtenblok toe bovenaan `/intelligence/management` dat cross-meeting patronen signaleert. Geen harde actiepunten, geen checkboxes, geen assignees — puur suggestieve signalering die de mens kan oppakken of dismissen. Past in de Analyst-agent pijler uit de visie (stap 1).

## Doel

Na deze sprint:

1. Draait een **Management Insights agent** (Sonnet) die de samenvattingen + segmenten van alle board-meetings analyseert en suggestieve inzichten genereert.
2. Toont `/intelligence/management` bovenaan een **inzichtenblok** met drie secties:
   - **Mogelijke opvolging** — onderwerpen/afspraken die besproken zijn maar niet meer terugkwamen in latere meetings.
   - **Klant pipeline** — per besproken klant/project een one-liner status op basis van de laatste keer dat het ter sprake kwam, met "laatst besproken" datum.
   - **Terugkerende thema's** — onderwerpen die in 3+ meetings terugkomen, met indicatie of het escaleert, stabiel is, of afgerond lijkt.
3. Zijn individuele inzichten **dismissable** — Stef/Wouter kan een inzicht wegklikken zodat het niet meer terugkomt.
4. Worden inzichten opgeslagen in de `summaries`-tabel (zelfde patroon als weekly summary) zodat ze niet bij elke pageload opnieuw gegenereerd hoeven worden.
5. Kan een **regenerate**-knop de inzichten opnieuw genereren (handmatig, geen cron).

**Expliciet niet in scope:**

- Automatische cron/scheduled regeneratie (komt later bij Analyst agent)
- Extractie van harde actiepunten uit meetings
- Integratie met emails of andere bronnen (alleen board-meetings)
- Notificaties of Slack alerts
- Historische vergelijking ("vorige week vs deze week")

## Requirements

| ID       | Beschrijving                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DATA-063 | Tabel `dismissed_insights` met kolommen: `id`, `user_id`, `insight_key` (uniek hash van het inzicht), `dismissed_at`. RLS: user ziet alleen eigen.                 |
| FUNC-041 | Query `getBoardMeetingSummaries(limit?)` retourneert samenvattingen + segmenten van board-meetings (verified, desc by date).                                       |
| FUNC-042 | Query `getManagementInsights()` retourneert het laatst gegenereerde management insights record uit `summaries`.                                                    |
| FUNC-043 | Query `getDismissedInsightKeys(userId)` retourneert alle dismissed insight keys voor een user.                                                                     |
| FUNC-044 | Mutation `dismissInsight(userId, insightKey)` voegt een dismissed insight toe.                                                                                     |
| FUNC-045 | Mutation `saveManagementInsights(structured_content)` slaat inzichten op in `summaries` (entity_type: "company", summary_type: "management_insights").             |
| AI-014   | Agent `management-insights.ts` (Sonnet) ontvangt board-meeting samenvattingen en genereert drie secties: mogelijke_opvolging, klant_pipeline, terugkerende_themas. |
| AI-015   | Validatie `ManagementInsightsOutputSchema` (Zod) voor de gestructureerde output van de agent.                                                                      |
| AI-016   | Pipeline `management-insights-pipeline.ts` orchestreert: data ophalen → agent aanroepen → opslaan in summaries.                                                    |
| UI-233   | Inzichtenblok bovenaan `/intelligence/management` met drie secties in cards.                                                                                       |
| UI-234   | Elke insight-regel heeft een dismiss-knop (X) die via Server Action `dismissInsight()` aanroept.                                                                   |
| UI-235   | "Genereer inzichten" knop die de pipeline triggert (vergelijkbaar met bestaande "Scan needs" knop).                                                                |
| UI-236   | Empty state wanneer er nog geen inzichten gegenereerd zijn.                                                                                                        |
| UI-237   | Loading state tijdens generatie.                                                                                                                                   |

## Taken

### Taak 1: Database — dismissed_insights tabel

Migratie voor `dismissed_insights` tabel + RLS.

- [ ] Migratie `supabase/migrations/YYYYMMDD_dismissed_insights.sql`
  - `id uuid PK default gen_random_uuid()`
  - `user_id uuid NOT NULL references auth.users(id)`
  - `insight_key text NOT NULL`
  - `dismissed_at timestamptz NOT NULL default now()`
  - `UNIQUE(user_id, insight_key)`
- [ ] RLS: `SELECT` en `INSERT` voor `auth.uid() = user_id`
- [ ] Types regenereren

**Geraakt:**

- `supabase/migrations/`
- `packages/database/src/types/database.ts`

### Taak 2: Queries + Mutations

- [ ] `packages/database/src/queries/management-insights.ts`
  - `getBoardMeetingSummaries(client, limit = 20)` — board-meetings met summary + segments (uit `summaries` tabel of `meetings.summary`)
  - `getManagementInsights(client)` — laatste record uit `summaries` waar `summary_type = 'management_insights'`
  - `getDismissedInsightKeys(client, userId)` — alle insight_keys voor user
- [ ] `packages/database/src/mutations/management-insights.ts`
  - `saveManagementInsights(client, structured_content)` — upsert in summaries
  - `dismissInsight(client, userId, insightKey)` — insert in dismissed_insights

**Geraakt:**

- `packages/database/src/queries/management-insights.ts` (nieuw)
- `packages/database/src/mutations/management-insights.ts` (nieuw)

### Taak 3: AI Agent — Management Insights

- [ ] `packages/ai/src/validations/management-insights.ts`
  - `ManagementInsightsOutputSchema` met drie arrays:
    - `mogelijke_opvolging`: `{ key: string, onderwerp: string, context: string, laatst_besproken: string, meeting_titels: string[] }`
    - `klant_pipeline`: `{ key: string, naam: string, status_samenvatting: string, laatst_besproken: string, signaal: "positief" | "neutraal" | "risico" }`
    - `terugkerende_themas`: `{ key: string, thema: string, frequentie: number, trend: "escalerend" | "stabiel" | "afnemend", toelichting: string }`
- [ ] `packages/ai/src/agents/management-insights.ts`
  - System prompt: je bent een management-analist, analyseert board-meeting samenvattingen, signaleert patronen, geen harde opdrachten maar suggesties
  - Model: Claude Sonnet (met prompt caching)
  - Input: array van meeting samenvattingen met datum, titel, segments
  - Output: `ManagementInsightsOutput`

**Geraakt:**

- `packages/ai/src/validations/management-insights.ts` (nieuw)
- `packages/ai/src/agents/management-insights.ts` (nieuw)

### Taak 4: Pipeline

- [ ] `packages/ai/src/pipeline/management-insights-pipeline.ts`
  - `generateManagementInsights()`: admin client → `getBoardMeetingSummaries()` → format als agent input → `runManagementInsightsAgent()` → `saveManagementInsights()`
  - Guard: minimaal 3 board-meetings nodig, anders early return met melding

**Geraakt:**

- `packages/ai/src/pipeline/management-insights-pipeline.ts` (nieuw)

### Taak 5: Server Actions

- [ ] `apps/cockpit/src/actions/management-insights.ts`
  - `generateManagementInsightsAction()` — roept pipeline aan, revalidateert path
  - `dismissInsightAction(insightKey: string)` — valideert input (Zod), roept mutation aan

**Geraakt:**

- `apps/cockpit/src/actions/management-insights.ts` (nieuw)

### Taak 6: UI — Inzichtenblok

- [ ] `apps/cockpit/src/components/intelligence/management-insights-panel.tsx` (Server Component wrapper)
  - Haalt `getManagementInsights()` + `getDismissedInsightKeys()` op
  - Filtert dismissed inzichten uit
  - Rendert drie secties als cards
- [ ] `apps/cockpit/src/components/intelligence/management-insight-card.tsx` (Client Component)
  - Toont individueel inzicht met dismiss-knop
  - Kleur-indicator voor signaal/trend (groen/oranje/rood)
- [ ] `apps/cockpit/src/components/intelligence/generate-insights-button.tsx` (Client Component)
  - Knop met loading state, roept `generateManagementInsightsAction()` aan
  - Vergelijkbaar patroon als `scan-needs-button.tsx`
- [ ] Integratie in `/intelligence/management/page.tsx`
  - Inzichtenblok bovenaan, boven de meetinglijst
  - Genereer-knop in de header

**Geraakt:**

- `apps/cockpit/src/components/intelligence/management-insights-panel.tsx` (nieuw)
- `apps/cockpit/src/components/intelligence/management-insight-card.tsx` (nieuw)
- `apps/cockpit/src/components/intelligence/generate-insights-button.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/intelligence/management/page.tsx`

### Taak 7: API Route (pipeline trigger)

- [ ] `apps/cockpit/src/app/api/management-insights/generate/route.ts`
  - POST endpoint dat de pipeline triggert
  - Auth check (alleen admins)
  - Wordt aangeroepen door de Server Action

**Geraakt:**

- `apps/cockpit/src/app/api/management-insights/generate/route.ts` (nieuw)

## Acceptatiecriteria

- [ ] "Genereer inzichten" knop op management pagina genereert cross-meeting analyse
- [ ] Inzichten tonen drie duidelijke secties: opvolging, pipeline, thema's
- [ ] Elk inzicht is individueel te dismissen en komt niet meer terug
- [ ] Inzichten worden opgeslagen en bij herbezoek direct getoond (geen re-generatie nodig)
- [ ] Toon past bij bestaande intelligence-pagina's (zelfde designtaal)
- [ ] Lege staat is netjes afgehandeld (geen inzichten, te weinig meetings)
- [ ] Type-check (`npm run type-check`) slaagt
- [ ] Geen regressie op bestaande management-pagina functionaliteit

## Bronverwijzingen

- Sprint 035: `sprints/done/sprint-035-board-meetings-management.md` (board-meetings basis)
- Management pagina: `apps/cockpit/src/app/(dashboard)/intelligence/management/page.tsx`
- Board meeting card: `apps/cockpit/src/components/intelligence/board-meeting-card.tsx`
- Board meeting query: `packages/database/src/queries/meetings.ts` (`listBoardMeetings`)
- Weekly summarizer (patroon): `packages/ai/src/agents/weekly-summarizer.ts`
- Weekly pipeline (patroon): `packages/ai/src/pipeline/weekly-summary-pipeline.ts`
- Weekly summary opslag: `packages/database/src/mutations/summaries.ts` (`createSummaryVersion`)
- Scan needs button (UI patroon): `apps/cockpit/src/components/intelligence/scan-needs-button.tsx`
- Needs scanner (agent patroon): `packages/ai/src/agents/needs-scanner.ts`
- Visie doc (Analyst agent): `docs/specs/vision-ai-native-architecture.md` sectie 4.1

## Context

### Agent-prompt richtlijnen

De management insights agent verschilt fundamenteel van de extractor:

| Extractor                         | Management Insights Agent                |
| --------------------------------- | ---------------------------------------- |
| Per meeting                       | Cross-meeting (alle board-meetings)      |
| Feiten extraheren                 | Patronen signaleren                      |
| Harde output (besluit, actiepunt) | Suggestieve output (mogelijke opvolging) |
| Altijd actie vereist              | Dismiss is een valide reactie            |

De prompt moet expliciet benoemen:

- "Je signaleert, je geeft geen opdrachten"
- "Als iets maar in 1 meeting voorkwam en niet terugkwam, is dat geen patroon — tenzij het een concrete afspraak was"
- "Klant-pipeline: geef de status zoals die in de meetings besproken werd, voeg geen oordeel toe"
- "Wees kort — liever 5 scherpe inzichten dan 15 vage"

### Opslag-patroon (bestaand)

Hergebruikt het `summaries`-tabel patroon van weekly summaries:

```
entity_type: "company"
entity_id: "00000000-0000-0000-0000-000000000002"  (apart van weekly = 0001)
summary_type: "management_insights"
content: <management_summary tekst>
structured_content: { mogelijke_opvolging: [...], klant_pipeline: [...], terugkerende_themas: [...] }
```

### Dismiss-mechanisme

Elke inzicht-regel krijgt een deterministische `key` (bijv. `opvolging:svpe-vervolgcall` of `pipeline:looping`). Bij dismiss wordt deze key opgeslagen per user. Bij het tonen worden dismissed keys uitgefilterd. Bij regeneratie kunnen dezelfde keys terugkomen (dan zijn ze nog steeds dismissed) of verdwijnen (dan ruimt een nightly cleanup de orphan dismissals op — niet in scope van deze sprint).

### Toon en taal

- **Taal:** Nederlands
- **Toon:** Suggestief, niet dwingend. "Werd besproken op 13 april, niet meer teruggekomen" i.p.v. "Je moet dit opvolgen"
- **Lengte:** Max 2 zinnen per inzicht
- **Design:** Light cards, subtiele kleur-indicators (geen alarmerend rood), past bij bestaande intelligence UI

## Geraakt door deze sprint

**Nieuw:**

- `supabase/migrations/YYYYMMDD_dismissed_insights.sql`
- `packages/database/src/queries/management-insights.ts`
- `packages/database/src/mutations/management-insights.ts`
- `packages/ai/src/validations/management-insights.ts`
- `packages/ai/src/agents/management-insights.ts`
- `packages/ai/src/pipeline/management-insights-pipeline.ts`
- `apps/cockpit/src/actions/management-insights.ts`
- `apps/cockpit/src/components/intelligence/management-insights-panel.tsx`
- `apps/cockpit/src/components/intelligence/management-insight-card.tsx`
- `apps/cockpit/src/components/intelligence/generate-insights-button.tsx`
- `apps/cockpit/src/app/api/management-insights/generate/route.ts`

**Bestaand (aangepast):**

- `apps/cockpit/src/app/(dashboard)/intelligence/management/page.tsx`
- `packages/database/src/types/database.ts` (regenerated)
