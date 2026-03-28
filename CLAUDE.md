# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-first knowledge platform that ingests company data from multiple sources (Fireflies, Google Docs, Slack, Gmail), processes it through specialized AI agents, and exposes it via an MCP server for any LLM client. Target: 5–25 users across engineering, marketing, sales, leadership.

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind CSS v4 (CSS-first, geen tailwind.config) + shadcn/ui (base-nova style, Lucide icons)
- **Database:** Supabase (PostgreSQL EU-Frankfurt + pgvector, 1536-dim embeddings via OpenAI text-embedding-3-small)
- **AI:** Vercel AI SDK (`ai`, `@ai-sdk/anthropic`) + Claude Agent SDK. Haiku for simple tasks, Sonnet for reasoning, Opus for deep analysis.
- **Validation:** Zod
- **Hosting:** Vercel
- **MCP Server:** Separate TypeScript/Node.js process

## Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint (Next.js core web vitals + TypeScript)
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/                  # Publieke routes (geen auth vereist)
│   │   ├── login/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/             # Beschermde routes
│   │   ├── layout.tsx           # Shell: sidebar + header
│   │   ├── page.tsx             # Dashboard home
│   │   └── [feature]/           # Feature-specifieke routes
│   │       ├── page.tsx         # Overzichtspagina (Server Component)
│   │       ├── [id]/page.tsx    # Detailpagina
│   │       ├── loading.tsx      # Suspense fallback
│   │       └── error.tsx        # Error boundary
│   ├── api/                     # Route handlers (alleen voor webhooks/externe calls)
│   ├── layout.tsx               # Root layout (providers, fonts, metadata)
│   └── globals.css              # Tailwind 4 config + design tokens
│
├── components/
│   ├── ui/                      # shadcn/ui componenten (NIET handmatig wijzigen)
│   ├── shared/                  # Herbruikbare project-componenten
│   ├── layout/                  # Layout-specifieke componenten (sidebar, header, nav)
│   └── [feature]/               # Feature-specifieke componenten
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser client
│   │   ├── server.ts            # Server client (cookie handling)
│   │   └── admin.ts             # Service role (alleen server-side)
│   ├── agents/                  # AI agent modules (gatekeeper, curator, etc.)
│   ├── queries/                 # Database queries, gegroepeerd per domein
│   ├── validations/             # Zod schemas, gegroepeerd per domein
│   ├── hooks/                   # Custom React hooks
│   ├── utils/                   # Formatting, constants
│   └── types/
│       ├── database.ts          # Supabase generated types (niet handmatig wijzigen)
│       └── app.ts               # App-specifieke types en interfaces
│
├── actions/                     # Server Actions, gegroepeerd per domein
├── middleware.ts                # Route guards + auth redirects
│
supabase/
├── migrations/                  # SQL migrations (versioneerd, chronologisch)
├── functions/                   # Supabase Edge Functions
└── seed/                        # Seed data scripts
│
sprints/
├── done/                        # Afgeronde sprints
└── backlog/                     # Upcoming sprints
```

**Wanneer nieuwe folders:** feature-folder in `components/` bij 2+ eigen componenten. Component naar `shared/` zodra het op 2+ plekken gebruikt wordt.

## Architecture

### Supabase Clients

- `src/lib/supabase/server.ts` — Server-side client with cookie handling (use in Server Components/Route Handlers)
- `src/lib/supabase/client.ts` — Browser-side client (use in Client Components)
- `NEXT_PUBLIC_` env vars only for URL and anon key; service role key stays server-only

### Agent System (database-first communication)

Agents write to the database, not to each other. This ensures audit trail + replay capability.

| Agent      | Model       | Purpose                                                                           |
| ---------- | ----------- | --------------------------------------------------------------------------------- |
| Gatekeeper | Haiku       | Filter & score incoming content (0.0–1.0), extract structured data in single call |
| Curator    | Sonnet      | Nightly: dedupe, staleness, contradictions                                        |
| Analyst    | Opus        | Daily: cross-source patterns, trends, risk flagging                               |
| Dispatcher | Haiku/rules | Route insights/alerts to Slack, email                                             |

### Key Design Principles

- **Garbage in, garbage out** — Gatekeeper is the critical quality gate
- **Err on keeping** — quarantine uncertain content, never silently discard
- **Right-size the model** — match model cost/capability to task complexity
- **Database as communication bus** — all agent coordination via DB rows

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
- **Centraliseer queries in `lib/queries/`.** Eén plek per domein.
- **Filter op de database.** Niet ophalen en dan in JS filteren.
- **Pagination bij grote datasets.** Gebruik `.range()`.
- **Seed data is idempotent.** Altijd `ON CONFLICT DO UPDATE`.

### Security (drie lagen, altijd alle drie)

1. **Middleware** — route bescherming per rol.
2. **Zod validatie in Server Actions** — valideer álle input vóór de database call.
3. **RLS policies op elke tabel** — SELECT, INSERT, UPDATE per rol. Geen uitzonderingen.

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

- Sprints are in `sprints/`: `done/` for completed, `backlog/` for upcoming
- When a sprint is completed, move its file from `sprints/backlog/` to `sprints/done/`
- Each sprint file references requirement IDs (REQ-xxx) from `REQUIREMENTS_MATRIX.md`
- Full PRD is in `PROJECT_REQUIREMENTS.md`

## Next.js 16 Warning

This uses Next.js 16 which has breaking changes from earlier versions. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Path Aliases

`@/*` maps to `./src/*` — use this for all imports.
