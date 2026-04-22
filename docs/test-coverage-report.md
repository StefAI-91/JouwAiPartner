# Test Coverage Report — Q3b Baseline

**Datum:** 2026-04-20
**Sprint:** Q3b (test vangnet executie)
**Tool:** `@vitest/coverage-v8` v4.1.2, provider `v8`, reporters `text|html|lcov`.
**Hoe regenereren:** `npm run test:coverage` (root).

> Dit is de **baseline** vóór sprints T01-T07 (Behavioral Test Coverage).
> De coverage-config staat per package in `vitest.config.ts`. Geen
> hard-fail thresholds nu — die volgen na T01-T07 (zie test-strategy.md §7).

---

## Per-package overzicht

| Package             | Statements | Branches | Functions | Lines  | Doel (Q3a §7.2) |
| ------------------- | ---------- | -------- | --------- | ------ | --------------- |
| `packages/mcp`      | **93.78%** | 76.27%   | 97.26%    | 95.77% | 70%             |
| `packages/ai`       | 42.50%     | 37.90%   | 45.61%    | 42.23% | 80% (pipeline)  |
| `apps/cockpit`      | 8.04%      | 5.98%    | 3.43%     | 8.45%  | 60% (actions)   |
| `apps/devhub`       | 5.56%      | 3.65%    | 1.80%     | 5.93%  | 60% (actions)   |
| `apps/portal`       | 9.05%      | 8.57%    | 5.71%     | 9.46%  | n/a (nieuw)     |
| `packages/database` | 3.29%      | 0.42%    | 1.10%     | 3.75%  | 70%             |
| `packages/auth`     | 9.41%      | 10.00%   | 6.89%     | 9.52%  | 80%             |
| `packages/ui`       | 23.60%     | 17.89%   | 8.82%     | 20.52% | 40%             |

---

## Observaties

1. **MCP is goed gedekt** — bovenste-quartiel coverage (94% statements). Dat
   matcht met de tripwire-tests die in Q3b zijn aangezet (read-tools-registry
   - per-tool roundtrips).
2. **AI-pipeline zit op ~42%** — voornamelijk gedekt door `email-pipeline`,
   `entity-resolution`, `summary-pipeline`, `risk-specialist-step`,
   `scan-needs`. Onder-gedekt: `extractor.ts` agent, `re-embed-worker.ts`,
   `weekly-summary-pipeline.ts`, `transcribe.ts` step. T01 vult dit aan.
3. **Database package onder de 5%** — verwacht; integration-tests die de
   meeste queries/mutations zouden raken worden geskipt zonder
   `TEST_SUPABASE_URL`. Pas met T02 + T03 (lokale Supabase + payload-capture)
   schiet dit omhoog.
4. **Cockpit + DevHub apps onder 10%** — terecht laag; daadwerkelijke logica
   leeft in `packages/database` en `packages/ai`. Wat hier wel gedekt is:
   API routes (`api/cron-*`, `api/ingest-*`, `api/webhooks-*`) en de
   ge-mockte action-tests.
5. **Portal en UI hebben verse infra (Q3b §5/§6)** — coverage is nog laag
   omdat we exact 3 bestanden per package hebben getest. Dat was ook het
   doel van deze sprint: infrastructuur opzetten, niet meteen volledige
   dekking nastreven.
6. **Auth package** — alleen de `require-admin` test bestaat. T05 + T07
   raken indirect ook de auth-helpers.

---

## CI

Coverage is nu **rapport-only**: geen merge-gate. Reden: thresholds op een
te-lage baseline zouden alle PRs blokkeren totdat T01-T07 doorgevoerd zijn.

Na T01-T07 (zie `sprints/backlog/sprint-T01-ai-pipeline-tests.md` t/m T07):
upgrade `vitest.config.ts` per package met `coverage.thresholds` blok
conform Q3a §7.2 doelen, en faal de CI-build bij onder-treshold.

---

## Reproduce

Per-package:

```bash
npx vitest run --coverage --root packages/ai
npx vitest run --coverage --root packages/database
npx vitest run --coverage --root apps/cockpit
# ... etc
```

Volledig:

```bash
npm run test:coverage
```

HTML-rapporten in `<package>/coverage/index.html`.
