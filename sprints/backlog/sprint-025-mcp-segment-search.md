# Sprint 025: MCP/Zoeken - Segment-level search

## Doel

De MCP search tools uitbreiden zodat er project-specifiek gezocht kan worden over segment-embeddings. De `search_all_content()` RPC krijgt een tweede query-pad met `project_id` parameter. Met project_id wordt gezocht in `meeting_project_summaries` (hogere precision), zonder project_id blijft de bestaande meeting-search actief (backwards compatible). De MCP tools `search_knowledge`, `get_meeting_summary`, `list_meetings` en `get_projects` worden uitgebreid met segment-informatie.

## Requirements

| ID       | Beschrijving                                                                                         |
| -------- | ---------------------------------------------------------------------------------------------------- |
| MCP-010  | search_knowledge tool: optionele project_id parameter voor project-specifiek zoeken                  |
| MCP-011  | search_knowledge: met project_id -> zoek in meeting_project_summaries segment-embeddings             |
| MCP-012  | search_knowledge: zonder project_id -> bestaande meeting-search (backwards compatible)               |
| MCP-013  | search_knowledge: nieuw source type "project_summary" in resultaten met project-naam                 |
| MCP-014  | get_meeting_summary tool: per-project segmenten tonen als extra sectie                               |
| MCP-015  | list_meetings tool: aantal segmenten per meeting tonen                                               |
| MCP-016  | get_projects tool: aantal segmenten per project tonen                                                |
| FUNC-080 | search_all_content() RPC uitbreiden: twee aparte query-paden (met/zonder project_id)                 |
| FUNC-081 | Pad 1 (met project_id): query op meeting_project_summaries + vector similarity op segment-embeddings |
| FUNC-082 | Pad 2 (zonder project_id): bestaande meeting-search ongewijzigd                                      |

## Bronverwijzingen

- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "5. MCP/Zoeken" (regels 289-345)
- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "5.1 Routing-logica" (regels 291-303)
- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "5.1b Search-architectuur" (regels 305-317)
- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "5.2 Aan te passen tools" (regels 319-345)

## Context

### Relevante business rules

- **Twee paden, geen UNION**: De search_all_content() RPC gebruikt twee aparte query-paden in plaats van een UNION ALL. Reden: segment-scores en meeting-scores zijn niet direct vergelijkbaar, twee paden zijn eenvoudiger te testen/debuggen, geen risico op regressie.
- **Backwards compatible**: Bestaande MCP clients die geen project_id meesturen krijgen exact dezelfde resultaten als voorheen.
- **Verified only**: Beide paden respecteren de bestaande `verified_only` parameter (sprint 014).

### Search-architectuur

**Pad 1 (met project_id):**

```sql
-- Zoek in meeting_project_summaries
SELECT
  mps.id,
  mps.meeting_id,
  mps.project_id,
  mps.summary_text as content,
  mps.project_name_raw,
  p.name as project_name,
  m.title as meeting_title,
  m.date as meeting_date,
  1 - (mps.embedding <=> query_embedding) as vector_similarity,
  ts_rank(mps.search_vector, plainto_tsquery('dutch', query_text)) as text_rank,
  'project_summary' as source_type
FROM meeting_project_summaries mps
JOIN meetings m ON m.id = mps.meeting_id
LEFT JOIN projects p ON p.id = mps.project_id
WHERE mps.project_id = $project_id
  AND mps.embedding IS NOT NULL
  AND (verified_only = false OR m.verification_status = 'verified')
ORDER BY (vector_similarity * 0.7 + text_rank * 0.3) DESC
LIMIT match_count
```

**Pad 2 (zonder project_id):**
Bestaande query op `meetings` tabel -- ongewijzigd.

### MCP tool wijzigingen

**search_knowledge** (`packages/mcp/src/tools/search.ts`):

```typescript
// Nieuw parameter
project_id: z.string()
  .uuid()
  .optional()
  .describe(
    "Optional project ID to search within project-specific segments. When provided, searches segment-level embeddings for higher precision.",
  );
```

Resultaat formaat voor project_summary source type:

```
Project-segment: "Project Alpha" (Meeting: "Team Sync 3 april")
Kernpunten:
- Kernpunt 1
- Kernpunt 2
Vervolgstappen:
- Vervolgstap 1
Source: Meeting "Team Sync 3 april" -- 3 april 2026
Status: Verified by Stef on 4 april 2026
Similarity: 0.87
```

