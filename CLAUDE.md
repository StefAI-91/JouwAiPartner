# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

**Current state:** 39 sprints done (28 core + 4 foundation + 7 DevHub). Cockpit fully built (meetings, review, dashboard, emails). DevHub fase 1 complete (DH-001 through DH-007: issues, AI classification, Userback sync). Portal not yet started. Next: cockpit↔devhub bridge, then portal MVP.
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

| Agent      | Model     | Quadrant | Purpose                                                                           |
| ---------- | --------- | -------- | --------------------------------------------------------------------------------- |
| Gatekeeper | Haiku 4.5 | Cockpit  | Classify meetings: meeting_type, party_type, relevance_score                      |
| Extractor  | Sonnet    | Cockpit  | Extract decisions, action_items, needs, insights with confidence + transcript_ref |
| Classifier | Haiku 4.5 | DevHub   | Classify issues: type, component, severity, repro steps                           |

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

### Architectuur

- **Bouwvolgorde:** database → query → validatie → action → component → page.
- **Single responsibility:** elk bestand doet één ding. Page composeert, component rendert, action muteert, query haalt op.
- **Server Components als default.** `'use client'` alleen voor formulieren, klikhandlers, hooks, browser APIs.
- **Data ophalen in Server Components.** Geen `useEffect` voor data fetching.
- **Data muteren via Server Actions.** Geen directe Supabase calls in components.
- **Splits bij ~150 regels.** Component te groot? Splits het.

### Database & Queries

- **Geen `select('*')`.** Selecteer alleen kolommen die je nodig hebt.
- **Geen queries in loops (N+1).** Gebruik Supabase joins voor relaties.
- **Centraliseer queries in `packages/database/src/queries/`.** Eén plek per domein. Mutations in `packages/database/src/mutations/`.
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
| `/review`          | AI review overview                             |
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
