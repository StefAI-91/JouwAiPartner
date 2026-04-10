# Micro Sprint DH-007: Userback API integratie en sync

## Doel

De volledige Userback import pipeline bouwen: API client, field mapping, sync strategie (initieel + incrementeel), sync Server Action, API route, en sync UI pagina. Na deze sprint kan een admin de "Sync Userback" knop klikken en worden alle 615+ Userback items geimporteerd, gemapt naar issues, en automatisch geclassificeerd door AI.

## Requirements

| ID       | Beschrijving                                                                     |
| -------- | -------------------------------------------------------------------------------- |
| FUNC-115 | Admin triggert Userback sync vanuit DevHub                                       |
| FUNC-116 | Haalt items op via Userback API met paginering                                   |
| FUNC-117 | Dedup op userback_id (ON CONFLICT DO UPDATE)                                     |
| FUNC-118 | Field mapping volgens specificatie                                               |
| FUNC-119 | Incremental sync via cursor (MAX userback_modified_at)                           |
| FUNC-120 | Eerste sync haalt alles op, volgende syncs alleen gewijzigd                      |
| FUNC-121 | 200ms delay tussen pagina's (rate limit)                                         |
| FUNC-122 | Return resultaat { imported, updated, skipped, total }                           |
| FUNC-126 | AI classificatie bij import: per nieuw item, sequentieel met 100ms delay         |
| FUNC-130 | POST route (handmatig, auth via session)                                         |
| FUNC-131 | Optioneel GET route voor Vercel Cron (auth via CRON_SECRET)                      |
| FUNC-132 | maxDuration = 60                                                                 |
| FUNC-142 | Server Action: syncUserback                                                      |
| INT-101  | fetchUserbackFeedbackPage                                                        |
| INT-102  | fetchAllUserbackFeedback                                                         |
| INT-103  | USERBACK_API_TOKEN env var, Authorization Bearer header                          |
| INT-104  | GET https://rest.userback.io/1.0/feedback                                        |
| INT-105  | Client bestand: packages/database/src/integrations/userback.ts                   |
| RULE-101 | Userback id -> userback_id                                                       |
| RULE-102 | description (regel 1) -> title                                                   |
| RULE-103 | description (volledig) -> description                                            |
| RULE-104 | feedback_type mapping: Bug->bug, Idea->feature_request, General->question        |
| RULE-105 | priority mapping: critical->urgent, important->high, neutral->medium, minor->low |
| RULE-106 | status mapping: Open->triage, In Progress->in_progress, Closed->done             |
| RULE-107 | email->reporter_email, name->reporter_name                                       |
| RULE-108 | page_url -> source_url                                                           |
| RULE-109 | Screenshots[0]?.url -> source_metadata.screenshot_url                            |
| RULE-110 | browser, os, resolution -> source_metadata                                       |
| RULE-111 | share_url -> source_metadata.share_url                                           |
| RULE-112 | volledig response -> source_metadata.raw_userback                                |
| RULE-113 | Due date 1970-01-01 is sentinel — filter weg                                     |
| RULE-114 | source = 'userback' voor alle geimporteerde items                                |
| RULE-115 | AI overschrijft NIET type/priority mapping van Userback                          |
| RULE-116 | AI vult component, severity, repro_steps aan bij import                          |
| RULE-117 | Koppeling via projects.userback_project_id = '127499'                            |
| UI-123   | Settings pagina op /settings                                                     |
| UI-124   | Import pagina op /settings/import                                                |
| UI-125   | Sync UI: project naam, laatste sync tijd, items count, sync knop, resultaat      |
| EDGE-101 | Due date 1970-01-01 wegfilteren                                                  |
| EDGE-102 | Description te lang voor title: neem regel 1 of AI-genereer                      |
| PERF-101 | 200ms delay tussen pagina's                                                      |
| PERF-102 | 100ms delay tussen AI classificaties                                             |
| PERF-103 | maxDuration = 60 seconden                                                        |

## Bronverwijzingen

