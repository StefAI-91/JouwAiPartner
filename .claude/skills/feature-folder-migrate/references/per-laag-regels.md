# Regels per laag

Niet elke laag gedraagt zich hetzelfde bij een feature-migratie. Deze
regels vast houden voorkomt fouten.

## Voor alle lagen: check eerst de import-conventie

Dit project dwingt **absolute imports** af via ESLint (`no-relative-
parent-imports` of equivalent). Elke `../actions`-stijl import wordt bij
commit automatisch teruggezet naar `@/features/[f]/actions`. Werk dus
direct in de absolute stijl — voorkomt herformatting-diffs na commit.

Uitzondering: **imports binnen dezelfde map** (`./naam`) blijven relatief
— dat is geen parent-import en wordt door ESLint toegestaan.

## actions/ (Server Actions)

**Deur:** ✓ JA — `features/[f]/actions/index.ts` met `export *`

**Waarom veilig:** alle files beginnen met `"use server"`. Next.js
behandelt ze als RPC-eindpunten. Geen client/server-mix mogelijk.

**Interne imports** (naar andere lagen van dezelfde feature):

```ts
// features/[f]/actions/crud.ts
import { ... } from "@/features/[f]/validations";
```

**Externe consumers:** via de deur

```ts
import { createAction, updateAction } from "@/features/[f]/actions";
```

## hooks/

**Deur:** ✓ JA — `features/[f]/hooks/index.ts` met `export *`

**Waarom veilig:** hooks zijn client-only (React-runtime). Geen server-
code erachter. Homogeen.

**Interne imports:**

```ts
// features/[f]/hooks/use-foo.ts
import { X } from "@/features/[f]/validations";
```

**Externe consumers:** via de deur

```ts
import { useFeatureFoo } from "@/features/[f]/hooks";
```

## validations/ (Zod-schemas)

**Deur:** ✓ JA — `features/[f]/validations/index.ts` met `export *`

**Waarom veilig:** pure Zod, geen runtime-imports, geen framework-code.

**Interne imports:** zelden nodig (validations is meestal een bladknoop).

**Externe consumers:** via de deur

```ts
import { createFooSchema } from "@/features/[f]/validations";
```

## components/ (cruciaal — géén barrel)

**Deur:** ✗ NEE — géén `index.ts` barrel

**Waarom niet:**

Next.js scheidt client-code (`"use client"`) en server-code strikt. Een
barrel-file zoals:

```ts
// features/[f]/components/index.ts  ← NIET DOEN
export * from "./client-component-a";
export * from "./server-component-b";
```

Veroorzaakt dit probleem: als een **client component** in een consumer
importeert via de barrel (`@/features/[f]/components`), dan trekt Next.js
álle andere exports mee de client-bundle in. Inclusief componenten die
server-only code importeren (bv. `@repo/auth/access` →
`supabase/server.ts`).

**Symptoom in build:**

```
[Client Component Browser]:
./packages/database/src/supabase/server.ts [Client Component Browser]
./apps/[app]/src/features/[f]/components/server-component.tsx
./apps/[app]/src/features/[f]/components/index.ts
./apps/[app]/src/app/.../page.tsx
```

**Symptoom in productie:** build faalt. Type-check laat het ongemerkt.

**Interne imports binnen components/:** cross-imports binnen de map
blijven relatief en werken na verhuizing zonder wijziging:

```ts
// features/[f]/components/theme-pill.tsx
import { X } from "./donut-palette"; // OK, zelfde map
```

Imports naar andere lagen van dezelfde feature: absolute (project-
conventie via ESLint):

```ts
// features/[f]/components/theme-edit-form.tsx
import { updateAction } from "@/features/[f]/actions";
import { useFooHook } from "@/features/[f]/hooks";
import { fooSchema } from "@/features/[f]/validations";
```

**Externe consumers:** DIRECT per specifieke file, niet via barrel:

