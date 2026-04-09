# Micro Sprint 015: Testframework Setup (Vitest + Monorepo)

## Doel

Vitest installeren en configureren als testrunner voor de hele monorepo. Na deze sprint kan `npm run test` worden uitgevoerd en draait Vitest succesvol in alle workspaces (packages/database, packages/ai, packages/mcp, apps/cockpit). Er hoeven nog geen echte tests te bestaan — het gaat om de infrastructuur. Een enkel placeholder-testbestand per package bewijst dat de setup werkt.

## Requirements

| ID       | Beschrijving                                                     |
| -------- | ---------------------------------------------------------------- |
| TEST-001 | Vitest als test runner (native TypeScript/ESM support)           |
| TEST-002 | Vitest workspace config voor monorepo (packages + apps)          |
| TEST-003 | Turbo `test` script in root package.json                         |
| TEST-004 | Turbo `test` task in turbo.json                                  |
| TEST-005 | Vitest config per workspace package (database, ai, mcp, cockpit) |

## Bronverwijzingen

- Monorepo structuur: `package.json` (root) — workspaces: `["apps/*", "packages/*"]`
- Turbo config: `turbo.json` — bestaande tasks: build, dev, lint, type-check
- Package configs: `packages/database/package.json`, `packages/ai/package.json`, `packages/mcp/package.json`, `apps/cockpit/package.json`
- TypeScript config: `tsconfig.json` (root) — target ES2017, module esnext, moduleResolution bundler, strict true
- Alle packages gebruiken `"type": "module"` (ESM). Cockpit gebruikt Next.js 16.

## Context

### Relevante technische details

- **ESM-only packages:** `packages/database`, `packages/ai`, `packages/mcp` hebben allemaal `"type": "module"` in package.json. Vitest ondersteunt dit native.
- **Cockpit is Next.js 16:** Gebruikt `moduleResolution: "bundler"`, heeft path alias `@/*` -> `./src/*`. Vitest config moet deze alias resolven.
- **Zod v4:** Het project gebruikt `zod@^4.3.6` (niet v3). Vitest hoeft hier niets speciaals voor te doen.
- **Cross-package imports:** Packages importeren elkaar via workspace references (`@repo/database`, `@repo/ai`). Vitest moet deze resolven.
- **Turborepo:** Bestaande tasks (build, dev, lint, type-check) staan in `turbo.json`. De `test` task moet hieraan worden toegevoegd.

### Monorepo workspace structuur

```
/
├── apps/cockpit/       (Next.js 16 app)
├── packages/database/  (ESM, @repo/database)
├── packages/ai/        (ESM, @repo/ai)
└── packages/mcp/       (ESM, @repo/mcp)
```

### Vitest workspace aanpak

Gebruik een `vitest.workspace.ts` in de root die alle packages en apps definieert. Elke workspace krijgt een eigen `vitest.config.ts` met specifieke instellingen (path aliases, environment).

## Prerequisites

Geen. Dit is de eerste sprint in de testreeks.

## Taken

- [ ] **Installeer Vitest als devDependency in root:** `npm install -D vitest @vitest/coverage-v8` in root `package.json`. Dit maakt Vitest beschikbaar voor alle workspaces via hoisting.

- [ ] **Maak `vitest.workspace.ts` in de root:** Definieer workspaces voor `packages/database`, `packages/ai`, `packages/mcp`, en `apps/cockpit`. Elk met eigen config file.

- [ ] **Maak `vitest.config.ts` per workspace:**
  - `packages/database/vitest.config.ts` — test environment: node
  - `packages/ai/vitest.config.ts` — test environment: node
  - `packages/mcp/vitest.config.ts` — test environment: node
  - `apps/cockpit/vitest.config.ts` — test environment: node, resolve alias `@/*` -> `./src/*`

- [ ] **Voeg `test` scripts toe aan package.json bestanden:**
  - Root: `"test": "turbo test"`, `"test:watch": "vitest --watch"`
  - Elke workspace: `"test": "vitest run"`

- [ ] **Voeg `test` task toe aan turbo.json:** Voeg `"test": { "dependsOn": ["^build"], "cache": false }` toe aan tasks. `cache: false` omdat tests altijd moeten draaien.

- [ ] **Maak een placeholder test per workspace:** Maak een `__tests__/setup.test.ts` bestand in elke workspace met een simpele `describe("setup", () => { it("vitest works", () => { expect(true).toBe(true); }); })`. Dit bewijst dat de setup werkt.

## Acceptatiecriteria

- [ ] TEST-001: `npx vitest run` in de root draait succesvol
- [ ] TEST-002: Vitest workspace config herkent alle 4 workspaces
- [ ] TEST-003: `npm run test` in root voert tests uit via Turbo
- [ ] TEST-004: `turbo test` task bestaat en draait zonder errors
- [ ] TEST-005: Placeholder tests in elke workspace slagen

## Geraakt door deze sprint

- `package.json` (gewijzigd — devDependencies + test script)
- `turbo.json` (gewijzigd — test task)
- `vitest.workspace.ts` (nieuw)
- `packages/database/vitest.config.ts` (nieuw)
- `packages/database/package.json` (gewijzigd — test script)
- `packages/database/__tests__/setup.test.ts` (nieuw)
- `packages/ai/vitest.config.ts` (nieuw)
- `packages/ai/package.json` (gewijzigd — test script)
- `packages/ai/__tests__/setup.test.ts` (nieuw)
- `packages/mcp/vitest.config.ts` (nieuw)
- `packages/mcp/package.json` (gewijzigd — test script)
- `packages/mcp/__tests__/setup.test.ts` (nieuw)
- `apps/cockpit/vitest.config.ts` (nieuw)
- `apps/cockpit/package.json` (gewijzigd — test script)
- `apps/cockpit/__tests__/setup.test.ts` (nieuw)
