# Test Strategy — Q3a Spike

**Datum:** 2026-04-20
**Sprint:** Q3a (spike, geen productie-code)
**Doel:** bron-van-waarheid voor wat we testen, hoe we mocken, waar env-setup
staat, en welke infrastructuur nog ontbreekt vóór Q3b executie kan starten.
**Bron:** grep over alle `*.test.ts`, `vitest.config.*`, `package.json`,
`@modelcontextprotocol/sdk` v1.28.0, en handmatige audit van de 5 top-gemarkeerde
testbestanden.

---

## 0. Samenvatting (tl;dr)

| Onderwerp          | Bevinding                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Zwakke assertions  | **58** treffers (exact patroon uit Q3a-1) in **27** bestanden. Alleen **9** écht zwak (MCP "registers the tool" smoketests); rest defensible. |
| Mock-aanroepen     | **176** `vi.mock(...)` in **43** bestanden. Hotspots: `ingest-reprocess` (15), `segments` (9), `import` (8).                                  |
| Env-setup mysterie | Opgelost: beide apps gebruiken identieke `describeWithDb` helper die skipt wanneer `TEST_SUPABASE_URL` ontbreekt. Geen `loadEnv` nodig.       |
| MCP SDK API        | `McpServer._registeredTools` blijft **privé** in v1.28.0. Beleid: bewuste uitzondering met `@private-field-access` JSDoc-noot.                |
| Portal test-infra  | **Niet aanwezig**. Geen `vitest.config.ts`, geen test-deps, geen `test`-script in `package.json`.                                             |
| UI-package infra   | **Niet aanwezig**. Geen config, geen deps, geen tests.                                                                                        |
| Coverage-tooling   | `@vitest/coverage-v8@4.1.2` staat in root-deps, maar **geen enkele** `vitest.config.*` heeft `coverage`-blok.                                 |
| E2E-strategie      | **Nog niet bestaand**. Besluit: uitstellen tot Q3b+1; eerst unit + grens-integratie via `describeWithDb` stabiliseren.                        |
| Mock-grens beleid  | Formeel vastgelegd in §4. Grens = extern (Anthropic/Cohere/Fireflies/Gmail/Supabase/fs/`next/*`). `queries/*` + `mutations/*` zijn INTERN.    |
| Cockpit test-audit | Steekproef: gedragstests van behoorlijke kwaliteit. Geen aparte audit-sprint vereist; incrementele fixes in Q3b meenemen.                     |

---

## 1. Zwakke-assertions-inventaris (Q3a-1)

Patroon gebruikt: `toBeDefined()`, `toBeTruthy()`, `toBeGreaterThan(0)`,
`not.toThrow()`. Scope: `**/*.test.{ts,tsx}` exclusief `node_modules`.

**Totaal:** 58 treffers over 27 bestanden (lager dan de 102 die Q3a-intro
noemde; het originele getal bevatte waarschijnlijk bredere patronen zoals
`toHaveBeenCalled()` zonder args of `toBeNull()` als defensive check).

### 1.1 Top-5 vervuilde bestanden

| Bestand                                                 | Count | Classificatie              |
| ------------------------------------------------------- | ----- | -------------------------- |
| `packages/mcp/__tests__/tools/read-tools.test.ts`       | 5     | **Echt zwak** (5×)         |
| `packages/mcp/__tests__/tools/write-tasks.test.ts`      | 4     | **Echt zwak** (4×)         |
| `packages/ai/__tests__/pipeline/speaker-map.test.ts`    | 4     | Verdedigbaar               |
| `packages/ai/__tests__/pipeline/email-pipeline.test.ts` | 4     | Verdedigbaar (3×) + 1 zwak |
| `packages/database/__tests__/mutations/issues.test.ts`  | 4     | Verdedigbaar (type-narrow) |

### 1.2 Classificatie-rubriek

