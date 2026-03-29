# Micro Sprint 003: Extractor (Sonnet) + Pipeline + Embedding

## Doel

Nieuwe Extractor agent (Sonnet) die inhoudelijke extracties doet met confidence scoring en bronvermelding. Pipeline opslaan en alles direct embedden. Na deze sprint verwerkt de pipeline meetings end-to-end: triage → extractie → opslag → embedding.

## Requirements

| ID       | Beschrijving                                                           |
| -------- | ---------------------------------------------------------------------- |
| FUNC-005 | Extractor (Sonnet) extraheert decisions, action_items, needs, insights |
| FUNC-006 | Elke extractie bevat confidence score (0.0-1.0)                        |
| FUNC-007 | Elke extractie bevat transcript_ref als bronvermelding                 |
| FUNC-008 | Extractie wordt gestuurd door meeting_type                             |
| FUNC-014 | Project-koppeling via 3-tier: exact, alias, embedding                  |
| FUNC-015 | Bij project match: rij in meeting_projects                             |
| FUNC-016 | Raw opslag in raw_fireflies JSONB                                      |
| FUNC-017 | Alles direct embedden — geen wachten                                   |
| FUNC-018 | Meeting embedding verrijken met insights                               |
| AI-003   | Extractor als apart AI-call na Gatekeeper                              |
| AI-004   | Extractor output: type, content, confidence, transcript_ref, metadata  |
| AI-005   | Extractor gestuurd door meeting_type                                   |
| RULE-001 | Geen review-gate — alles is direct doorzoekbaar                        |
| RULE-003 | Confidence als indicator, niet als gate                                |
| RULE-004 | Needs zijn cumulatief — geen status                                    |

## Bronverwijzingen

- PRD: `docs/specs/meeting-processing-review.md` -> sectie 5.2 "Stap 2: Extractor (Sonnet)"
- PRD: `docs/specs/meeting-processing-review.md` -> sectie 5.5 "Project-koppeling"
- PRD: `docs/specs/meeting-processing-review.md` -> sectie 5.6 "Raw opslag"
- PRD: `docs/specs/meeting-processing-review.md` -> sectie 6 "Embedding Strategie"
- PRD: `docs/specs/meeting-processing-review.md` -> sectie 4.2 "Extractie per type"

## Context

### Extractor Agent

De Extractor is een apart AI-call (Sonnet) die na de Gatekeeper draait. Sonnet is betrouwbaarder dan Haiku voor inhoudelijke interpretatie.

**Input:** meeting transcript + Gatekeeper output (meeting_type, party_type)

**Output (per extractie):**

```typescript
const ExtractionSchema = z.object({
  extractions: z.array(
    z.object({
      type: z.enum(["decision", "action_item", "need", "insight"]),
      content: z.string(),
      confidence: z.number().min(0).max(1),
      transcript_ref: z.string(),
      metadata: z.record(z.unknown()).default({}),
    }),
  ),
});
```

### Metadata per type

| Type          | Metadata velden                                                   |
| ------------- | ----------------------------------------------------------------- |
| `decision`    | `{ made_by, date, context }`                                      |
| `action_item` | `{ assignee, due_date, status: 'open', scope: 'project' }`        |
| `need`        | `{}`                                                              |
| `insight`     | `{ category }` — 'project_update', 'strategy_idea', 'client_info' |

### Extractie per meeting_type

| Meeting type  | Extraheer                                              |
| ------------- | ------------------------------------------------------ |
| sales         | decisions, action_items, needs, insights (client_info) |
| discovery     | decisions, action_items, needs, insights (client_info) |
| internal_sync | decisions, action_items, insights (project_update)     |
| review        | decisions, action_items, insights (project_update)     |
| strategy      | decisions, action_items, insights (strategy_idea)      |
| partner       | decisions, action_items, needs                         |
| general       | decisions, action_items                                |

### Pipeline flow

```
Gatekeeper output (meeting_type, party_type, org, score)
  → Extractor (Sonnet): extracties met confidence + transcript_ref
  → Project-koppeling: 3-tier entity resolution
  → Opslag: meeting + extractions
  → raw_fireflies: Fireflies + Gatekeeper + Extractor output
  → Embedding: meeting + extractions direct via Cohere embed-v4 (1024-dim)
```

