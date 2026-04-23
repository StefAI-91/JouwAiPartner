# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Read at Session Start

**Before doing any work**, read [`docs/dependency-graph.md`](docs/dependency-graph.md) for a complete map of all functions, queries, mutations, actions, and pipelines — including what calls what. This gives you instant context on blast radius and data flow without needing to search.

> The graph is auto-generated from the actual codebase. The Husky pre-commit hook regenerates it automatically when `.ts`/`.tsx` files in `packages/` or `apps/` are staged. Handmatige trigger: `npm run dep-graph`.

## Vision: AI-Native Operating System

**Read first:** [`docs/specs/vision-ai-native-architecture.md`](docs/specs/vision-ai-native-architecture.md) — the north star for all platform development. Every sprint, feature, and architectural decision must align with this vision.

The platform is a **full-circle AI-native operating system** with four quadrants:

| Quadrant     | App             | Role                                                            | AI Acts As      |
| ------------ | --------------- | --------------------------------------------------------------- | --------------- |
| **Cockpit**  | `apps/cockpit/` | Strategy & PM — knowledge hub, meetings, decisions              | Project Manager |
| **DevHub**   | `apps/devhub/`  | Build & Execute — tickets, triage, AI execution (internal tool) | Developer       |
| **Portal**   | `apps/portal/`  | Client transparency — progress, Q&A, feedback                   | Account Manager |
| **Delivery** | Client apps     | Shipped products — feedback widget, support chatbot             | Support Agent   |

Data flows in a continuous loop: Knowledge In (cockpit) → Work Created → Work Executed (devhub) → Product Delivered → Feedback Captured (delivery) → Client Informed (portal) → Knowledge Grows → back to cockpit.

## Project Overview

AI-native knowledge platform for Jouw AI Partner (consultancy/software bureau). Centralizes all company data, processes it through AI agents, and exposes it via MCP server, web dashboard, and client portal.

**Current state (2026-04-23):** 73 sprints done (36 core + 5 CP-portal + 4 foundation + 14 DevHub + 6 testing + 7 quality + TH-011 Theme-Detector). Zie `sprints/done/` voor de volledige lijst en `docs/specs/docs-inventory.md §1` voor de per-prefix breakdown. Cockpit fully built (meetings, review, dashboard, emails). DevHub fase 1 complete (DH-001..007, DH-010..012, DH-017..020). Portal MVP: CP-001..005 done (wireframed). Next: cockpit↔devhub bridge, then portal launch.
**Team:** 6 people, 3 internal reviewers (Stef, Wouter, Ege). Platform maintained by Stef (non-coder) via Claude Code.
**Verification model:** All content must be human-verified before becoming queryable truth (review gate). This applies to all quadrants.
**DevHub:** Internal tool — not a product for clients. Optimized for team workflow and AI agent execution.
**Feedback:** Userback widget integrated for user feedback collection.

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind CSS v4 (CSS-first, geen tailwind.config) + shadcn/ui (base-nova style, Lucide icons)
- **Database:** Supabase (PostgreSQL EU-Frankfurt + pgvector, 1024-dim embeddings via Cohere embed-v4)
- **Embeddings:** Cohere embed-v4 (`cohere-ai` SDK, `embed-v4.0` model, 1024 dimensies, `inputType: "search_document"` voor opslag, `"search_query"` voor zoeken)
- **AI:** Vercel AI SDK (`ai`, `@ai-sdk/anthropic`) + Claude Agent SDK. Haiku for simple tasks, Sonnet for reasoning, Opus for deep analysis.
- **Validation:** Zod
- **Hosting:** Vercel
- **MCP Server:** Separate TypeScript/Node.js process
- **Feedback:** Userback widget (`@userback/widget`)

## Commands

```bash
npm run dev          # Start all workspaces (Turbopack via Turborepo)
npm run build        # Production build (all workspaces)
npm run lint         # ESLint (all workspaces)
npm run type-check   # TypeScript check (all workspaces)
```