**Echt zwak** (9 treffers): `expect(handler).toBeDefined()` smoketests in MCP
tool-registraties. Deze verifiëren alleen dat `createHandler` een truthy
waarde exporteert — zegt niks over of de tool registreert bij de MCP server
of wat hij produceert. Zijn laundering-bestendig te vervangen door een
round-trip test: tool registreren bij een test-server, dan callen, dan
assertion op output.

**Verdedigbaar** (49 treffers): `expect(info).toBeDefined(); expect(info!.x).toBe(...)`
patroon. De eerste assertion is een type-narrow (TypeScript strict-mode),
de tweede is de echte gedragstest. Het weghalen verlaagt de signal-to-noise
zonder waarde toe te voegen.

### 1.3 Q3b actiepunt

Vervang de 9 MCP "registers the tool" tests door round-trip calls met
payload-capture op de DB-mock. De 49 defensibele treffers blijven staan.

---

## 2. Env-setup mysterie opgelost (Q3a-2)

### 2.1 Diagnose

De Q3a-intro meldde: "cockpit draait groen zonder expliciete `loadEnv` —
onverklaard". Na audit is het antwoord eenvoudig: **cockpit draait groen
omdat de integration-tests met DB-afhankelijkheid worden geskipt**, niet
omdat een env-variabele wordt geladen.

**Mechanisme:** beide `apps/cockpit/__tests__/helpers/describe-with-db.ts`
en `apps/devhub/__tests__/helpers/describe-with-db.ts` zijn **identiek**:

```ts
const supabaseUrl = process.env.TEST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  console.warn(`⚠️  SKIPPING "${label}": ...`);
  return describe.skip;
}
return describe;
```

Gevolg: zonder env-vars worden alle integration-tests (die `describeWithDb`
gebruiken) geskipt. De testrun is "groen" maar feitelijk meet hij alleen
de unit-tests met mocks.

**Bevestigd in recente runs:** `⚠️ SKIPPING "Task Server Actions (integration)"`,
`⚠️ SKIPPING "Review Server Actions (integration)"`, etc.

### 2.2 Vitest configs vergeleken

| Pakket              | `passWithNoTests` | `globalSetup`                         |
| ------------------- | ----------------- | ------------------------------------- |
| `apps/cockpit`      | true              | —                                     |
| `apps/devhub`       | true              | —                                     |
| `packages/ai`       | —                 | —                                     |
| `packages/auth`     | —                 | —                                     |
| `packages/database` | —                 | `./__tests__/helpers/global-setup.ts` |
| `packages/mcp`      | —                 | —                                     |

### 2.3 Fix-recept (voor Q3b)

Geen lokale of CI-fix nodig voor cockpit/devhub — de skip-mechanic werkt
zoals bedoeld. Wel **één keuze** voor Q3b:

- **Optie A** (aanbevolen): CI blijft draaien zonder DB, tests die DB nodig
  hebben blijven geskipt en zijn alleen lokaal bruikbaar via
  `npx supabase start`. Minimaliseert CI-tijd + secrets.
- **Optie B**: voeg GitHub Actions Supabase-service toe zodat integration
  tests ook in CI draaien. Duurder, maar catcht regressies eerder.

**Beslissing:** Optie A voor nu; optie B evalueren na T02-T05 (wanneer
integration-tests getalsmatig groter worden).

---

## 3. Mock-grens beleid (Q3a-3)

Scope: 176 `vi.mock(...)` aanroepen in 43 bestanden geclassificeerd.
Hotspots: `apps/cockpit/__tests__/api/ingest-reprocess.test.ts` (15),
`apps/cockpit/__tests__/actions/segments.test.ts` (9),
`apps/devhub/__tests__/actions/import.test.ts` (8).

### 3.1 Formele definitie "grens"

Een module is een **grens** wanneer één van de volgende waar is:

