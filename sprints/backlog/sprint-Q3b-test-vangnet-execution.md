# Sprint Q3b — Test Vangnet (Execution)

**Type:** Uitvoeringssprint — alleen starten na Q3a
**Blokkade:** Q3a spike-rapport `docs/specs/test-strategy.md` moet bestaan en beleid moet goedgekeurd zijn
**Area:** alle `__tests__/` mappen, `apps/portal/`, `packages/ui/`
**Priority:** Kritiek — vangnet voor niet-coder maintainer

## Doel

Herstel het test-vangnet volgens Q3a-beleid. Geen `it.skip()` meer in productie-paden, zwakke assertions opgewaardeerd volgens Q3a-tellingen, Portal + UI hebben werkende test-infrastructuur + basisdekking.

## Context

Alle getallen, mock-beleid en setup-recepten komen uit `docs/specs/test-strategy.md` (Q3a).

## Taken

### Q3b-1: Env-setup fix doorvoeren

Per Q3a-2 generieke fix:

- [ ] Pas `apps/devhub/vitest.config.ts` aan volgens rapport
- [ ] Verifieer dat `apps/cockpit/vitest.config.ts` hetzelfde patroon volgt (zelfs als hij "werkte", wil je consistentie)
- [ ] Update `apps/devhub/__tests__/actions/review.test.ts`: verwijder alle 6 `it.skip()` en de TODO-comment op regel 93
- [ ] Run tests lokaal + verifieer groen

### Q3b-2: Zwakke assertions opschonen

Op basis van Q3a-1 tellingen en prioriteit:

- [ ] Werk top-5 vervuilde files af (per Q3a-1 lijst)
- [ ] Voor elke "echt zwakke" assert: vervang door concrete waarde-check of verwijder redundantie
- [ ] Documenteer in commit-message welk gedrag daadwerkelijk getest wordt (anti-laundering)

### Q3b-3: Mocks herindelen

Per Q3a-3 beleid:

- [ ] Voor elke test met interne-module-mock: herwerk naar grens-mock (Supabase / HTTP / filesystem)
- [ ] `packages/mcp/__tests__/tools/write-tasks.test.ts` — mock aan Supabase-grens, assert op payload
- [ ] `packages/auth/__tests__/require-admin.test.ts` — mock `@supabase/supabase-js` alleen
- [ ] `apps/devhub/__tests__/actions/review.test.ts:15-31` — herwerk naar `describeWithDb` of payload-capture
- [ ] Documenteer uitzonderingen met reden in test-comment

### Q3b-4: MCP private-field access

Per Q3a-4 beslissing:

- [ ] Als publieke API bestaat: herwerk `packages/mcp/__tests__/server.test.ts:91,126`
- [ ] Als geen publieke API: verplaats de registry naar eigen wrapper in `packages/mcp/src/server.ts` en test via die wrapper
- [ ] Verwijder `as Record<string, unknown>` casts

### Q3b-5: Portal test-infra + basisdekking

Volgens Q3a-5 recept:

- [ ] Install dependencies (vitest, @testing-library/react, happy-dom of jsdom, @testing-library/jest-dom)
- [ ] Maak `apps/portal/vitest.config.ts` conform recept
- [ ] Voeg `"test": "vitest"` aan `apps/portal/package.json`
- [ ] Schrijf minstens 3 tests: 1 server action, 1 component-render, 1 query-helper

### Q3b-6: UI-package test-infra + basisdekking

Volgens Q3a-6 recept:

- [ ] Install deps en maak config
- [ ] Test `packages/ui/src/format.ts` helpers volledig (pure functies)
- [ ] Test 3 meest-gebruikte componenten (kandidaten per Q3a-6)

### Q3b-7: Coverage-rapportage

- [ ] Coverage-config uit Q3a-7 toevoegen aan alle `vitest.config.ts`
- [ ] `npm run test:coverage` script op root toevoegen
- [ ] Eerste baseline-rapport commit als `docs/test-coverage-report.md`

### Q3b-8: Cockpit-test-audit (afhankelijk van Q3a-9)

Alleen als spike dit aanbeveelt:

- [ ] Maak issue of nieuwe sprint Q3c voor gerichte cockpit-test-opschoning
- [ ] Deze sprint dekt het niet om scope-explosie te voorkomen

### Q3b-9: E2E (afhankelijk van Q3a-8)

Alleen als spike dit in scope zet:

- [ ] Setup Playwright (of gekozen tool)
- [ ] Eén smoke-test per quadrant
- [ ] Anders: verplaats naar eigen Q-sprint

## Afronding

- [ ] `npm run test` groen in alle packages/apps
- [ ] `grep -rn "it.skip\|describe.skip" apps/ packages/` in productie-tests = 0
- [ ] Coverage-rapport gecommit
- [ ] `docs/specs/test-strategy.md` markeer "executed"