## Project Structure (Monorepo)

```
/
├── apps/
│   ├── cockpit/                   # Strategy & PM dashboard (built)
│   │   ├── src/
│   │   │   ├── app/               # Routes (dashboard, login, api, review, emails)
│   │   │   ├── actions/           # Server Actions (tasks, entities, review, meetings)
│   │   │   ├── components/        # UI + feature components
│   │   │   ├── lib/utils.ts       # cn() helper (app-specific)
│   │   │   └── middleware.ts      # Auth route guards
│   │   ├── next.config.ts         # transpilePackages for @repo/*
│   │   └── package.json
│   │
│   ├── devhub/                    # Build & Execute — internal tool (partially built)
│   │   ├── src/
│   │   │   ├── app/               # Routes (issues, login, api)
│   │   │   ├── actions/           # Server Actions (issues, comments, sync)
│   │   │   ├── components/        # Issue list, detail, triage UI
│   │   │   └── middleware.ts      # Auth route guards
│   │   └── package.json
│   │
│   └── portal/                    # Client portal — transparency & Q&A (planned)
│
├── packages/
│   ├── database/                  # Shared: Supabase clients, queries, mutations, types
│   │   └── src/
│   │       ├── supabase/          # client.ts, server.ts, admin.ts
│   │       ├── queries/           # Read functions (meetings, tasks, dashboard, people, review, etc.)
│   │       ├── mutations/         # Write functions (meetings, tasks, extractions, etc.)
│   │       └── types/             # database.ts (generated)
│   │
│   ├── ai/                        # Shared: Agents, embeddings, pipeline
│   │   └── src/
│   │       ├── agents/            # gatekeeper.ts, extractor.ts, classifier.ts
│   │       ├── pipeline/          # gatekeeper-pipeline, entity-resolution, embed, save, re-embed
│   │       ├── validations/       # Zod schemas for agents + fireflies
│   │       ├── embeddings.ts      # Cohere embed-v4
│   │       ├── fireflies.ts       # Fireflies GraphQL client
│   │       └── transcript-processor.ts
│   │
│   ├── ui/                        # Shared: shadcn/ui components (Button, Badge, Card, etc.)
│   ├── auth/                      # Shared: Auth helpers + middleware factory
│   │
│   └── mcp/                       # Shared: MCP server + tools
│       └── src/
│           ├── server.ts          # createMcpServer()
│           └── tools/             # 10 MCP tools + utils
│
├── supabase/                      # Shared across apps (stays at root)
│   ├── migrations/
│   ├── functions/
│   └── seed/
│
├── turbo.json                     # Turborepo task config
├── package.json                   # Root workspace config
└── CLAUDE.md
```

### Import Conventions

```typescript
// Cross-package imports (shared code)
import { getAdminClient } from "@repo/database/supabase/admin";
import { listMeetings } from "@repo/database/queries/meetings";
import { insertMeeting } from "@repo/database/mutations/meetings";
import { embedText } from "@repo/ai/embeddings";
import { processMeeting } from "@repo/ai/pipeline/gatekeeper-pipeline";
import { createMcpServer } from "@repo/mcp/server";

// App-internal imports (within cockpit)
import { MeetingCard } from "@/components/meetings/meeting-card";
import { cn } from "@/lib/utils";
```

**Wanneer nieuwe folders:** feature-folder in `components/` bij 2+ eigen componenten. Component naar `shared/` zodra het op 2+ plekken gebruikt wordt.

## Architecture

### Supabase Clients

- `packages/database/src/supabase/server.ts` — Server-side client with cookie handling (use in Server Components/Route Handlers)
- `packages/database/src/supabase/client.ts` — Browser-side client (use in Client Components)
- `packages/database/src/supabase/admin.ts` — Service role singleton (server-side only, for pipelines/MCP)
- `NEXT_PUBLIC_` env vars only for URL and anon key; service role key stays server-only