```ts
// app/(dashboard)/some/page.tsx
import { ThemeEditForm } from "@/features/themes/components/theme-edit-form";
// NIET: import { ThemeEditForm } from "@/features/themes/components";
```

Dit is exact de stijl die [Bulletproof React](https://github.com/alan2207/bulletproof-react) aanraadt: directe imports,
geen barrel-files voor UI.

## Samenvatting — deur-tabel

| Laag           | Barrel? | Consumer-import                               |
| -------------- | ------- | --------------------------------------------- |
| `actions/`     | ✓ JA    | `@/features/[f]/actions`                      |
| `hooks/`       | ✓ JA    | `@/features/[f]/hooks`                        |
| `validations/` | ✓ JA    | `@/features/[f]/validations`                  |
| `components/`  | ✗ NEE   | `@/features/[f]/components/[specifieke-file]` |

## Wat NIET verhuist naar features/

Hoort in `packages/` (horizontaal — gedeeld):

- **Queries** (`packages/database/src/queries/`) — MCP + andere apps
  kunnen ze hergebruiken
- **Mutations** (`packages/database/src/mutations/`) — idem
- **AI-agents** (`packages/ai/src/agents/`) — idem
- **AI-pipeline stappen** (`packages/ai/src/pipeline/`) — idem
- **UI-primitives** (`packages/ui/`) — shadcn/ui componenten, shared
  tussen apps

Hoort in `app/` (horizontaal — Next.js dicteert):

- **Route-files** (`apps/[app]/src/app/(dashboard)/[feature]/page.tsx`) —
  Next.js App Router dwingt de folder-structuur af. Pages kunnen uiteraard
  wel importeren uit `features/[f]/components/` / `actions/` / etc.

## Packages-variant (variant B) — regels per laag

Binnen een packages-laag mag je per domein submap-groeperen. Zelfde
deur-regels per laag-type als bij variant A:

| Laag                                       | Submap-deur?  | Waarom                                                                |
| ------------------------------------------ | ------------- | --------------------------------------------------------------------- |
| `packages/database/queries/[f]/index.ts`   | ✓ JA          | Alle query-functies zijn server-code, homogeen                        |
| `packages/database/mutations/[f]/index.ts` | ✓ JA          | Idem                                                                  |
| `packages/ai/pipeline/[f]/index.ts`        | ✓ JA          | Pipeline-steps homogeen (allemaal server)                             |
| `packages/ai/agents/[f]/index.ts`          | ✓ JA          | Agent-modules homogeen                                                |
| `packages/ui/[f]/index.ts`                 | ✗ meestal NEE | UI kan client/server mixen — zelfde regel als components in variant A |

### Consumer-path voorbeeld

```ts
// VOOR (platte files met prefix):
import { runEmailPipeline } from "@repo/ai/pipeline/email-pipeline";
import { preClassifyEmail } from "@repo/ai/pipeline/email-pre-classifier";
import { filterEmailGatekeeper } from "@repo/ai/pipeline/email-filter-gatekeeper";

// NA (submap + deur — consumer consolideert tot 1 import):
import { runEmailPipeline, preClassifyEmail, filterEmailGatekeeper } from "@repo/ai/pipeline/email";
```

### Interne imports binnen de submap

Files binnen de submap importeren elkaar met relatieve `./`-paden:

```ts
// packages/ai/src/pipeline/email/pipeline.ts
import { preClassifyEmail } from "./pre-classifier"; // ✓ OK
```

Naar andere submappen binnen dezelfde laag: absolute paden (consistent
met project-conventie):

```ts
// packages/ai/src/pipeline/email/pipeline.ts
import { extractTranscript } from "@repo/ai/pipeline/meeting";
```

### Pages blijft plat

Losse files zonder duidelijk domein-cluster (bv. `tagger.ts`,
`embed-pipeline.ts` als er maar één embed-file is) blijven plat in de
laag. Niet elk bestand hoeft in een submap — zelfde regel als klein-CRUD
in variant A.
