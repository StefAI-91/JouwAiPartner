# Sprint 036: Org Summary met E-mails + Timeline

## Doel

De organisatie-briefing op hetzelfde niveau brengen als de project-briefing: één geaggregeerde context + briefing + chronologische timeline die **meetings én e-mails** samenneemt. Geen aparte AI-blokken per databron — één verhaal per entiteit, conform de vision (`vision-ai-native-architecture.md` §3.2: "downstream consumers don't need to know where knowledge came from").

Zichtbaar op zowel `/clients/[id]` (client/partner) als `/administratie/[id]` (advisor/internal/supplier).

## Requirements

| ID       | Beschrijving                                                                                                          |
| -------- | --------------------------------------------------------------------------------------------------------------------- |
| AI-030   | `runOrgSummarizer` accepteert verified emails naast meetings                                                          |
| AI-031   | `OrgSummaryOutputSchema` krijgt een `timeline`-veld (meetings + emails door elkaar, chronologisch)                    |
| AI-032   | Org-prompt: zonder gekoppelde projecten → relatie-gerichte briefing (sentiment, contact, trust)                       |
| AI-033   | Org-prompt: met gekoppelde projecten → overkoepelende briefing over alle projecten heen                               |
| FUNC-060 | `generateOrgSummaries` haalt verified e-mails op (via `emails.organization_id` + `email_extractions.organization_id`) |
| FUNC-061 | Early-return als org noch verified meetings noch verified emails heeft                                                |
| FUNC-062 | Timeline wordt opgeslagen als `structured_content` op de briefing-summary (zelfde patroon als project)                |
| UI-080   | `OrgBriefing` component op `/administratie/[id]` boven "Contactpersonen"                                              |
| UI-081   | `OrgBriefing` component op `/clients/[id]` boven projects/meetings                                                    |
| UI-082   | `OrgTimeline` component: gemixte meeting + email entries, oud → nieuw, met type-badge                                 |
| UI-083   | `RegenerateOrgSummaryButton` voor handmatige ververs-knop (fallback)                                                  |

## Bronverwijzingen

- Vision: `docs/specs/vision-ai-native-architecture.md` §3.2 (aggregeer per entiteit)
- Vision: `docs/specs/vision-ai-native-architecture.md` §4.1 (Project Summarizer rol — org is identiek)
- Bestaande Project Summarizer: `packages/ai/src/agents/project-summarizer.ts` (`runProjectSummarizer` — blueprint)
- Bestaande pipeline: `packages/ai/src/pipeline/summary-pipeline.ts:168-260` (`generateOrgSummaries` — uit te breiden)
- Bestaande email-trigger: `packages/ai/src/pipeline/summary-pipeline.ts:343-413` (`triggerSummariesForEmail` — wiring bestaat al)
- Project-page UI referentie: `apps/cockpit/src/components/projects/project-briefing.tsx` + `project-timeline.tsx`
- Administratie-pagina: `apps/cockpit/src/app/(dashboard)/administratie/[id]/page.tsx`
- Eerdere sprint 030 dekt org-page UI basaal (context + briefing, géén emails, géén timeline). Deze sprint completeert die scope voor wat de briefing zelf betreft.

## Context

### Huidige staat

- `runOrgSummarizer` produceert alleen `{ context, briefing }` op basis van meetings. Geen emails, geen timeline.
- `generateOrgSummaries` haalt alleen meetings op.
- `triggerSummariesForMeeting` én `triggerSummariesForEmail` roepen `generateOrgSummaries` al aan — wiring is er, maar de functie doet niks met emails.
- UI toont op de administratie-pagina alleen contactpersonen + e-maillijst. Geen briefing, geen timeline.

### Ontwerpkeuzes (door Stef bevestigd)

1. **Positie op de pagina:** grote briefing-card bovenaan, consistent met projectpagina's (niet in tabs).
2. **Relatie-gerichte briefing bij orgs zonder projecten:** bij Jongbloed (adviseur, 0 projecten) focust de briefing op sentiment, openstaande vragen, aandachtspunten in de relatie. Bij orgs mét projecten is het overkoepelend over alle projecten heen.
3. **Regeneratie-trigger:** na élke verified meeting of verified email die aan de org hangt. Geen nightly batch. Handmatige ververs-knop als fallback.

### Waarom geen apart "AI e-mail samenvatting"-blok op de pagina

Dat zou fragmentatie introduceren (e-mail samenvatting + meeting samenvatting + straks call samenvatting = vier overlappende verhalen). Conform de vision aggregeren we per entiteit, niet per databron. De e-maillijst blijft als feitelijk archief staan — de synthese zit in de briefing bovenaan.

### Timeline-shape

E-mails en meetings komen door elkaar in één chronologische lijst. Per entry:

```ts
{
  date: "YYYY-MM-DD",
  source_type: "meeting" | "email",
  title: string,         // meeting titel of email onderwerp
  summary: string,       // één zin: wat gebeurde er
  key_decisions: string[],
  open_actions: string[],
}
```