### Agent System (database-first communication)

Agents write to the database, not to each other. This ensures audit trail + replay capability.

**Built:**

| Agent           | Model      | Quadrant | Purpose                                                                                                                                            |
| --------------- | ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gatekeeper      | Haiku 4.5  | Cockpit  | Classify meetings: meeting_type, party_type, relevance_score                                                                                       |
| Theme-Detector  | Sonnet 4.6 | Cockpit  | Extract-time theme scoping: identifies substantial cross-cutting themes vóór Summarizer draait, stelt nieuwe themes voor bij substantiële signalen |
| Summarizer      | Sonnet 4.5 | Cockpit  | Rich summary per meeting: briefing, kernpunten, deelnemers, vervolgstappen                                                                         |
| Risk Specialist | Sonnet 4.6 | Cockpit  | Gespecialiseerde risk-extractor (cross-turn patroon-detectie, high effort)                                                                         |
| Classifier      | Haiku 4.5  | DevHub   | Classify issues: type, component, severity, repro steps                                                                                            |

Volledig register (12 actieve agents): `packages/ai/src/agents/registry.ts` — voedt de `/agents` observability pagina.

**Planned (see vision doc for full agent roster):**

| Agent        | Model        | Quadrant | Purpose                                             |
| ------------ | ------------ | -------- | --------------------------------------------------- |
| Planner      | Sonnet       | DevHub   | Turn decisions/needs into implementation plans      |
| Executor     | Sonnet/Opus  | DevHub   | Pick up tickets, write code, create PRs             |
| Curator      | Sonnet       | Cockpit  | Nightly: dedupe, staleness, contradictions          |
| Analyst      | Opus         | Cockpit  | Daily: cross-source patterns, trends, risk flagging |
| Communicator | Sonnet       | Portal   | Draft client-facing answers, progress updates       |
| Support      | Haiku/Sonnet | Delivery | Chatbot: answer questions, report bugs, escalate    |
| Dispatcher   | Haiku/rules  | Cross    | Route insights/alerts to Slack, email               |

### Tasks System (extractions vs tasks)

Extractions = AI-extracted facts from meetings (decisions, action_items, needs, insights). Tasks = human-promoted action items with assignment and tracking. Separate tables, linked via `extraction_id`.

- `extractions` — immutable AI output, lives in review flow
- `tasks` — promoted from action_items, with `status` (active/done/dismissed), `assigned_to`, `due_date`
- Mutations: `createTaskFromExtraction()`, `completeTask()`, `dismissTask()`
- Queries: `listActiveTasks()`, `hasTaskForExtraction()`, `getPromotedExtractionIds()`

### Review Flow

Draft meetings go through human review before becoming verified. Reviewers can:

- Approve/reject individual extractions
- Change extraction types (e.g., action_item → decision)
- Promote action items to tasks with assignment during review
- MCP search filters on `verified_only` by default

### Dashboard

- **Meeting carousel** — auto-rotating verified meetings with AI briefings (`ai_briefing` column)
- **AI pulse strip** — metrics: processed meetings, decisions, deadlines, open needs
- **Tasks card** — filterable task list with urgency badges (overdue/this-week/open)

### Manual CRUD

Organizations, projects, people, and extractions are manually editable via inline forms. Server Actions in `apps/cockpit/src/actions/entities.ts`.

### Key Design Principles

- **Verification before truth** — all content is human-reviewed before becoming queryable
- **Err on keeping** — quarantine uncertain content, never silently discard
- **Right-size the model** — match model cost/capability to task complexity
- **Database as communication bus** — all agent coordination via DB rows
- **Extractions are immutable** — AI output stays unchanged; tasks are the mutable action layer

## Regels

### Vóór je code schrijft

