# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-first knowledge platform that ingests company data from multiple sources (Fireflies, Google Docs, Slack, Gmail), processes it through specialized AI agents, and exposes it via an MCP server for any LLM client. Target: 5–25 users across engineering, marketing, sales, leadership.

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + shadcn/ui (base-nova style, Lucide icons)
- **Database:** Supabase (PostgreSQL + pgvector, 1536-dim embeddings via OpenAI text-embedding-3-small)
- **AI:** Vercel AI SDK (`ai`, `@ai-sdk/anthropic`) + Claude Agent SDK. Haiku for simple tasks, Sonnet for reasoning, Opus for deep analysis.
- **MCP Server:** Separate TypeScript/Node.js process

## Commands

```bash
cd knowledge-platform
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint (Next.js core web vitals + TypeScript)
```

## Architecture

### Supabase Clients
- `src/lib/supabase/server.ts` — Server-side client with cookie handling (use in Server Components/Route Handlers)
- `src/lib/supabase/client.ts` — Browser-side client (use in Client Components)
- `NEXT_PUBLIC_` env vars only for URL and anon key; service role key stays server-only

### Agent System (database-first communication)
Agents write to the database, not to each other. This ensures audit trail + replay capability.

| Agent | Model | Purpose |
|-------|-------|---------|
| Gatekeeper | Haiku | Filter & score incoming content (0.0–1.0). Quarantine uncertain, don't reject. |
| Curator | Sonnet | Nightly: dedupe, staleness, contradictions |
| Analyst | Opus | Daily: cross-source patterns, trends, risk flagging |
| Dispatcher | Haiku/rules | Route insights/alerts to Slack, email |
| Extraction | Haiku | Extract people, skills, projects, decisions, action items |

### Key Design Principles
- **Garbage in, garbage out** — Gatekeeper is the critical quality gate
- **Err on keeping** — quarantine uncertain content, never silently discard
- **Right-size the model** — match model cost/capability to task complexity
- **Database as communication bus** — all agent coordination via DB rows

## Sprint Management

- Sprints are in `sprints/`: `done/` for completed, `backlog/` for upcoming
- When a sprint is completed, move its file from `sprints/backlog/` to `sprints/done/`
- Each sprint file references requirement IDs (REQ-xxx) from `REQUIREMENTS_MATRIX.md`
- Full PRD is in `PROJECT_REQUIREMENTS.md`

## Next.js 16 Warning

This uses Next.js 16 which has breaking changes from earlier versions. Read the relevant guide in `knowledge-platform/node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Path Aliases

`@/*` maps to `./src/*` — use this for all imports.