Dit vereist een nieuw `OrgTimelineEntrySchema` (vergelijkbaar met `TimelineEntrySchema` in `project-summary.ts`, maar met `source_type` + flexibelere `meeting_type` → omdat emails geen meeting_type hebben).

### Verwachting voor de prompt

De Org Summarizer-prompt moet twee takken ondersteunen:

```
ALS aantal_projecten == 0:
  Briefing focus → relatie: klant-sentiment, openstaande vragen,
  communicatiefrequentie, trust-indicatoren, aandachtspunten in de relatie
ALS aantal_projecten >= 1:
  Briefing focus → overkoepelend: status per project samengevat,
  cross-project risico's, klant-sentiment over projecten heen
```

### Right-sizing

Haiku 4.5 volstaat. Input is gestructureerd (meeting-samenvattingen + e-mail snippets), output is kort, geen complex reasoning.

## Prerequisites

Geen blokkers. Alle benodigde infrastructuur bestaat:

- `summaries` tabel (sprint 015/016)
- `summary_versions` + `structured_content` (sprint 016)
- `email_extractions` + verification flow (sprint 034)
- `triggerSummariesForEmail` wiring (bestaat)

## Taken

### AI-laag (`packages/ai/`)

- [ ] [AI-031] `packages/ai/src/validations/project-summary.ts` — nieuwe `OrgTimelineEntrySchema` toevoegen met `source_type: 'meeting' | 'email'`. Uitbreiden van `OrgSummaryOutputSchema` met `timeline: OrgTimelineEntrySchema[]`.
- [ ] [AI-030] `packages/ai/src/agents/project-summarizer.ts` — `runOrgSummarizer` signature uitbreiden met optionele `emails: EmailInput[]` parameter. Formatter `formatEmails` hergebruiken.
- [ ] [AI-032][AI-033] Org-prompt (`ORG_SYSTEM_PROMPT`) herschrijven:
  - Context blijft zoals nu (neutrale beschrijving van de org).
  - Briefing bevat nu een if-else op aantal projecten: relatie-gericht vs. overkoepelend.
  - Timeline-instructies toevoegen: alle meetings + relevante emails chronologisch, per entry `source_type` invullen.

### Pipeline-laag (`packages/ai/src/pipeline/`)

- [ ] [FUNC-060] `generateOrgSummaries` uitbreiden:
  - Na meetings-query: verified emails ophalen met `emails.organization_id = organizationId` **en** via `email_extractions` (volg het patroon van `triggerSummariesForEmail`, regels 343-385).
  - Dedupliceren op email_id.
  - `formatEmails` input doorgeven aan `runOrgSummarizer`.
- [ ] [FUNC-061] Early-return vervangen: als `meetings.length === 0 && emails.length === 0` → skip. Huidige check kijkt alleen naar meetings.
- [ ] [FUNC-062] Timeline opslaan als `structured_content` op de briefing-summary (gelijk aan project: zie `summary-pipeline.ts:132`).
- [ ] Geen nieuwe trigger nodig: `triggerSummariesForEmail` (`summary-pipeline.ts:343`) roept `generateOrgSummaries` al aan. Enkel de interne implementatie verandert.

### Database-laag (`packages/database/`)

- [ ] `getOrganizationById` uitbreiden of nieuwe query `getOrganizationBriefing`: haalt laatste context + briefing summary op voor een org, inclusief `structured_content.timeline`. Zelfde patroon als project-page.
- [ ] Project-count per org teruggeven in detail-query (nodig voor de prompt-tak-keuze — al dan niet relatie-gericht).

### UI-laag (`apps/cockpit/`)

- [ ] [UI-080][UI-081] `apps/cockpit/src/components/organizations/org-briefing.tsx` (nieuw):
  - Props: `context`, `briefing`, `updatedAt`, `orgId`.
  - Layout: grote card bovenaan — titel "Briefing", briefing-tekst, context als tweede blok, "Ververs"-knop.
  - Hergebruik patroon van `apps/cockpit/src/components/projects/project-briefing.tsx`.
- [ ] [UI-082] `apps/cockpit/src/components/organizations/org-timeline.tsx` (nieuw):
  - Props: `entries: OrgTimelineEntry[]`.
  - Per entry: datum, source-type icon (mail vs. meeting), titel, samenvatting, key_decisions als subtiele lijst, open_actions als highlight.
  - Sorteer op datum oplopend (zoals project-timeline).
- [ ] [UI-083] `apps/cockpit/src/components/organizations/regenerate-org-summary-button.tsx` (nieuw) — aanroep naar server action, toast op success.
- [ ] Integreer in `apps/cockpit/src/app/(dashboard)/administratie/[id]/page.tsx` boven Contactpersonen.
- [ ] Integreer in `apps/cockpit/src/app/(dashboard)/clients/[id]/page.tsx` boven de bestaande secties (als die pagina al bestaat; anders in scope van sprint 030).
- [ ] Lege-state: als er geen meetings én geen emails zijn → briefing-card verbergen, subtiele uitleg tonen ("nog geen verified content").