1. Hij praat met een extern systeem (HTTP/DB/filesystem/AI API/auth provider).
2. Hij importeert zo'n externe SDK op module-niveau (e.g. `@anthropic-ai/sdk`).
3. Hij komt uit een third-party package dat side-effects heeft bij import
   (e.g. `next/cache`, `next/navigation`).

Alle overige modules — eigen `queries/*`, `mutations/*`, `integrations/*`,
`pipeline/*`, `agents/*`, `auth/helpers`, `auth/access` — zijn **intern**
en mogen alleen gemockt worden voor scenario-injectie (niet voor
`toHaveBeenCalledWith`-asserts).

### 3.2 Gren-modules whitelist (mag gemockt + assertion)

| Categorie          | Pad                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------- |
| Supabase clients   | `@repo/database/supabase/admin`, `@repo/database/supabase/server`                             |
| AI providers       | `@anthropic-ai/sdk`, `@ai-sdk/anthropic`, `ai`, `cohere-ai`                                   |
| AI helper-wrappers | `@repo/ai/embeddings`, `@repo/ai/fireflies`, `@repo/ai/gmail`, `@repo/ai/agents/*` (wrap LLM) |
| Next runtime       | `next/cache`, `next/navigation`, `next/headers`                                               |
| MCP SDK            | `@modelcontextprotocol/sdk/*`                                                                 |
| Filesystem         | `node:fs`, `node:fs/promises`                                                                 |

### 3.3 Interne modules (niet mocken — tenzij met refactor-ticket)

- `@repo/database/queries/*`, `@repo/database/mutations/*`
- `@repo/database/integrations/*` (wel mocken van de sub-grens binnenin)
- `@repo/ai/pipeline/*` (componeer-logica — test via payload-capture)
- `@repo/auth/helpers`, `@repo/auth/access`
- Relatieve imports (`../../src/foo`) — stop-direct, refactor de foo.

### 3.4 Huidige schendingen (snapshot)

- `packages/ai/__tests__/pipeline/email-pipeline.test.ts` mockt
  `../../src/pipeline/context-injection` + `../../src/pipeline/entity-resolution`.
  **Schending.** Fix: gebruik echte helpers, mock alleen de grens
  (`@repo/database/queries/organizations` etc.).
- `packages/ai/__tests__/pipeline/summary-pipeline.test.ts` mockt
  `../../src/agents/project-summarizer`. **Grens?** Ja — de agent wrapt
  een LLM-call, dus grens. **Oké.**
- `packages/ai/__tests__/pipeline/risk-specialist-step.test.ts` mockt
  `../../src/pipeline/save-risk-extractions`. **Schending.** Fix:
  mock alleen `@repo/database/mutations/extractions`.

Bovenstaande zijn geen blokkade voor Q3b start, maar kandidaat
opschoonpunten per module.

---

## 4. MCP SDK publieke API (Q3a-4)

### 4.1 Versie + feitelijk aanbod

Geïnstalleerd: `@modelcontextprotocol/sdk@1.28.0`. De `McpServer`-class
declareert in `dist/esm/server/mcp.d.ts`:

```
private _registeredResources;
private _registeredResourceTemplates;
private _registeredTools;
private _registeredPrompts;
```

Er zijn wel publieke methodes `tool(...)`, `prompt(...)`,
`sendToolListChanged()`, `sendPromptListChanged()`, maar **geen enkele**
`listTools()` / `getRegisteredTools()` / iterator-API.

### 4.2 Huidige praktijk in onze codebase

`packages/mcp/__tests__/server.test.ts` accesst expliciet het private veld
met een JSDoc-verantwoording:

```ts
// Ja — dit leest nog steeds private veld `_registeredTools`. Dat is een
// bewuste concessie: de MCP SDK biedt geen publieke lijst-API.
function listRegisteredToolNames(server): string[] {
  const registered = (server as Record<string, unknown>)._registeredTools;
  ...
}
```

### 4.3 Beslissing

