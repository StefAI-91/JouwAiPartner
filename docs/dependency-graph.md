# Dependency Graph

> Auto-generated on 2026-04-13. Do not edit manually.
> Run `node scripts/generate-dep-graph.js` to regenerate.

## Overview

| Metric | Count |
|--------|-------|
| Files scanned | 239 |
| Exported functions/constants | 417 |
| Exported types/interfaces | 111 |
| Cross-package imports | 339 |
| Critical integration points (3+ packages) | 7 |

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
| other | 222 | 49 | 38 | 29 | 1 | 339 |

## Critical Integration Points

Files that import from 3+ shared packages. These are the most interconnected
parts of the codebase — changes here have the widest blast radius.

| File | Packages | Count |
|------|----------|-------|
| `apps\cockpit\src\actions\email-review.ts` | database, ai, auth | 3 |
| `apps\cockpit\src\actions\meetings.ts` | database, ai, auth | 3 |
| `apps\cockpit\src\actions\review.ts` | database, ai, auth | 3 |
| `apps\cockpit\src\actions\scan-needs.ts` | database, auth, ai | 3 |
| `apps\cockpit\src\actions\weekly-summary.ts` | database, auth, ai | 3 |
| `apps\devhub\src\actions\classify.ts` | database, auth, ai | 3 |
| `apps\devhub\src\actions\review.ts` | database, ai, auth | 3 |

## Key Dependency Chains

Tracing the most important data flows from action → pipeline → database.

## Query Usage Map

Which queries are used where across the codebase.
