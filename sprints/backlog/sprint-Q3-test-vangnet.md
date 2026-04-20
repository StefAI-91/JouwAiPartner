# Sprint Q3 — Test Vangnet Herstel

**Area:** `apps/devhub/__tests__/`, `apps/portal/`, `packages/ui/`, `packages/mcp/__tests__/`
**Priority:** Kritiek — CLAUDE.md noemt test-laundering expliciet als hoofdrisico voor de niet-coder maintainer
**Aanleiding:** Test-laundering onderzoek (2026-04-20): 6 skipped tests in `review.test.ts` (kritieke `generateProjectReview` flow), 67 zwakke assertions (`toBeDefined()` zonder verdere check), 18 mocks op interne helpers in plaats van grens-tools, 0 tests in `apps/portal` en `packages/ui`.

## Doel

Herstel het vangnet. Alle kritieke flows zijn gedekt door gedragstests. Geen `it.skip()` meer in productie-paden. Zwakke assertions opgewaardeerd tot echte gedrags-checks. Portal en UI-componenten basisdekking.

## Context

**Bewijs uit onderzoek:**

- `apps/devhub/__tests__/actions/review.test.ts:96-157` — 6× `it.skip()` met comment "vitest laadt geen .env.local, Fix in eigen sprint". Dit is die sprint.
- `packages/mcp/__tests__/tools/write-tasks.test.ts:7-15` — mockt `@repo/database/mutations/tasks` en `/queries/people`. Tool wordt tegen mocks getest, nooit tegen gedrag.
- `packages/auth/__tests__/require-admin.test.ts:11,20,24` — mockt `../src/helpers`, eigen module. Test test zichzelf.
- `apps/portal/` — 0 test-bestanden.
- `packages/ui/` — 0 test-bestanden.
- `packages/mcp/__tests__/server.test.ts:91,126` — `(server as Record<string, unknown>)._registeredTools` — private-field access erkent zichzelf als anti-pattern.

## Taken

### Q3-1: Skipped review tests herstellen

**Bestand:** `apps/devhub/__tests__/actions/review.test.ts`

- [ ] Diagnose env-probleem: vitest config in `apps/devhub/vitest.config.ts` laadt `.env.local` wel/niet?
- [ ] Fix: voeg `loadEnv` aan vitest config toe, of gebruik `dotenv/config` in setup-file
- [ ] Verwijder alle 6 `it.skip()` — activeer tests
- [ ] Controleer dat tests daadwerkelijk gedrag testen (niet alleen "functie bestaat")
- [ ] Verwijder TODO comment op regel 93

### Q3-2: Zwakke assertions opwaarderen

Target: minstens 50 van de 67 `toBeDefined()`/`toBeTruthy()`/`toBeGreaterThan(0)` vervangen door echte waarde-checks.

- [ ] `packages/mcp/__tests__/tools/write-tasks.test.ts:41` — vervang `expect(createHandler).toBeDefined()` door aanroep + assertie op return-waarde
- [ ] `packages/database/__tests__/mutations/tasks.test.ts:93` — vervang `toBeDefined()` op `completed_at` door timestamp-range check (binnen laatste seconde)
- [ ] `packages/ai/__tests__/pipeline/speaker-map.test.ts:48` — verwijder redundante `toBeDefined()` gevolgd door `toBe()`
- [ ] Grep door alle test-bestanden en hef de andere 47+ zwakke assertions op (inventaris in werkdocument)

### Q3-3: Mock-grenzen opnieuw trekken

Regel: alleen database/netwerk/filesystem-grens mocken; geen eigen modules.

- [ ] `packages/mcp/__tests__/tools/write-tasks.test.ts` — mock Supabase client aan de grens (`@repo/database/supabase/admin`), niet de mutation-modules zelf. Gebruik payload-capture om te asserteren op DB-inserts.
- [ ] `packages/auth/__tests__/require-admin.test.ts` — mock alleen `@supabase/supabase-js`, niet de eigen helpers. Test het echte auth-gedrag end-to-end.
- [ ] `apps/devhub/__tests__/actions/review.test.ts:15-31` — mock de 4 query/mutation functies niet; gebruik `describeWithDb` (zie `packages/database/__tests__/helpers/`) voor echte DB-tests, of payload-capture aan grens.

### Q3-4: Private-field access verwijderen

- [ ] `packages/mcp/__tests__/server.test.ts:91,126` — test MCP server via publieke `list_tools` / `list_prompts` calls in plaats van `_registeredTools`/`_registeredPrompts`. Als publieke API ontbreekt, voeg toe.

### Q3-5: Portal basisdekking

**Bestand:** `apps/portal/__tests__/` (nieuw)

- [ ] Setup vitest config conform andere apps
- [ ] Tests voor Portal server actions (waarschijnlijk nog weinig, maar stel patroon vast)
- [ ] Test voor `apps/portal/src/components/issues/issue-list.tsx` rendering gedrag (snapshot vermijden, test op tekst + rol-selectors)

### Q3-6: UI-package basisdekking

**Bestand:** `packages/ui/__tests__/` (nieuw)

- [ ] Setup vitest config voor React-component tests (`@testing-library/react`)
- [ ] Tests voor `format.ts` helpers (`formatDate`, `formatDateShort`) — pure functies, laaghangend fruit
- [ ] Tests voor 3 meest-gebruikte componenten (Button, Badge, Card) — rendering + variant props

### Q3-7: Rapport voor Stef

**Bestand:** `docs/test-coverage-report.md`

- [ ] Tabel per package/app: aantal tests, dekking per laag, bekende gaten
- [ ] Lijst bewust niet-geteste onderdelen met reden
- [ ] Update bij elke nieuwe test-sprint

## Afronding

- [ ] `npm run test` groen zonder skipped tests in productie-paden
- [ ] Geen `it.skip` / `describe.skip` / `.only` in productie-test-bestanden
- [ ] Grep-check: geen mocks op eigen `@repo/*` modules behalve grens-modules (`supabase/*`)
- [ ] `apps/portal/` en `packages/ui/` hebben elk minstens 3 groene tests
- [ ] Test-coverage-report gecommit