Claude schrijft vaak te snel en te veel. Deze sectie bestaat om dat te
remmen — in ruil voor wat aanlooptijd win je minder unnecessary diffs,
minder rewrites, en minder verrassingen in productie.

- **Benoem aannames expliciet.** Als een verzoek op twee manieren te
  interpreteren is, presenteer beide — kies niet stil. "Je zegt X, ik
  lees dat als A, maar het kan ook B betekenen. Welke bedoel je?"
- **Geef tegenwicht wanneer iets simpeler kan.** Voordat je 200 regels
  schrijft: "Dit kan ook in 20 regels zonder nieuwe abstractie — wil
  je dat?" Push back is hier gewenst, niet onbeleefd.
- **Formuleer meetbare succes-criteria voor multi-step werk.** Vóór je
  begint, schets 2-5 stappen mét verificatie per stap:
  ```
  1. [actie] → verifieer: [hoe we zien dat het klopt]
  2. [actie] → verifieer: [hoe we zien dat het klopt]
  ```
  Zonder criteria valt Claude stil bij de eerste twijfel of dendert
  door zonder check. Sterke criteria laten hem zelfstandig itereren.
- **Experimentele wijzigingen die niet lokaal testbaar zijn: kies
  altijd de conservatieve variant.** Externe API-gedrag (Supabase
  query-syntax, PostgREST embed-aliases), productie-DB, deploy-
  specifieke quirks — als je het niet kunt reproduceren in de test-
  omgeving, ga niet experimenteren. TH-914 is de cautionary tale:
  een `referencedTable`-micro-optimalisatie brak de theme detail page
  in productie omdat we het lokaal niet konden verifiëren.

### Blast radius discipline

Elke gewijzigde regel moet herleidbaar zijn tot de taak of sprint-scope.
Test: als je een line-diff ziet en niet kunt uitleggen "dit was nodig
voor [doel]", haal hem weg.

- **Geen drive-by-fixes tijdens feature-werk.** Spelling, formatting,
  naamgeving van code die je tegenkomt maar niet raakt → laat staan.
  Noem het in de PR-beschrijving als observatie voor een volgende
  cleanup.
- **Orphans opruimen mag wél.** Imports, variabelen of helpers die
  door jouw wijziging unused worden, verwijder je direct. Pre-existing
  dead code die er al stond: niet tenzij gevraagd.
- **Match bestaande stijl.** Ook als je iets anders zou doen. Stijl-
  consistentie binnen een file is belangrijker dan jouw voorkeur.
- **Uitzondering:** expliciete cleanup-sprints (zoals TH-007/8/9)
  mogen adjacent code wél aanraken, mits de wijziging binnen de
  sprint-scope valt.

### Architectuur

- **Bouwvolgorde:** database → query → validatie → action → component → page.
- **Single responsibility:** elk bestand doet één ding. Page composeert, component rendert, action muteert, query haalt op.
- **Server Components als default.** `'use client'` alleen voor formulieren, klikhandlers, hooks, browser APIs.
- **Data ophalen in Server Components.** Geen `useEffect` voor data fetching.
- **Data muteren via Server Actions.** Geen directe Supabase calls in components.
- **Splits bij ~150 regels.** Component te groot? Splits het.
- **Als je een file/functie >2× zo lang maakt als nodig lijkt voor het doel, stop en herschrijf korter.** 200 regels voor iets dat in 50 kan = signaal dat er abstractie-drift zit. Vraag jezelf: "Zou een senior engineer zeggen dat dit overgeëngineerd is?" Als ja, vereenvoudig.

### Database & Queries