- PRD: `docs/specs/prd-devhub.md` -> sectie "5.4 Userback API Integratie" (regels 544-690)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Flow 1: Userback import" (regels 143-163)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Sync strategie" (regels 585-641)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Sync UI" (regels 652-673)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Configuratie per project" (regels 675-681)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Sync API Route" (regels 645-650)

## Context

### Userback API Client

Bestand: `packages/database/src/integrations/userback.ts`

```typescript
// Haal 1 pagina op van de Userback REST API
function fetchUserbackFeedbackPage(options: {
  page: number;
  perPage?: number; // default 50
  updatedAfter?: string; // ISO date, voor incremental sync
}): Promise<UserbackFeedbackPage>;

// Haal alle pagina's op (met paginering + rate limiting)
function fetchAllUserbackFeedback(
  updatedAfter?: string, // null = volledige sync, date = incremental
): Promise<UserbackFeedbackItem[]>;
```

API details:

- **Endpoint:** `GET https://rest.userback.io/1.0/feedback?page={n}&per_page=50`
- **Auth:** `Authorization: Bearer ${process.env.USERBACK_API_TOKEN}`
- **Rate limit:** 200ms delay tussen pagina's
- **Paginering:** response bevat `_pagination.totalPages` om te weten wanneer te stoppen
- **Project filter:** op Userback projectId `127499` (caistudio.nl)

### Field mapping (volledig)

| Userback veld          | Issues veld                          | Transformatie                                                          |
| ---------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| id                     | userback_id                          | String conversion                                                      |
| description (regel 1)  | title                                | Neem eerste regel, max 200 chars                                       |
| description (volledig) | description                          | Volledig overnemen                                                     |
| feedback_type          | type                                 | Bug->'bug', Idea->'feature_request', General->'question'               |
| priority               | priority                             | critical->'urgent', important->'high', neutral->'medium', minor->'low' |
| status                 | status                               | Open->'triage', In Progress->'in_progress', Closed->'done'             |
| email                  | reporter_email                       | Direct overnemen                                                       |
| name                   | reporter_name                        | Direct overnemen                                                       |
| page_url               | source_url                           | Direct overnemen                                                       |
| Screenshots[0]?.url    | source_metadata.screenshot_url       | Eerste screenshot URL                                                  |
| browser                | source_metadata.browser              | Direct                                                                 |
| os                     | source_metadata.os                   | Direct                                                                 |
| resolution             | source_metadata.screen               | Direct                                                                 |
| share_url              | source_metadata.share_url            | Direct                                                                 |
| created_at             | source_metadata.userback_created_at  | Overnemen                                                              |
| modified_at            | source_metadata.userback_modified_at | Overnemen (ook sync cursor)                                            |
| (volledig response)    | source_metadata.raw_userback         | Hele JSON opslaan                                                      |
| -                      | source                               | Altijd 'userback'                                                      |

**BELANGRIJK:** due_date met waarde 1970-01-01 is een sentinel en moet genegeerd worden.

### Sync strategie

1. Admin klikt "Sync Userback"
2. Server Action bepaalt sync cursor: `MAX(source_metadata->>'userback_modified_at')` uit issues WHERE source='userback'
3. Cursor NULL -> haal ALLE pagina's (eerste sync)
4. Cursor bestaat -> haal alleen items gewijzigd na cursor (incremental)
5. Per pagina: 200ms delay, fetch, map naar issues
6. Upsert in batches van 50: `ON CONFLICT (userback_id) DO UPDATE`
7. Per NIEUW item (niet update): trigger AI classificatie
8. AI bij import vult aan: component, severity, repro_steps
9. AI overschrijft NIET: type en priority (die zijn al gemapped vanuit Userback)
10. Return: { imported, updated, skipped, total }

### AI classificatie bij import

Voor elk nieuw geimporteerd item wordt `runIssueClassifier` aangeroepen (uit DH-006). Dit draait sequentieel met 100ms delay tussen items. Bij import schrijft de AI:

- `component` kolom
- `severity` kolom
- `ai_classification` JSONB (met repro_steps, confidence, model, timestamp)
- `ai_classified_at`
- Activity log entry

De AI overschrijft NIET `type` en `priority` — die komen al correct uit de Userback mapping.