**Korte termijn (Q3b):** behoud het private-field-access patroon, maar
verplicht een JSDoc-regel boven élke zulke toegang:

```ts
/** @private-field-access — zie docs/specs/test-strategy.md §4 voor reden. */
```

**Lange termijn (apart ticket, niet Q3b):** bouw in `packages/mcp/src/`
een dunne registry-wrapper die `createMcpServer()` gebruikt, zodat tests
een publieke `listTools()` kunnen callen. Voorbeeld-API:

```ts
export function createMcpServer(): {
  server: McpServer;
  registry: { tools: string[]; prompts: string[] };
};
```

Deze wrapper blijft additive — bestaand gedrag niet raken.

### 4.4 Vangnet CLAUDE.md

CLAUDE.md §Tests bevat al het verbod op private-field access. Voeg één
uitzondering toe bij de specifieke MCP-case met verwijzing naar deze §4.

---

## 5. Portal test-infrastructuur (Q3a-5)

### 5.1 Huidige staat

`apps/portal/package.json` bevat **geen** test-gerelateerde dependencies
en **geen** `test`-script. Scripts: enkel `dev`, `build`, `start`, `lint`,
`type-check`. Er is **geen** `vitest.config.ts`.

### 5.2 Minimale setup-recept voor Q3b (of aparte sprint)

**Dependencies toevoegen (devDependencies):**

```json
{
  "vitest": "^4.1.4",
  "@vitest/coverage-v8": "^4.1.2",
  "@testing-library/react": "^16.1.0",
  "@testing-library/jest-dom": "^6.6.3",
  "@testing-library/user-event": "^14.5.2",
  "jsdom": "^25.0.1"
}
```

Argumentatie `jsdom` vs `happy-dom`: portal gebruikt `react-markdown` +
`remark-gfm`. Die werken beide in happy-dom maar hebben edge-cases bij
complex DOM-walking. `jsdom` is zwaarder maar stabieler. Kies `jsdom`.

**`vitest.config.ts`:**

```ts
import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./__tests__/helpers/setup.ts"],
    include: ["__tests__/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
```

**`__tests__/helpers/setup.ts`:**

```ts
import "@testing-library/jest-dom/vitest";
```

### 5.3 Proef-run

Niet lokaal uitgevoerd (buiten scope spike). Q3b eerste taak = dit recept
implementeren + één smoketest op `apps/portal/src/app/page.tsx`.

---

## 6. UI-package test-infrastructuur (Q3a-6)

### 6.1 Huidige staat

`packages/ui/package.json` heeft geen `test`-script, geen test-deps, geen
`vitest.config.ts`. De package exporteert puur presentational componenten
(shadcn/ui-basis) via `./src/*.tsx`.

### 6.2 Kandidaten voor eerste tests (geen server-dependency)

Gevonden exports die puur client-side zijn (geen `next/*` of server-
afhankelijkheden):

- `Button`, `Badge`, `Card`, `Input`, `Textarea` — klassieke
  variant-prop componenten (class-variance-authority).
- `format.ts` — pure formatters (datum, getal). **Eerste kandidaat:**
  geen DOM nodig, kan in `node`-environment.
- `workspaces.ts` — constantes + logica. **Eerste kandidaat:**
  zelfde reden.
- `utils.ts` (`cn()` helper) — pure functie rond `clsx` + `tailwind-merge`.
  **Eerste kandidaat.**

### 6.3 Setup-recept

**Dependencies toevoegen (devDependencies):**

```json
{
  "vitest": "^4.1.4",
  "@testing-library/react": "^16.1.0",
  "@testing-library/jest-dom": "^6.6.3",
  "@types/react": "^19",
  "jsdom": "^25.0.1"
}
```

