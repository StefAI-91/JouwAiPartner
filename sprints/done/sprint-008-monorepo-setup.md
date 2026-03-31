# Sprint 008: Monorepo Setup (v2-001)

## Doel

Herstructureer het project naar een Turborepo monorepo. De huidige Next.js app in `src/` wordt verplaatst naar `apps/cockpit/`, en gedeelde code (database, AI, MCP) gaat naar `packages/`. Dit is de fundatie voor alle v2 sprints en bereidt voor op de client portal in v3. Na deze sprint werkt alles exact zoals voorheen — geen nieuwe features, alleen structuur.

## Requirements

| ID       | Beschrijving                                                                                         |
| -------- | ---------------------------------------------------------------------------------------------------- |
| FUNC-001 | Turborepo monorepo opzetten met turbo.json en workspace package.json                                 |
| FUNC-002 | apps/cockpit/ aanmaken — app code verplaatsen (app/, components/, actions/, middleware, next.config) |
| FUNC-003 | packages/database/ aanmaken — supabase clients, queries, validations, types verplaatsen              |
| FUNC-004 | packages/ai/ aanmaken — agents, embeddings, pipeline code verplaatsen                                |
| FUNC-005 | packages/mcp/ aanmaken — MCP server en tools verplaatsen                                             |
| FUNC-006 | Alle imports bijwerken naar nieuwe monorepo paden                                                    |
| FUNC-007 | CLAUDE.md bijwerken met nieuwe project structuur                                                     |

## Bronverwijzingen

- PRD: `docs/specs/v2-review-dashboard.md` -> sectie "9. Sprints — v2-001" (regels 444-458)
- PRD: `docs/specs/v2-review-dashboard.md` -> sectie "2. Architecture Decision: Monorepo" (regels 36-114)

## Context

### Relevante business rules

- **RULE-007**: "Migratiestrategie voor zero downtime — monorepo setup is stap 0, alles moet blijven werken."

### Monorepo structuur

De PRD specificeert exact welke code waarheen verplaatst wordt:

```
/
├── apps/
│   ├── cockpit/               # Current Next.js app (renamed from root)
│   │   ├── src/
│   │   │   ├── app/           # Dashboard routes
│   │   │   ├── components/    # UI components
│   │   │   ├── actions/       # Server Actions
│   │   │   └── middleware.ts
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   └── portal/                # v3: Client portal (empty placeholder)
│
├── packages/
│   ├── database/              # Shared: Supabase clients, queries, types
│   │   ├── src/
│   │   │   ├── supabase/      # client.ts, server.ts, admin.ts
│   │   │   ├── queries/       # All query functions
│   │   │   ├── validations/   # Zod schemas
│   │   │   └── types/         # database.ts, app.ts
│   │   └── package.json
│   │
│   ├── ai/                    # Shared: Agents, embeddings, pipeline
│   │   ├── src/
│   │   │   ├── agents/        # gatekeeper.ts, extractor.ts
│   │   │   ├── embeddings.ts
│   │   │   └── pipeline/      # gatekeeper-pipeline.ts, entity-resolution.ts
│   │   └── package.json
│   │
│   └── mcp/                   # Shared: MCP server + tools
│       ├── src/
│       │   ├── server.ts
│       │   └── tools/
│       └── package.json
│
├── supabase/                  # Stays at root (shared across apps)
├── turbo.json
├── package.json               # Root workspace config
└── CLAUDE.md                  # Updated for monorepo
```

### Import path wijzigingen

```typescript
// Before (v1)
import { getAdminClient } from "@/lib/supabase/admin";
import { listMeetings } from "@/lib/queries/meetings";

// After (v2)
import { getAdminClient } from "@repo/database/supabase/admin";
import { listMeetings } from "@repo/database/queries/meetings";

// App-specific imports stay the same within cockpit
import { MeetingCard } from "@/components/meetings/meeting-card";
```

### Wat waarheen verplaatst

| Huidige locatie                                                    | Nieuwe locatie                         |
| ------------------------------------------------------------------ | -------------------------------------- |
| `src/lib/supabase/`                                                | `packages/database/src/supabase/`      |
| `src/lib/queries/`                                                 | `packages/database/src/queries/`       |
| `src/lib/validations/`                                             | `packages/database/src/validations/`   |
| `src/lib/types/`                                                   | `packages/database/src/types/`         |
| `src/lib/agents/`                                                  | `packages/ai/src/agents/`              |
| `src/lib/embeddings.ts`                                            | `packages/ai/src/embeddings.ts`        |
| `src/lib/mcp/`                                                     | `packages/mcp/src/`                    |
| `src/app/`, `src/components/`, `src/actions/`, `src/middleware.ts` | `apps/cockpit/src/`                    |
| `src/lib/hooks/`, `src/lib/utils/`                                 | `apps/cockpit/src/lib/` (app-specific) |

## Prerequisites

Geen. Dit is de eerste v2 sprint.

## Taken

- [ ] Turborepo installeren, `turbo.json` en root `package.json` workspace configuratie aanmaken
- [ ] `apps/cockpit/` aanmaken — verplaats app/, components/, actions/, middleware.ts, next.config.ts en cockpit-specifieke lib/ (hooks, utils)
- [ ] `packages/database/` aanmaken — verplaats supabase clients, queries, validations, types. Package.json met exports.
- [ ] `packages/ai/` aanmaken — verplaats agents, embeddings, pipeline code. Package.json met exports.
- [ ] `packages/mcp/` aanmaken — verplaats MCP server en tools. Package.json met exports.
- [ ] Alle import paden updaten in de hele codebase (van `@/lib/...` naar `@repo/...` waar van toepassing)

## Acceptatiecriteria

- [ ] [FUNC-001] `turbo.json` en root `package.json` bestaan met correcte workspace configuratie
- [ ] [FUNC-002] `apps/cockpit/` bevat alle app-specifieke code en heeft eigen `package.json`
- [ ] [FUNC-003] `packages/database/` bevat supabase clients, queries, validations, types
- [ ] [FUNC-004] `packages/ai/` bevat agents, embeddings, pipeline code
- [ ] [FUNC-005] `packages/mcp/` bevat MCP server en tools
- [ ] [FUNC-006] Alle imports gebruiken de nieuwe paden, geen broken references
- [ ] [FUNC-007] CLAUDE.md is bijgewerkt met monorepo structuur
- [ ] `npm run dev` start zonder fouten
- [ ] `npm run build` slaagt zonder fouten
- [ ] `npm run lint` slaagt zonder fouten

## Geraakt door deze sprint

- `turbo.json` (nieuw)
- `package.json` (gewijzigd — workspace config)
- `apps/cockpit/` (nieuw — alle app code)
- `apps/cockpit/package.json` (nieuw)
- `apps/cockpit/next.config.ts` (verplaatst)
- `apps/portal/` (nieuw — lege placeholder)
- `packages/database/` (nieuw)
- `packages/database/package.json` (nieuw)
- `packages/ai/` (nieuw)
- `packages/ai/package.json` (nieuw)
- `packages/mcp/` (nieuw)
- `packages/mcp/package.json` (nieuw)
- `CLAUDE.md` (gewijzigd)
- Alle bestanden met gewijzigde import paden