### Sync UI

Op `/settings/import`:

```
┌──────────────────────────────────────────────────────┐
│  Userback Import                                      │
│                                                       │
│  Project: caistudio.nl (ID: 127499)                  │
│  Laatste sync: 9 apr 2026, 14:32                     │
│  Items in DevHub: 152 (van 615 totaal)               │
│                                                       │
│  [Sync nu]                                            │
│                                                       │
│  ┌─ Laatste sync resultaat ────────────────────┐     │
│  │ 12 nieuw geimporteerd                       │     │
│  │ 3 bijgewerkt                                 │     │
│  │ 600 overgeslagen (duplicaat)                 │     │
│  │ AI classificatie: 12/12 afgerond             │     │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

### API Route

Bestand: `apps/devhub/src/app/api/ingest/userback/route.ts`

- POST (handmatig): auth via Supabase session, trigger vanuit settings/import UI
- GET (optioneel Vercel Cron): auth via CRON_SECRET
- `maxDuration = 60`
- Referentiepatroon: `apps/cockpit/src/app/api/ingest/fireflies/route.ts`

## Prerequisites

- [ ] Micro Sprint DH-001: Database (issues tabel met userback_id, source_metadata, projects.userback_project_id)
- [ ] Micro Sprint DH-002: Queries en mutations (insertIssue, updateIssue, insertActivity)
- [ ] Micro Sprint DH-003: DevHub app (routes, auth)
- [ ] Micro Sprint DH-006: AI classificatie agent (runIssueClassifier)

## Taken

- [ ] Maak `packages/database/src/integrations/userback.ts` met fetchUserbackFeedbackPage en fetchAllUserbackFeedback
- [ ] Maak field mapping functie die Userback items transformeert naar issue insert data
- [ ] Maak `apps/devhub/src/actions/import.ts` met syncUserback Server Action
- [ ] Maak `apps/devhub/src/app/api/ingest/userback/route.ts` (POST + optioneel GET)
- [ ] Maak `apps/devhub/src/app/settings/page.tsx` en `apps/devhub/src/app/settings/import/page.tsx` met sync UI
- [ ] Voeg `USERBACK_API_TOKEN` toe aan `.env.example`

## Acceptatiecriteria

- [ ] [INT-101] fetchUserbackFeedbackPage haalt 1 pagina op met correcte auth header
- [ ] [INT-102] fetchAllUserbackFeedback loopt door alle pagina's met 200ms delay
- [ ] [INT-103] API authenticatie via USERBACK_API_TOKEN env var
- [ ] [FUNC-117] Bestaande items worden niet gedupliceerd (upsert op userback_id)
- [ ] [FUNC-119] Incremental sync gebruikt cursor (MAX userback_modified_at)
- [ ] [FUNC-120] Eerste sync haalt alle items, volgende alleen gewijzigd
- [ ] [RULE-101..112] Alle field mappings zijn correct geimplementeerd
- [ ] [RULE-113] Due date 1970-01-01 wordt genegeerd
- [ ] [RULE-114] Alle geimporteerde items hebben source = 'userback'
- [ ] [RULE-115] AI overschrijft niet type/priority bij import
- [ ] [RULE-116] AI vult component, severity, repro_steps aan
- [ ] [FUNC-122] Sync retourneert { imported, updated, skipped, total }
- [ ] [UI-124] /settings/import pagina toont sync UI
- [ ] [UI-125] Sync resultaat wordt getoond na succesvolle sync
- [ ] [PERF-101] 200ms delay tussen API pagina's
- [ ] [PERF-102] 100ms delay tussen AI classificaties
- [ ] [PERF-103] API route heeft maxDuration = 60

## Geraakt door deze sprint

- `packages/database/src/integrations/userback.ts` (nieuw)
- `apps/devhub/src/actions/import.ts` (nieuw)
- `apps/devhub/src/app/api/ingest/userback/route.ts` (nieuw)
- `apps/devhub/src/app/settings/page.tsx` (nieuw)
- `apps/devhub/src/app/settings/import/page.tsx` (nieuw)
- `.env.example` (bijgewerkt)
