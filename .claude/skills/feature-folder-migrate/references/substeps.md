# Substappen — detail

Voer uit in volgorde. Pauze na elke substap (commit + evaluatie).

**Twee varianten:**

- **Variant A** (apps → verticale features/): Stap 0 + A/B/C/D/E hieronder
- **Variant B** (packages → submap per domein): zie "Variant B —
  packages-variant" aan het eind van dit document

## Stap 0 — Inventarisatie (GEEN moves)

Voer altijd eerst uit. Doel: begrijpen wat er beweegt, wat er raakt, wat
er verwijderd mag.

### Grep-queries

```bash
# 1. Alle files met de feature-naam erin
Glob **/*[feature-naam]*

# 2. Inkomende imports (wie importeert uit dit domein)
Grep "from ['\"]@/(actions|components|hooks|validations)/[feature]" apps/

# 3. Uitgaande imports (wat importeert dit domein zelf)
Grep "from ['\"](@/|\.\./)" apps/[app]/src/[layer]/[feature]/

# 4. Interne cross-imports binnen de map
Grep "from ['\"]\./" apps/[app]/src/components/[feature]/

# 5. Tests die naar dit domein verwijzen
Grep "[feature]" apps/[app]/__tests__/
```

### Tabellen die je oplevert

**A. Files die verhuizen** (per laag):

| Bestemming                | Aantal | Files             |
| ------------------------- | ------ | ----------------- |
| features/[f]/actions/     | X      | crud, review, ... |
| features/[f]/components/  | X      | ...               |
| features/[f]/hooks/       | X      | ...               |
| features/[f]/validations/ | X      | ...               |

**B. Files die verwijderd mogen worden** (sandbox, experimenten):

| Map                 | Files | Blast radius                    |
| ------------------- | ----- | ------------------------------- |
| app/[sandbox-route] | X     | Check: importeert iemand eruit? |

**C. Externe consumers** (imports updaten):

| File                         | Import(s)              | Nieuwe path                      |
| ---------------------------- | ---------------------- | -------------------------------- |
| app/(dashboard)/[x]/page.tsx | ComponentA, ComponentB | @/features/[f]/components/[naam] |

**D. Tests**:

| Test | Huidige import | Nieuwe import |
| ---- | -------------- | ------------- |

Leg deze tabellen voor aan de gebruiker **vóór** je iets verplaatst. Vraag
naar akkoord op:

1. Scope (wat wel/niet)
2. Sandbox-behandeling (verhuizen/verwijderen/laten)
3. Deur-strategie per laag

## Substap A — validations/ + hooks/

**Waarom eerst:** laagste blast radius (meestal 2-3 files totaal).

### Uitvoering

```bash
# 1. Maak doel-directories
mkdir -p apps/[app]/src/features/[f]/validations
mkdir -p apps/[app]/src/features/[f]/hooks

# 2. Verhuis met git mv
git mv apps/[app]/src/validations/[f].ts apps/[app]/src/features/[f]/validations/[f].ts
git mv apps/[app]/src/hooks/use-[f]-*.ts apps/[app]/src/features/[f]/hooks/

# 3. Maak deuren
# features/[f]/validations/index.ts:
#   export * from "./[f]";
# features/[f]/hooks/index.ts:
#   export * from "./use-[f]-foo";
#   export * from "./use-[f]-bar";

# 4. Update imports (absolute — dit project dwingt absolute af via ESLint):
# - In de hooks (als ze validations gebruiken): @/validations/[f] → @/features/[f]/validations
# - In externe consumers: @/validations/[f] → @/features/[f]/validations
# - In externe consumers: @/hooks/use-[f]-* → @/features/[f]/hooks
# - In tests: ../../src/hooks/use-[f]-* → ../../src/features/[f]/hooks/use-[f]-*
```

### Verificatie

- `tsc --noEmit` → 0 errors
- `grep "@/validations/[f]"` → 0 matches
- `grep "@/hooks/use-[f]-"` → 0 matches

### Commit

```
refactor([app]/[f]): verplaats validations + hooks naar features/[f]/
```

## Substap B — actions/

**Waarom tweede:** medium blast radius. Meestal 3-6 files + `index.ts`.

### Uitvoering

```bash
# 1. Maak doel-directory
mkdir -p apps/[app]/src/features/[f]/actions

# 2. Verhuis ALLES (inclusief bestaande index.ts)
git mv apps/[app]/src/actions/[f]/*.ts apps/[app]/src/features/[f]/actions/
# Of per bestand als ze individueel staan

# 3. Update interne imports (in de verhuisde actions):
# @/validations/[f] → @/features/[f]/validations (project dwingt absolute af via ESLint)

# 4. Update externe consumers:
# @/actions/[f] → @/features/[f]/actions (3-6 files meestal)

# 5. Update tests:
# "../../src/actions/[f]" → "../../src/features/[f]/actions"
```

### Verificatie