- **Geen `select('*')`.** Selecteer alleen kolommen die je nodig hebt.
- **Geen queries in loops (N+1).** Gebruik Supabase joins voor relaties.
- **Centraliseer queries in `packages/database/src/queries/`.** Eén plek per domein. Mutations in `packages/database/src/mutations/`.
- **Geen directe `.from()` in `apps/*/actions` of `apps/*/app/api`.** Gebruik een helper uit `@repo/database/queries/*` of `@repo/database/mutations/*`. Check via `npm run check:queries`; de pre-commit hook blokkeert overtredingen.
- **Client-scope beleid:** helpers accepteren een optionele `client?: SupabaseClient`; default is admin (service-role). Zie [`packages/database/README.md`](packages/database/README.md) voor signatuur-voorbeelden en uitzonderingen.
- **Filter op de database.** Niet ophalen en dan in JS filteren.
- **Pagination bij grote datasets.** Gebruik `.range()`.
- **Seed data is idempotent.** Altijd `ON CONFLICT DO UPDATE`.

### Security (drie lagen, altijd alle drie)

1. **Middleware** — route bescherming (v1: alleen auth check, role-based komt in v3).
2. **Zod validatie in Server Actions** — valideer álle input vóór de database call.
3. **RLS policies op elke tabel** — basic RLS enabled on `tasks` and core tables (permissive for authenticated users). Fine-grained role-based RLS deferred to v3 (client portal). See `docs/security/audit-report.md`.

- Frontend checks zijn voor UX, niet voor security.
- Service role client alleen server-side, alleen voor admin/seed taken.
- Geen secrets in `NEXT_PUBLIC_` variabelen.

### Error Handling

- Server Actions retourneren `{ success, data? }` of `{ error }`. Consistent.
- Zod field errors terug naar het formulier, server errors als toast.
- Elke feature-route heeft `loading.tsx` en `error.tsx`.

### Components

- Shared components accepteren data via props. Geen hardcoded waarden.
- Alle states afhandelen: default, loading, empty, error.
- Geen data fetching in components.

### Data-driven

- Waarden die kunnen veranderen → database, niet code.
- Statussen, rollen, niveaus → database tabel, geen enum in code.
- Meer dan 3 items in een lijst → database.

### Tests (anti-laundering)

Tests zijn het vangnet voor de niet-coder die deze codebase maintaint. Als
tests stilletjes versoepeld worden verdwijnt dat vangnet — de tests blijven
groen terwijl productie stiekem stukgaat. Daarom:

- **Falende test? Default-aanname: de CODE is stuk, niet de test.** Eerst
  diagnose in de productie-code. Een test mag je pas aanpassen als je
  expliciet kunt onderbouwen welk productie-gedrag bewust veranderd is.
- **Nooit assertions afzwakken om groen te worden.** Geen `toBe(5)` →
  `toBeDefined()`, geen `toBe(5)` → `toBeGreaterThan(0)`. Dat is doofpot,
  geen fix.
- **Nooit `it.skip` / `describe.skip` toevoegen** om een falende test te
  omzeilen. Een test die niet draait is een test die liegt.
- **Snapshots nooit blind updaten** (`vitest -u` zonder diff lezen). Een
  snapshot hoort vast te leggen wat de code **hoort** te doen, niet wat hij
  toevallig nu doet.
- **Mocks zijn grens-tools, geen logica-vervangers.** Mock alleen de
  database/netwerk/filesystem-grens zodat je captured payloads kunt
  asserteren. Een test die een mock zó bijstelt dat de assertie klopt, test
  niks meer.
- **Test wijzigen of verwijderen mag** — mits de commit message uitlegt
  welk gedrag bewust verdwenen is en waarom. Zonder die uitleg = niet doen.
- **Schrijf gedragstests, geen implementatie-tests.** Assert op
  input→output of observable side-effects: return values, DB-payload
  capture via boundary-mock, HTTP response status+body, revalidatePath
  calls. Wat een gebruiker of consumer ervaart.