### Server Actions

- [ ] `apps/cockpit/src/actions/summaries.ts` — `regenerateOrgSummaryAction(organizationId)` toevoegen (of bestaande `regenerateSummaryAction` hergebruiken als die al generiek is).

## Acceptatiecriteria

- [ ] [AI-030] `runOrgSummarizer` accepteert `emails` parameter en gebruikt ze in de prompt
- [ ] [AI-031] `OrgSummaryOutput` bevat `timeline: OrgTimelineEntry[]`
- [ ] [AI-032] Org zonder projecten: briefing is relatie-gericht (sentiment, communicatie, trust)
- [ ] [AI-033] Org met ≥1 project: briefing is overkoepelend (status over alle projecten, cross-project signalen)
- [ ] [FUNC-060] `generateOrgSummaries` haalt verified e-mails op via `emails.organization_id` + `email_extractions.organization_id`, ontdubbelt
- [ ] [FUNC-061] Geen verified meetings **en** geen verified emails → early-return met duidelijke log
- [ ] [FUNC-062] Timeline wordt opgeslagen als `structured_content` op de briefing-summary en is uitleesbaar via bestaande `getLatestSummary`-query
- [ ] [UI-080] `/administratie/[id]` toont `OrgBriefing` bovenaan wanneer er een briefing bestaat
- [ ] [UI-081] `/clients/[id]` toont `OrgBriefing` bovenaan (indien pagina bestaat)
- [ ] [UI-082] `OrgTimeline` toont meetings + e-mails door elkaar, chronologisch, met duidelijk onderscheid in source-type
- [ ] [UI-083] Ververs-knop triggert regeneratie en laat toast zien
- [ ] Na verificatie van een nieuwe e-mail (via email review) wordt de org-briefing automatisch vernieuwd (trigger al bestaand)
- [ ] Na verificatie van een nieuwe meeting wordt de org-briefing automatisch vernieuwd (trigger al bestaand)

## Handmatige testcase (Jongbloed)

Na oplevering moet het volgende kloppen op `/administratie/<jongbloed-id>`:

1. Briefing-card bovenaan toont een **relatie-gericht** verhaal (0 projecten).
2. Briefing benoemt Jan-Willem Wijnbergen als primaire contactpersoon.
3. Briefing noemt concreet de twee Hoog-prioriteit voorbereidingsmails van 13 apr.
4. Timeline bevat alle 5 e-mails in chronologische volgorde, elk met source-type badge `email`.
5. Eén nieuwe verified e-mail over Jongbloed → briefing wordt binnen seconden hergegenereerd (check logs: `[generateOrgSummaries]`).

## Geraakt door deze sprint

- `packages/ai/src/validations/project-summary.ts` (gewijzigd — `OrgTimelineEntrySchema`, uitbreiding `OrgSummaryOutputSchema`)
- `packages/ai/src/agents/project-summarizer.ts` (gewijzigd — `runOrgSummarizer` + `ORG_SYSTEM_PROMPT`)
- `packages/ai/src/pipeline/summary-pipeline.ts` (gewijzigd — `generateOrgSummaries` haalt emails op)
- `packages/database/src/queries/organizations.ts` (gewijzigd — `getOrganizationById` of aparte briefing-query)
- `apps/cockpit/src/actions/summaries.ts` (gewijzigd — regenerate action voor org)
- `apps/cockpit/src/components/organizations/org-briefing.tsx` (nieuw)
- `apps/cockpit/src/components/organizations/org-timeline.tsx` (nieuw)
- `apps/cockpit/src/components/organizations/regenerate-org-summary-button.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/administratie/[id]/page.tsx` (gewijzigd — briefing + timeline boven contactpersonen)
- `apps/cockpit/src/app/(dashboard)/clients/[id]/page.tsx` (gewijzigd — indien pagina bestaat)

## Open vragen / discussiepunten

- **Scope 030:** Sprint 030 (`sprint-030-organization-page-summary.md`) dekt de bredere `/clients/[id]` rebuild (projectcards, statuspipeline, meetings-sectie etc.). Deze sprint (036) dekt alléén de briefing + timeline, cross-cutting over beide routes. Sprint 030 kan blijven voor de overige UI-onderdelen, of worden samengevoegd. Aanbeveling: laat 030 staan voor de rest van de rebuild, maar verwijder daaruit de context+briefing-taken (UI-042, UI-043) omdat deze sprint ze completer dekt.
- **Structured timeline opslag:** we slaan timeline nu op als `structured_content` JSON op de briefing-summary. Als het aantal entries groot wordt (>100) kan dit een prestatie-issue worden. Dan verhuizen naar aparte `summary_timeline_entries` tabel. Niet nu.
- **Email snippet = preview, niet volledige body:** net als bij project-summary gebruiken we `snippet` (eerste ~200 tekens). Voor sommige kritieke mails zou je volledige body willen gebruiken. Uit scope — eerst kijken hoe de kwaliteit is.