- `tsc --noEmit` → 0 errors
- `grep "@/actions/[f]"` → 0 matches
- `ls apps/[app]/src/actions/[f]` → empty/niet-bestaand

### Commit

```
refactor([app]/[f]): verplaats actions naar features/[f]/actions/
```

## Substap C — components/ (grootste risico)

**Waarom laatst:** grootste blast radius (10-20 files) + **client/server
valkuil**.

### Uitvoering

```bash
# 1. Maak doel-directory
mkdir -p apps/[app]/src/features/[f]/components

# 2. Verhuis ALLE files via loop
for f in file1.tsx file2.tsx ...; do
  git mv "apps/[app]/src/components/[f]/$f" "apps/[app]/src/features/[f]/components/$f"
done

# 3. GEEN index.ts barrel aanmaken!
#    (Zie per-laag-regels.md — breekt Next.js client/server scheiding)

# 4. Update interne imports (binnen verhuisde components):
# @/actions/[f] → @/features/[f]/actions
# @/hooks/… → @/features/[f]/hooks
# @/validations/[f] → @/features/[f]/validations
# (project dwingt absolute af via ESLint — niet proberen te relativiseren)
# Cross-imports binnen components-map (./foo) blijven werken zonder wijziging

# 5. Update externe consumers:
# @/components/[f]/[naam] → @/features/[f]/components/[naam]
# (DIRECT, niet via barrel — voorkomt client/server problemen)
```

### Verificatie (kritiek — DOE DE BUILD)

- `tsc --noEmit` → 0 errors
- `grep "@/components/[f]"` → 0 matches
- **`npm run build --workspace=apps/[app]` → moet slagen**
- Browser smoke test door gebruiker

### Als de build faalt

Symptoom:

```
[Client Component Browser]:
./packages/database/src/supabase/server.ts [Client Component Browser]
```

Oorzaak: een client component importeert via een barrel die ook server-code
doortrekt. Fix: directe imports per specifieke component in de consumers.

### Commit

```
refactor([app]/[f]): verplaats components naar features/[f]/components/
```

Vermeld in body: "Bulletproof React-stijl voor components (geen barrel)
omdat dit de Next.js client/server scheiding breekt."

## Substap D — Optionele cleanup

**Alleen als van toepassing.** Sandbox/experimentele routes verwijderen,
dev-tools opruimen.

### Voorbeeld: theme-lab

```bash
# 1. Verifieer: niemand importeert eruit
grep -r "theme-lab" apps/[app]/src/ --include="*.ts" --include="*.tsx"

# 2. Verwijder
git rm -r apps/[app]/src/app/(dashboard)/theme-lab

# 3. Clean-up docstring-references naar verwijderde bestanden
# (bijv. comments in features/[f]/components die naar theme-lab verwezen)
```

### Verificatie

- `tsc --noEmit` → 0 errors
- `npm run build` → slaagt
- `grep [sandbox-naam]` → 0 matches

### Commit

```
chore([app]/[f]): verwijder [sandbox-naam] sandbox
```

## Substap E — README schrijven (verplicht)

**Doel:** één file die het volledige menu van de feature beschrijft. AI
hoeft deze te lezen om context op te bouwen, niet 15-40 source files.

### Locatie

- `apps/[app]/src/features/[f]/README.md` — als de feature volledig
  verticaal is
- `apps/[app]/src/actions/[f]/README.md` — als alleen de actions-laag
  verticaal is (tussenstap, met verwijzing naar waar de rest zit)

### Verplichte secties

1. **Inleiding** — wat doet deze feature in 2-3 zinnen. Business purpose,
   geen tech-jargon.
2. **Structuur** — mappen-tree + uitleg per laag (waarom wel/geen deur).
3. **Menu per laag** — tabellen met alle exports:
   - Actions: functie-naam + wat hij doet
   - Hooks: export + type + doel
   - Validations: schemas, types, constanten
   - Components: naam + props-interface (ruwe shape) + doel
4. **Import-patterns voor consumers** — voorbeelden voor server-, client-
   en test-imports.
5. **Gerelateerde packages** — tabel met wat in `packages/database/` en
   `packages/ai/` hoort (horizontaal, blijft daar).
6. **Database** — welke tabellen, welke migraties. Kort.
7. **Routes** — welke app-routes consumeren deze feature.
8. **Design decisions** — belangrijke tradeoffs (bv. waarom componenten
   geen barrel, waarom X wél en Y niet meegeschoven).
9. **Tests** — waar staan ze + welke dekken wat.
10. **Migratie-historie** — commit-hashes per substap (voor blame/
    herstelbaarheid).

### Vorm

- **Markdown, tabellen voor menu-secties** — scannable voor AI.
- **Geen code-duplicatie** — linken naar files via relatief pad, niet hele
  functies kopiëren.
- **~100-300 regels totaal** — langer = niemand leest, korter = te weinig
  context.

### Template

Kijk naar `apps/cockpit/src/features/themes/README.md` (eerste volledig-
verticale feature) voor een compleet voorbeeld.