- **Verboden patronen bij nieuwe tests:**
  - `toHaveBeenCalledWith` op interne helpers (`mockBuildText`,
    `mockGetExtractions`). Mock alleen de grens (DB/netwerk/filesystem)
    en assert op de _payload_ die naar de grens gaat, niet op het feit
    dat hij werd aangeroepen.
  - Chainable DB-mocks die query-strings matchen
    (`.from(x).select(y).eq(...).single()` nabouwen). Als je meer mock-
    setup schrijft dan test-asserts, stop — dan test je de mocks, niet
    de code. Gebruik de echte DB via `describeWithDb` of een payload-
    capture-mock.
  - Tests die private velden inspecteren (`_registeredTools`,
    `_serverInfo`, elke underscore-prefix). Als de publieke API niet
    testbaar is, refactor voor testbaarheid — verzin geen achterdeur.
    **Uitzondering MCP SDK:** `_registeredTools` + `_registeredPrompts`
    op `McpServer` zijn private (SDK 1.28.0 biedt geen publieke
    `listTools()`). Markeer met JSDoc `@private-field-access` en
    verwijs naar `docs/specs/test-strategy.md §4`.
- **Mock-grens beleid** (`docs/specs/test-strategy.md §3`): mock alleen
  externe systemen — Supabase clients, AI providers (`@anthropic-ai/sdk`,
  `@ai-sdk/anthropic`, `ai`, `cohere-ai`), AI-helper-wrappers
  (`@repo/ai/embeddings`, `@repo/ai/fireflies`, `@repo/ai/gmail`,
  `@repo/ai/agents/*`), Next runtime (`next/cache`, `next/navigation`,
  `next/headers`), MCP SDK, filesystem. Eigen `queries/*`, `mutations/*`,
  `pipeline/*`, `auth/*` zijn INTERN — niet mocken zonder refactor-ticket.

Als je twijfelt of een testwijziging laundering is: het antwoord is ja.
Escaleer naar de gebruiker in plaats van door te drukken.

## Conventies

**Bestanden:** kebab-case (`data-table.tsx`). **Components:** PascalCase. **Functies:** camelCase. **Types:** PascalCase. **DB tabellen/kolommen:** snake_case. **Constanten:** UPPER_SNAKE.

**Query functies:** `get`/`list` prefix (`getProtocolById`, `listAssessments`).
**Server Actions:** actie-prefix (`createProtocol`, `updateAssessment`).
**Zod schemas:** camelCase + Schema (`createProtocolSchema`).

**TypeScript:** strict, geen `any` (tijdelijk mag met `// TODO: type this`).
**Tailwind 4:** design tokens via `@theme` in globals.css, geen config file.
**Git:** `feature/[beschrijving]` of `fix/[beschrijving]`, één feature per branch.

## Werkwijze

**Nieuwe taak:** lees de spec → check of database klaar is → identificeer bestaande shared components → bouw inside-out.

**Nieuw component:** bepaal shared vs feature → props interface eerst → alle states maken → geen data fetching.

**Database wijziging:** migratie → RLS policies → regenereer types → seed data → update queries.

**Nieuwe pagina:** route in juiste group → loading.tsx + error.tsx → data via query functie → render via child components → check route guard.

**Nieuwe actie:** Zod schema → Server Action (valideer, muteer, revalidate) → formulier component → error handling.

## Sprint Management

- **Vision doc:** `docs/specs/vision-ai-native-architecture.md` — every sprint must align with this
- Sprints are in `sprints/`: `done/` for completed, `backlog/` for upcoming
- When a sprint is completed, move its file from `sprints/backlog/` to `sprints/done/`
- Each sprint file references requirement IDs (FUNC-xxx, DATA-xxx, AI-xxx, MCP-xxx, RULE-xxx) from `docs/specs/requirements.md`
- Full platform spec: `docs/specs/platform-spec.md` (technical source of truth)
- DevHub requirements: `docs/specs/requirements-devhub.md`
- Archived docs in `docs/archive/` (PRD v1, PRD v2, business model v1)

### Sync-ritme

