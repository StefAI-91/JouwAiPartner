# @repo/ai

Alle AI-logica voor het platform: agents, pipelines, embeddings, externe providers (Fireflies, Gmail). Eén plek voor alles dat met een LLM of vector-store te maken heeft.

## Wanneer gebruiken

- Nieuwe agent toevoegen → in `src/agents/` + registreren in `src/agents/registry.ts`.
- Nieuwe pipeline-stap → in `src/pipeline/steps/` en componeren in een pipeline-file.
- Nieuwe externe provider (bv. nieuwe transcriptie-service) → top-level module zoals `fireflies.ts`.

**Niet hierin:** UI, database-queries of Server Actions. Dit package kent alleen zijn eigen helpers + `@repo/database` (voor mutations/queries).

## Publieke exports

### Agents (`@repo/ai/agents/*`)

- `registry.ts` — `AGENT_REGISTRY`, één bron van waarheid voor alle live agents (12 actieve). Voedt `/agents` dashboard.
- `gatekeeper.ts`, `summarizer.ts`, `title-generator.ts`, `needs-scanner.ts`, `management-insights.ts`, `weekly-summarizer.ts`, `project-summarizer.ts` (bevat ook `org-summarizer`), `email-classifier.ts`, `issue-classifier.ts`, `issue-reviewer.ts`, `risk-specialist.ts`.
- `email-extractor.ts` en `issue-executor.ts` zijn **geparkeerd** — geen call-site, bewust uitgesloten uit registry. Zie `docs/specs/agents.md §2`.
- `pricing.ts` + `run-logger.ts` = helpers (geen agents).

### Pipeline (`@repo/ai/pipeline/*`)

- `gatekeeper-pipeline.ts` — inkomende meetings classificeren.
- `email-pipeline.ts` — inkomende emails classificeren + koppelen.
- `summary-pipeline.ts` — project + org summaries.
- `management-insights-pipeline.ts` — bestuurs-inzichten over meerdere meetings.
- `weekly-summary-pipeline.ts` — wekelijks management-overzicht.
- `scan-needs.ts`, `entity-resolution.ts`, `embed-pipeline.ts`, `tagger.ts`, `segment-builder.ts`, etc.
- `steps/` — herbruikbare stappen (summarize, generate-title, risk-specialist).

### Overig

- `embeddings.ts` — Cohere embed-v4, 1024 dim, `search_document` voor opslag, `search_query` voor zoeken.
- `fireflies.ts` — Fireflies GraphQL client.
- `gmail.ts` + `google-oauth.ts` — email-ingest.
- `transcript-processor.ts`, `transcribe-elevenlabs.ts` — audio → transcript.
- `validations/` — Zod schemas voor agent-inputs/outputs + Fireflies/Gmail payloads.

### Prompts (`packages/ai/prompts/*.md`)

Eén markdown-file per agent. Wordt runtime geladen via `readAgentPrompt(agent)` in `registry.ts`. Bij elke prompt-wijziging: commit de `.md` én update de agent-versie in `registry.ts` als de semantiek wezenlijk verandert.

## Regels

- **Right-size the model:** Haiku voor classificatie, Sonnet voor cross-turn reasoning, Sonnet 4.6 + high effort alleen voor risk-specialist (kosten-intensief).
- **Database as communication bus:** agents schrijven extracties naar DB (`@repo/database/mutations`), ze roepen elkaar niet direct aan.
- **Prompts horen in `prompts/`**, niet inline in `.ts`-files.
- **Geen `any` in Zod output-types** — agent-outputs worden in DB opgeslagen, fouten kosten latere fixes.

## Ontwikkeling

```bash
npm test --workspace=@repo/ai         # alle tests
npm run type-check --workspace=@repo/ai
```

Tests staan in `packages/ai/__tests__/`. Mock-beleid: alleen externe grenzen mocken (Anthropic SDK, Cohere, Fireflies, Gmail, `@repo/database`). Zie `docs/specs/test-strategy.md §3`.

## Afhankelijkheden

- Intern: `@repo/database`
- Extern: `@ai-sdk/anthropic`, `ai`, `@anthropic-ai/sdk`, `cohere-ai`, `zod`
