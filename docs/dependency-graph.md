# Dependency Graph

> Auto-generated on 2026-04-13. Do not edit manually.
> Run `node scripts/generate-dep-graph.js` to regenerate.

## Overview

| Metric | Count |
|--------|-------|
| Files scanned | 244 |
| Exported functions/constants | 415 |
| Exported types/interfaces | 115 |
| Cross-package imports | 317 |
| Critical integration points (3+ packages) | 6 |

## Package Dependency Flow

```
┌─────────────────────────────────────────────────────────┐
│                      APPS                              │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │   Cockpit    │    │    DevHub     │                  │
│  │ pages/actions│    │ pages/actions │                  │
│  └──────┬───┬──┘    └──┬────┬───────┘                  │
│         │   │          │    │                           │
└─────────┼───┼──────────┼────┼───────────────────────────┘
          │   │          │    │
  ┌───────▼───▼──────────▼────▼───────────────────────┐
  │                   PACKAGES                        │
  │                                                   │
  │  ┌────────────┐   ┌───────┐   ┌──────┐  ┌─────┐  │
  │  │  database  │◄──│  ai   │   │ auth │  │ mcp │  │
  │  │queries/mut.│   │agents/│   │      │  │     │  │
  │  │            │   │pipeline│  │      │  │     │  │
  │  └─────┬──────┘   └───┬───┘   └──────┘  └──┬──┘  │
  │        │              │                     │     │
  └────────┼──────────────┼─────────────────────┼─────┘
           │              │                     │
           ▼              ▼                     ▼
       Supabase     Claude/Cohere          MCP Clients
```

## Cross-Package Dependency Matrix

Which layers depend on which packages:

| Layer | database | ai | auth | ui | mcp | Total |
|-------|---|---|---|---|---|-------|
| other | 221 | 50 | 20 | 29 | 1 | 321 |

## Critical Integration Points

Files that import from 3+ shared packages. These are the most interconnected
parts of the codebase — changes here have the widest blast radius.

| File | Packages | Count |
|------|----------|-------|
| `apps\cockpit\src\actions\email-review.ts` | database, ai, auth | 3 |
| `apps\cockpit\src\actions\meetings.ts` | database, ai, auth | 3 |
| `apps\cockpit\src\actions\review.ts` | database, ai, auth | 3 |
| `apps\devhub\src\actions\classify.ts` | database, auth, ai | 3 |
| `apps\devhub\src\actions\execute.ts` | database, ai, auth | 3 |
| `apps\devhub\src\actions\review.ts` | database, ai, auth | 3 |

## Key Dependency Chains

Tracing the most important data flows from action → pipeline → database.

## Query Usage Map

Which queries are used where across the codebase.