- **Vóór elke nieuwe sprint:** run de `sync` subagent (`.claude/agents/agent-sync.md`) om te checken dat specs/backlog/code nog op één lijn staan.
- **Na elke merged sprint:** update `docs/specs/docs-inventory.md §1` sprint-telling + markeer eventuele nieuwe drift.
- **Periodiek (kwartaal):** run een volledige docs-audit-spike (analoog aan Q4a) als sanity-check.
- Het Q4a spike-rapport `docs/specs/docs-inventory.md` is de kanonieke input voor de sync-agent.

## Routes

### Cockpit (`apps/cockpit/`)

| Route                | Purpose                                                  |
| -------------------- | -------------------------------------------------------- |
| `/`                  | Dashboard home (carousel, AI pulse, tasks)               |
| `/meetings`          | Meeting list with day grouping, type/participant filters |
| `/meetings/[id]`     | Meeting detail with extraction tabs                      |
| `/emails`            | Email list                                               |
| `/emails/[id]`       | Email detail                                             |
| `/review`            | Review queue (draft meetings)                            |
| `/review/[id]`       | Review detail (approve/reject extractions, type changes) |
| `/review/email/[id]` | Email review detail                                      |
| `/clients`           | Organizations list + inline create                       |
| `/projects`          | Projects list + inline create                            |
| `/people`            | People list + inline create                              |
| `/login`             | Split-screen login page                                  |

### DevHub (`apps/devhub/`, internal)

| Route              | Purpose                                        |
| ------------------ | ---------------------------------------------- |
| `/`                | Issue list with project filter, triage sidebar |
| `/issues/[id]`     | Issue detail with comments, activity, AI panel |
| `/settings/import` | Userback sync + import management              |
| `/login`           | Login page                                     |

## Next.js 16 Warning

This uses Next.js 16 which has breaking changes from earlier versions. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Path Aliases

- `@/*` maps to `./src/*` within each app (`apps/cockpit/`, `apps/devhub/`) — use for app-internal imports only
- `@repo/database/*` — shared database package (queries, mutations, supabase clients, types)
- `@repo/ai/*` — shared AI package (agents, pipeline, embeddings, fireflies)
- `@repo/ui/*` — shared UI components (shadcn/ui)
- `@repo/auth/*` — shared auth helpers + middleware factory
- `@repo/mcp/*` — shared MCP package (server, tools)

## Environment Variables (new)

- `NEXT_PUBLIC_USERBACK_TOKEN` — Userback feedback widget token (required for deployment)
- `NEXT_PUBLIC_COCKPIT_URL` — Full URL naar de cockpit app (productie: `https://jouw-ai-partner.vercel.app`, dev fallback: `http://localhost:3000`). Gebruikt door (a) workspace-switcher in beide apps voor cross-app navigatie, (b) devhub `/auth/callback` om admins na magic-link login naar cockpit te redirecten, (c) cockpit middleware voor member-forbidden-redirect.
- `NEXT_PUBLIC_DEVHUB_URL` — Full URL naar de devhub app (productie: `https://jouw-ai-partner-devhub.vercel.app`, dev fallback: `http://localhost:3001`). Gebruikt door cockpit callback + middleware om members naar devhub te redirecten + door de workspace-switcher.
- `NEXT_PUBLIC_PORTAL_URL` — Full URL naar de portal app (nog niet gedeployed).

Beide apps (cockpit + devhub) hebben de 3 NEXT*PUBLIC*\* vars nodig zodat de workspace-switcher in de sidebar naar de andere quadranten kan linken.

### Supabase dashboard (handmatig, DH-018)

- **Redirect URLs whitelist** (Authentication → URL Configuration) moet beide productie-URL's `${cockpit}/auth/callback` en `${devhub}/auth/callback` bevatten, plus de preview/localhost varianten.
- **JWT / refresh-token**: zet de session refresh duration op **30 dagen** (AUTH-175).