**get_meeting_summary** (`packages/mcp/src/tools/meetings.ts`):
Na de bestaande volledige samenvatting, een extra sectie:

```
---
Project-segmenten:
[Project Alpha] (4 kernpunten, 2 vervolgstappen)
- Kernpunt 1
- ...

[Algemeen] (1 kernpunt)
- Kernpunt 1
```

**list_meetings** (`packages/mcp/src/tools/list-meetings.ts`):
Aan elk meeting-item toevoegen: `Segments: 3 (Project Alpha, Project Beta, Algemeen)`

**get_projects** (`packages/mcp/src/tools/projects.ts`):
Aan elk project toevoegen: `Segments: 12 meetings with segments`

### Bestaande code

- search_knowledge: `packages/mcp/src/tools/search.ts`
- search_all_content RPC: `supabase/migrations/` (SQL functie)
- get_meeting_summary: `packages/mcp/src/tools/meetings.ts`
- list_meetings: `packages/mcp/src/tools/list-meetings.ts`
- get_projects: `packages/mcp/src/tools/projects.ts`

### Edge cases en foutafhandeling

- project_id dat niet bestaat: lege resultatenset (geen error).
- Meeting zonder segmenten: get_meeting_summary toont geen segmenten-sectie.
- Project zonder segmenten: get_projects toont "0 meetings with segments".
- search met project_id maar segment heeft geen embedding (embedding_stale=true): segment wordt niet gevonden via vector search (correct -- re-embed moet eerst draaien).

## Prerequisites

- [ ] Sprint 020: Database migratie - Segmented Summaries moet afgerond zijn
- [ ] Sprint 022: Tagger + Segment-bouw moet afgerond zijn (segmenten bestaan in DB)

## Taken

- [ ] SQL migratie: `search_all_content()` RPC uitbreiden met `project_id` parameter en twee query-paden (pad 1: segment search, pad 2: bestaande meeting search)
- [ ] `search_knowledge` MCP tool uitbreiden in `packages/mcp/src/tools/search.ts`: project_id parameter, resultaat-formatting voor source type "project_summary"
- [ ] `get_meeting_summary` MCP tool uitbreiden in `packages/mcp/src/tools/meetings.ts`: segmenten ophalen en tonen als extra sectie
- [ ] `list_meetings` MCP tool uitbreiden in `packages/mcp/src/tools/list-meetings.ts`: segment-count per meeting
- [ ] `get_projects` MCP tool uitbreiden in `packages/mcp/src/tools/projects.ts`: segment-count per project
- [ ] Tests: unit tests voor search routing (met/zonder project_id), backwards compatibility, resultaat-formatting

## Acceptatiecriteria

- [ ] [MCP-010] search_knowledge accepteert optionele project_id parameter
- [ ] [MCP-011] Met project_id: zoekt in meeting_project_summaries segment-embeddings
- [ ] [MCP-012] Zonder project_id: bestaande meeting-search werkt ongewijzigd
- [ ] [MCP-013] Resultaten met source type "project_summary" bevatten project-naam
- [ ] [MCP-014] get_meeting_summary toont per-project segmenten als extra sectie
- [ ] [MCP-015] list_meetings toont aantal segmenten per meeting
- [ ] [MCP-016] get_projects toont aantal segmenten per project
- [ ] [FUNC-080] search_all_content() RPC heeft twee aparte query-paden
- [ ] [FUNC-081] Pad 1 zoekt correct in segment-embeddings met project_id filter
- [ ] [FUNC-082] Pad 2 is backwards compatible met bestaande search
- [ ] Bestaande MCP clients zonder project_id parameter krijgen exact dezelfde resultaten

## Geraakt door deze sprint

- `supabase/migrations/YYYYMMDDHHMMSS_search_segment_support.sql` (nieuw -- RPC update)
- `packages/mcp/src/tools/search.ts` (gewijzigd -- project_id parameter + segment results)
- `packages/mcp/src/tools/meetings.ts` (gewijzigd -- segmenten sectie)
- `packages/mcp/src/tools/list-meetings.ts` (gewijzigd -- segment count)
- `packages/mcp/src/tools/projects.ts` (gewijzigd -- segment count)
- `packages/database/src/queries/meeting-project-summaries.ts` (gewijzigd -- queries voor MCP)