### Verificatie

- [ ] AI kan in één file-read de interface van de feature begrijpen
- [ ] Alle publieke exports staan in een tabel
- [ ] Import-patterns zijn concreet (geen "gebruik de deur")
- [ ] Gerelateerde packages staan erbij (voor context over wat NIET in de
      feature leeft)

### Commit

```
docs([app]/[f]): README met feature-menu voor AI en mens
```

---

# Variant B — packages-variant

Voor het groeperen van platte files binnen een technische laag in
packages. Typische aanleiding: `packages/ai/src/pipeline/` heeft 15-20+
platte files met duidelijke domein-prefixes (`email-*`, `meeting-*`,
`weekly-*`).

## Stap 0 — Inventarisatie per laag

```bash
# Scan de platte files in de laag
ls packages/[pkg]/src/[laag]/

# Groepeer per prefix — welke domeinen zijn er?
# Bv. in packages/ai/src/pipeline/:
#   email-*   → 3 files
#   meeting-* → 2 files (impliciet: gatekeeper-pipeline, summary-pipeline)
#   weekly-*  → 1 file
#   losse (embed-pipeline, tagger) → geen domein, blijven plat
```

Leg per domein voor:

- Files die in de submap komen (naam-prefix matching)
- Files die losstaan (blijven plat in de laag)
- Consumer-imports die het huidige pad gebruiken

### Import-migratie-voordeel

Als het oude pad `@repo/[pkg]/[laag]/email-pipeline` was (platte file
`email-pipeline.ts`), en je verhuist naar `email/pipeline.ts` met
`email/index.ts` deur, dan is de nieuwe consumer-import:

```ts
// OUD (platte file):
import { runEmailPipeline } from "@repo/ai/pipeline/email-pipeline";

// NIEUW (submap met deur — consumer moet wél updaten):
import { runEmailPipeline } from "@repo/ai/pipeline/email";
```

**Trick om consumer-updates te vermijden** (als de prefix één domein
heeft): hernoem `email-pipeline.ts` naar `email.ts` (één file, geen
submap). Dan blijft `@repo/ai/pipeline/email` werken zonder wijziging.
Alleen doen als er **één** file per domein is.

## Stap B1 — Groepeer één domein

Bijvoorbeeld "email" in `packages/ai/src/pipeline/`:

```bash
# 1. Maak doel-directory
mkdir -p packages/ai/src/pipeline/email

# 2. Verhuis alle email-* files naar email/ en strip de prefix
git mv packages/ai/src/pipeline/email-pipeline.ts          packages/ai/src/pipeline/email/pipeline.ts
git mv packages/ai/src/pipeline/email-pre-classifier.ts    packages/ai/src/pipeline/email/pre-classifier.ts
git mv packages/ai/src/pipeline/email-filter-gatekeeper.ts packages/ai/src/pipeline/email/filter-gatekeeper.ts

# 3. Maak index.ts (de deur)
# packages/ai/src/pipeline/email/index.ts:
#   export * from "./pipeline";
#   export * from "./pre-classifier";
#   export * from "./filter-gatekeeper";

# 4. Update interne cross-imports binnen de nieuwe email/ map
#    (imports tussen de drie files — relatieve ./-imports blijven werken
#    als ze nu al ./ gebruikten; anders pad aanpassen)

# 5. Update consumer-imports
#    @repo/ai/pipeline/email-pipeline         → @repo/ai/pipeline/email
#    @repo/ai/pipeline/email-pre-classifier   → @repo/ai/pipeline/email
#    @repo/ai/pipeline/email-filter-gatekeeper → @repo/ai/pipeline/email
#    (Alle drie via de deur — één import per consumer)
```

## Verificatie

- `tsc --noEmit -p packages/[pkg]` → 0 errors
- `npx tsc --noEmit -p apps/cockpit` + andere apps → 0 errors (de
  packages-wijziging raakt consumers in apps)
- **`npm run build` op elke app die de package consumeert** — dit is
  essentieel, packages raken meerdere apps
- `grep "@repo/[pkg]/[laag]/[domein]-"` → 0 matches

## Geen per-laag deuren in packages-variant

In `packages/` heeft elke technische laag al een deur (`packages/[pkg]/
src/index.ts` of directe module-paden). De submap-deur van variant B is
voldoende — geen extra laag nodig.

## Commit per domein

```
refactor(ai/pipeline): groepeer email-* files in pipeline/email/ submap
```

## Substap B-final — README per submap

Voor elke nieuwe submap een README, zelfde vorm als variant A maar
compacter:

- **Wat zit in deze submap** (menu per file)
- **Consumer-import pattern** (`@repo/[pkg]/[laag]/[domein]`)
- **Gerelateerde files buiten deze submap** (als van toepassing)

Locatie: `packages/[pkg]/src/[laag]/[domein]/README.md`.

### Commit

```
docs([pkg]/[laag]): README per submap met deur-menu
```
