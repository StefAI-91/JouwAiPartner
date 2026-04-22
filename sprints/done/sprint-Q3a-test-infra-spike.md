# Sprint Q3a — Test Infra Audit (Spike)

**Type:** Spike — alleen onderzoek + minimale config-proef, geen productie-code
**Duur:** 1-2 uur
**Area:** alle `__tests__/` mappen + `vitest.config.*` + test-gerelateerde `package.json` secties
**Priority:** Blokkeert Q3b
**Aanleiding:** Review van het eerste Q3-voorstel onthulde dat de aannames onvolledig waren: werkelijk 102 zwakke assertions (niet 67); Portal en UI-package hebben geen test-infra (niet alleen "geen tests"); mock-grenzen waren niet gedefinieerd; MCP SDK heeft geen publieke `list_tools`; cockpit draait groen zonder `loadEnv` — onverklaard.

## Doel

Produceer `docs/specs/test-strategy.md` dat de échte staat van testing vastlegt + helder policy-document over mock-grenzen, env-setup, en coverage-tooling.

## Taken

### Q3a-1: Zwakke-assertions-inventaris

- [ ] Grep `toBeDefined()`, `toBeTruthy()`, `toBeGreaterThan(0)`, `not.toThrow()` in alle `*.test.ts`, `*.test.tsx`, `*.spec.ts`
- [ ] Lijst per bestand met totaal en top-5 zwaarst-vervuilde files
- [ ] Classificeer: "echt zwak" (assert zegt niks) vs "verdedigbaar" (gevolgd door concrete assert, of juist precondition-check)

### Q3a-2: Env-setup-mysterie oplossen

- [ ] Lees `apps/cockpit/vitest.config.ts` en alle setup-files die hij importeert
- [ ] Lees `apps/devhub/vitest.config.ts`
- [ ] Vind concreet verschil: waarom slagen cockpit tests (zonder expliciete loadEnv) en falen devhub tests?
- [ ] Check `apps/cockpit/__tests__/helpers/describe-with-db.ts` — is skipping de reden dat ze "groen" ogen?
- [ ] Documenteer dé fix (niet alleen voor devhub review.test.ts, maar generiek)

### Q3a-3: Mock-grens beleid

- [ ] Lijst alle `vi.mock(...)` aanroepen in tests — welke modules worden gemockt?
- [ ] Classificeer elk gemockt pad: EXTERN (Anthropic, Cohere, Fireflies, Gmail, Supabase, fs, netwerk) vs INTERN (eigen query/mutation/helper)
- [ ] Beleid vastleggen: welke paden zijn "grens" (mag gemockt), welke "intern" (niet mocken zonder refactor)
- [ ] Concreet: `@repo/ai/agents/*`, `@repo/ai/embeddings`, `@repo/ai/fireflies`, `@repo/ai/gmail` — zijn dit grenzen? (Ze wrappen externe API's)

### Q3a-4: MCP SDK publieke API

- [ ] Check `@modelcontextprotocol/sdk` versie en API
- [ ] Is er een publieke manier om tools/prompts op een `McpServer` op te sommen?
- [ ] Zo ja: documenteer hoe tests daar gebruik van maken
- [ ] Zo nee: bepaal beleid — accepteer private-field access met uitzonderingsnoot, of schrijf eigen registry wrapper in `packages/mcp/src/`

### Q3a-5: Portal test-infrastructuur

- [ ] Check `apps/portal/package.json` — aanwezige test-gerelateerde deps
- [ ] Check of `vitest.config.ts` bestaat
- [ ] Maak concrete lijst dependencies die toegevoegd moeten worden (`vitest`, `@testing-library/react`, `jsdom` of `happy-dom`, `@testing-library/jest-dom`)
- [ ] Doe één proef-installatie lokaal + minimale test om te bevestigen dat setup werkt (maar commit nog niet)

### Q3a-6: UI-package test-infrastructuur

- [ ] Zelfde check als Q3a-5 voor `packages/ui/`
- [ ] Extra: welke componenten zijn puur (geen server-dependency) en dus eerste kandidaat voor tests?

### Q3a-7: Coverage-tooling

- [ ] Check of `@vitest/coverage-v8` in lockfile zit en of config al bestaat
- [ ] Bepaal per-package coverage-target (pragmatisch: hoger voor `packages/ai/pipeline/`, lager voor UI)
- [ ] Schrijf voorbeeld-config die de sprint Q3b kan overnemen

### Q3a-8: E2E / integratie-strategie

- [ ] Bestaande strategie documenteren (indien ergens impliciet)
- [ ] Vraag beantwoorden: doen we E2E in Q3b of apart? Argumenten per kant
- [ ] Noteer welke cross-quadrant flows (cockpit → devhub, review → tasks) prioriteit hebben wanneer E2E wel komt

### Q3a-9: Cockpit bestaande test-audit

- [ ] Open `apps/cockpit/__tests__/` en doe een steekproef van 5 willekeurige tests
- [ ] Noteer kwaliteit: gedragstest of implementatietest, sterke/zwakke assertions
- [ ] Bepaal: is een audit-sprint voor cockpit-tests apart nodig?

## Output

**Bestand:** `docs/specs/test-strategy.md` met:

1. Exacte zwakke-assertions-count per bestand + top-5
2. Env-setup fix (generiek, werkend)
3. Mock-grens-beleid met expliciete lijst "grens-modules"
4. MCP SDK-beslissing (publieke API of uitzondering)
5. Setup-recept Portal
6. Setup-recept UI-package
7. Coverage-config
8. E2E-beslissing
9. Cockpit-test-audit-verdict

## Afronding

- [ ] Rapport gecommit
- [ ] Q3b kan starten met vaste cijfers en beleid