### Embedding

Embeddings worden gegenereerd via Cohere embed-v4 (`embed-v4.0`, 1024 dimensies) met de `cohere-ai` SDK. De embedding utility uit sprint 001 (`src/lib/utils/embed.ts`) wordt hergebruikt.

- **Opslag:** `inputType: "search_document"` — voor meetings en extracties
- **Batch:** tot 96 teksten per API-call — meetings en hun extracties kunnen in één batch
- **Meeting verrijking:** de embedding-tekst bevat titel + samenvatting + insights uit Extractor output

### Project-koppeling (3-tier)

```
Projectnaam uit Extractor
  → ILIKE match op projects.name
  → ANY match op projects.aliases
  → cosine similarity via match_projects() RPC
  → match? → INSERT meeting_projects
  → geen match? → projectnaam zit in extraction content
```

## Prerequisites

- Sprint 001 (database) is afgerond
- Sprint 002 (Gatekeeper triage) is afgerond

## Taken

- [ ] Maak Extractor agent aan: `src/lib/agents/extractor.ts` met Sonnet, ExtractionSchema, prompt per meeting_type
- [ ] Integreer Extractor in pipeline: na Gatekeeper, vóór opslag
- [ ] Pipeline opslag aanpassen: sla extractions op in `extractions` tabel met alle velden
- [ ] Project-koppeling: 3-tier entity resolution, resultaat in meeting_projects
- [ ] raw_fireflies JSONB vullen: Fireflies response + Gatekeeper output + Extractor output
- [ ] Embedding: meeting direct embedden na opslag via Cohere embed-v4 (`inputType: "search_document"`, 1024-dim)
- [ ] Embedding: extractions direct embedden na opslag (batch meerdere extracties per API-call)
- [ ] Re-embed worker aanpassen: verwijder review_status checks, verwerkt embedding_stale, verrijkt meeting-embedding met insights
- [ ] Pipeline-code: verwijder alle verwijzingen naar oude tabellen (decisions, action_items als aparte inserts) — alles gaat nu naar `extractions` tabel
- [ ] Entity-resolution aanpassen: project-matches resulteren in `meeting_projects` rows + `extractions.project_id`, niet meer in oude tabel-structuur
- [ ] Test: webhook → meeting + extractions in DB, confidence + transcript_ref aanwezig, alles geembed

## Acceptatiecriteria

- [ ] [FUNC-005] Extractor produceert decisions, action_items, needs en/of insights afhankelijk van meeting_type
- [ ] [FUNC-006] Elke extractie heeft een confidence score tussen 0.0 en 1.0
- [ ] [FUNC-007] Elke extractie heeft een transcript_ref die terug te herleiden is naar het transcript
- [ ] [FUNC-008] Een sales meeting levert needs + client_info insights, een internal_sync levert project_update insights
- [ ] [FUNC-014..015] Projecten worden gematcht en gekoppeld via meeting_projects
- [ ] [FUNC-017] Meetings en extractions zijn direct geembed (geen review-gate)
- [ ] [RULE-001] Alles is vindbaar via search_all_content() — geen filtering op review_status
- [ ] Handmatige test: webhook → meeting + extractions in DB → vindbaar via search

## Schema-compatibiliteit

De bestaande code schrijft naar oude tabellen (`decisions`, `action_items`). In deze sprint wordt:

- Alle INSERT/UPDATE logica herschreven naar de `extractions` tabel
- `re-embed-worker.ts` gestript van `review_status` checks — alles met `embedding_stale = true` wordt verwerkt
- `entity-resolution.ts` aangepast voor het nieuwe schema (project matches → `meeting_projects` + `extractions.project_id`)
- Queries in MCP tools werken nog op de oude tabellen tot sprint 004 — dat is acceptabel omdat er geen oude data meer is na clean slate

## Geraakt door deze sprint

- `src/lib/agents/extractor.ts` (nieuw)
- `src/lib/services/gatekeeper-pipeline.ts` (Extractor integratie, opslag naar extractions tabel)
- `src/lib/services/entity-resolution.ts` (project-koppeling 3-tier, nieuw schema)
- `src/lib/services/re-embed-worker.ts` (review_status checks weg, embedding_stale only, meeting verrijking)