**`vitest.config.ts`:**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["__tests__/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    setupFiles: ["./__tests__/helpers/setup.ts"],
  },
});
```

**Volgorde Q3b:** eerst `utils.ts` + `format.ts` in `node`-env (zonder
jsdom), daarna één RTL-test voor `Button` om de jsdom-setup te valideren.

---

## 7. Coverage-tooling (Q3a-7)

### 7.1 Inventaris

`@vitest/coverage-v8@4.1.2` is aanwezig in root `package.json`
devDependencies. **Geen enkele** `vitest.config.*` heeft een `coverage`-
blok. Er is geen `coverage/`-output-map in `.gitignore`. Coverage is dus
installeerbaar maar niet ingesteld.

### 7.2 Per-package targets (pragmatisch)

Gebaseerd op blast-radius uit `docs/dependency-graph.md`:

| Package                    | Doel (lines) | Motivatie                                            |
| -------------------------- | ------------ | ---------------------------------------------------- |
| `packages/ai/pipeline/`    | 80%          | Hoogste blast-radius, 14 critical integration points |
| `packages/database/`       | 70%          | Alle apps hangen hier aan                            |
| `packages/mcp/`            | 70%          | External-facing interface                            |
| `packages/auth/`           | 80%          | Security-kritisch                                    |
| `apps/cockpit/src/actions` | 60%          | Business-logica, maar veel UI-glue                   |
| `apps/devhub/src/actions`  | 60%          | Zelfde                                               |
| `apps/*/app/api`           | 70%          | API routes = contract                                |
| `packages/ui/`             | 40%          | Presentational, lage risk                            |
| `apps/*/components`        | 30%          | UI, handmatig getest                                 |

### 7.3 Voorbeeldconfig (drop-in voor Q3b)

```ts
// vitest.config.ts (per package, met eigen thresholds)
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/__tests__/**", "**/types/**"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});
```

### 7.4 Scripts

Voeg aan root `package.json` toe:

```json
"test:coverage": "turbo test -- --coverage"
```

### 7.5 CI

Voor nu: coverage-rapport als artifact uploaden (niet als merge-gate).
Na T01-T07: upgrade naar `fail on < threshold`.

---

## 8. E2E / integratie-strategie (Q3a-8)

### 8.1 Huidige laag-indeling

| Laag             | Tool                                        | Aantal tests (benadering)   | Status                      |
| ---------------- | ------------------------------------------- | --------------------------- | --------------------------- |
| Unit (pure fns)  | vitest (node)                               | ~180                        | Actief, T01-T07 breiden uit |
| Grens-integratie | vitest + real Supabase via `describeWithDb` | ~45 (nu geskipt zonder env) | Werkt lokaal                |
| E2E (cross-app)  | —                                           | 0                           | **Niet bestaand**           |

### 8.2 Argumenten voor E2E in Q3b

- Cockpit → DevHub cross-quadrant flows (invite user → access → issue
  toewijzen) raken 3 apps in één flow. Unit tests vangen dit niet.
- Portal komt eraan (nog niet live) — vanaf dag 1 met één happy-path
  E2E voorkomt latere grote investeringen.

### 8.3 Argumenten tegen E2E in Q3b

- Playwright/Cypress setup kost 1-2 dagen extra tijdens een sprint die
  al 7 test-executie-sprints heeft (T01-T07).
- Portal is nog niet af — E2E op half-gebouwde flow is verloren werk.
- De grens-integratie-laag (via `describeWithDb` + echte Supabase)
  dekt de kritieke DB-contract-regressies al af.

### 8.4 Beslissing

**Uitstellen tot ná T01-T07.** Splits in aparte sprint Q5a (E2E spike)
zodra Portal MVP live is. Volgorde dan:

1. Cockpit → DevHub: invite user + project-access (AUTH-flow)
2. DevHub: Userback sync → classify → assign (WERK-flow)
3. Portal: client login → view progress → leave feedback (KLANT-flow)

Tool-keuze (voorstel Q5a): Playwright (native TypeScript, Next.js first-
class support, parallel workers, screenshots).

### 8.5 Prioriteitenlijst cross-quadrant flows

Voor wanneer E2E wel komt — volgorde op business-impact:

1. **AUTH-flow** — admin invite in Cockpit → member kan inloggen op
   DevHub → ziet alleen toegewezen projecten.
2. **REVIEW-to-TASK flow** — Cockpit review approved action_item →
   verschijnt als task in dashboard.
3. **ISSUE-INTAKE flow** — Userback sync → classify → assignment →
   Slack-notificatie.

---

## 9. Cockpit bestaande test-audit (Q3a-9)

### 9.1 Steekproef (5 willekeurige tests)

| Bestand                          | Type        | Kwaliteit                                                     |
| -------------------------------- | ----------- | ------------------------------------------------------------- |
| `actions/scan-needs.test.ts`     | Gedragstest | Sterk — mockt alleen pipeline + DB-mutaties, assert op return |
| `actions/segments.test.ts`       | Gedragstest | Sterk — 9 mocks maar alle op grenzen/DB-helpers               |
| `api/cron-reclassify.test.ts`    | Gedragstest | Sterk — end-to-end route mét mocks op grens-Gatekeeper        |
| `api/webhooks-fireflies.test.ts` | Gedragstest | Sterk — auth, payload, error paths allemaal gedekt            |
| `actions/summaries.test.ts`      | Gedragstest | Sterk — policy-tests (who may call) + delegation-tests        |

Nergens aangetroffen:

- Implementatie-tests op interne helpers (`toHaveBeenCalledWith` op
  `mockBuildText` o.i.d.)
- Chainable DB-mocks die query-strings matchen (sinds Q2b opgeschoond)
- Private-field inspectie

### 9.2 Oordeel

De bestaande cockpit-tests zijn van **goede kwaliteit** na de recente
Q2b-refactors. Een aparte audit-sprint is **niet** nodig. Wel twee
incrementele acties voor Q3b om in passerende PRs mee te nemen:

1. Verplaats weggemoved `createChainMock` patroon uit 2 overige tests
   (`ingest-fireflies.test.ts`, `email-sync.test.ts`) naar boundary-
   mocks op helpers.
2. Vervang de 9 MCP "registers the tool" smoketests (§1.3).

---

## 10. Q3b — afgeleide taaklijst

1. **Infra-setup Portal** — deps + `vitest.config.ts` + setup.ts + 1
   smoketest (§5).
2. **Infra-setup UI-package** — deps + config + eerste tests op
   `utils.ts` + `format.ts` + 1 RTL-test (§6).
3. **Coverage-config** — per-package thresholds + `test:coverage`
   script + CI artifact-upload (§7).
4. **Weak assertion cleanup** — 9 MCP smoketests vervangen door
   round-trip (§1.3 + §9.2).
5. **Mock-grens opschoning** — email-pipeline + risk-specialist-step
   tests verschonen van interne mocks (§3.4).
6. **CLAUDE.md update** — mock-grens beleid (§3) + MCP uitzondering
   (§4.3) + verwijzing naar deze doc.
7. **MCP registry-wrapper (optioneel)** — als tijd over: publieke
   `listTools()` in `packages/mcp/src/` (§4.3).

## 11. Afronding Q3a

- [x] Zwakke-assertions-count vastgelegd: 58 exact match (§1).
- [x] Env-setup mysterie opgelost: geen mysterie, skip via helper (§2).
- [x] Mock-grens beleid vastgelegd + huidige schendingen benoemd (§3).
- [x] MCP SDK beslissing: private-field met JSDoc-noot (§4).
- [x] Portal setup-recept klaar (§5).
- [x] UI-package setup-recept klaar (§6).
- [x] Coverage-config voorbeeld klaar (§7).
- [x] E2E-beslissing: uitstellen tot Q5a (§8).
- [x] Cockpit test-audit verdict: geen aparte sprint nodig (§9).

**Q3b kan starten.** Cijfers en beleid staan vast.
