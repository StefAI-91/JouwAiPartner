---
name: feature-folder-migrate
description: >
  Groepeert verspreide code per domein — twee varianten. Variant A (apps):
  migreert een bestaand domein (themes, emails, meetings, ...) van horizontaal
  verspreid over actions/, components/, hooks/, validations/ naar een verticale
  features/[naam]/ map binnen apps/[app]/src/. Variant B (packages): groepeert
  platte files per domein in submappen binnen een technische laag, bv.
  packages/ai/src/pipeline/email/, zonder horizontale structuur van packages
  te breken. Triggers: "migreer naar features/", "maak een feature folder van
  X", "verticaliseer X", "promote to feature", "feature folder", "vertical
  slice voor [feature]", "refactor [feature] naar features/", "groepeer
  packages/ai/pipeline", "submap per domein in packages", "packages shallow
  drift". Gebruik deze skill NIET voor klein-CRUD domeinen (1 file per laag
  volstaat) of voor volledige verticalisering van packages/ zelf (dat breekt
  de monorepo-structuur).
---

# Feature Folder Migrate

Stap-voor-stap draaiboek om verspreide code per domein te groeperen. Twee
varianten, beide volgen het hybride architectuurmodel:

- **Shared code** (queries, mutations, AI-agents, UI-primitives) → blijft
  horizontaal in `packages/` (gedeeld door meerdere apps). **Variant B**
  groepeert er wél binnen een laag per domein in submappen.
- **App-specifieke code** (actions, components, hooks, validations) →
  verhuist verticaal naar `apps/[app]/src/features/[naam]/`. **Variant A**.

## Twee varianten

### Variant A — apps: verticale feature-folder

Typisch gebruik: themes-migratie (uitgevoerd 2026-04-24). Platte laag-
structuur (actions/, components/, hooks/, validations/) wordt vervangen
door verticale feature-mappen:

```
apps/cockpit/src/features/themes/
  ├─ actions/       + index.ts
  ├─ components/    (GEEN barrel)
  ├─ hooks/         + index.ts
  └─ validations/   + index.ts
```

### Variant B — packages: submap per domein binnen een laag

Typisch gebruik: `packages/ai/src/pipeline/` met 20+ platte files die door
3+ duidelijke domeinen heen snijden (email, meeting, weekly). Horizontaal
blijft, maar binnen de laag wordt gegroepeerd:

```
packages/ai/src/pipeline/
  ├─ email/
  │  ├─ pipeline.ts
  │  ├─ pre-classifier.ts
  │  ├─ filter-gatekeeper.ts
  │  └─ index.ts          ← deur
  ├─ meeting/
  │  ├─ gatekeeper.ts
  │  └─ index.ts
  └─ weekly/
     └─ ...
```

Consumers importeren via dezelfde map-naam — als de `[domein].ts` platte
file wordt vervangen door een `[domein]/` map met `index.ts`, blijft
`@repo/ai/pipeline/email` werken zonder consumer-updates.

**Verschil met variant A:** geen nieuwe map-laag (`features/`), geen
cross-laag verhuizing. Alleen **binnen** een bestaande laag submappen
introduceren. Kleinere blast radius, andere regels.

### Welke variant wanneer?

| Situatie                                                                                  | Variant                                  |
| ----------------------------------------------------------------------------------------- | ---------------------------------------- |
| App-specifieke domein verspreid over 4 lagen (actions + components + hooks + validations) | **A**                                    |
| Eén laag in packages heeft 15+ platte files met domein-clusters                           | **B**                                    |
| Eén laag in apps (bv. `actions/`) heeft meerdere domein-clusters                          | **B** (zoals stap 1 van themes-migratie) |
| Volledig nieuwe feature die je vanaf nul bouwt                                            | begin direct in `features/[naam]/`       |

## Waarom dit de moeite waard is

- **AI werkt sneller.** Eén map lezen in plaats van 4 verschillende mappen
  doorzoeken. Voor een non-coder die afhankelijk is van Claude Code: minder
  context-overhead per taak.
- **Feature verwijderen wordt triviaal.** `rm -rf features/[naam]/` +
  imports checken = feature weg. Geen sporen in 4 mappen.
- **Cohesie boven coupling.** Code die samen verandert staat samen. Dat is
  wat Ousterhout "deep modules" noemt en wat Bulletproof React "feature
  modules" noemt.
- **Screaming Architecture.** Je folder-tree vertelt wat de app doet (themes,
  emails, review) in plaats van welke frameworks je gebruikt (components,
  hooks).

## Wanneer toepassen

**Goede kandidaten:**

- Een domein heeft **3+ files per laag** die steeds samen veranderen
- Een nieuwe feature die al groot begint
- Je merkt "waar zit mijn X-code ook alweer?" bij het navigeren

**NIET toepassen bij:**

- Klein-CRUD domeinen (1 file per laag) — dat is over-engineering
- Volledig verticaliseren van `packages/` zelf (bv. `packages/themes/`
  maken) — breekt de Turborepo-structuur. Voor packages alleen
  variant B (submap per domein binnen een laag).
- Midden in een feature-sprint — blast radius discipline, dit is eigen werk
- Codebase zonder groene type-check / build — fix dat eerst, migreer dan

## Workflow

### Stap 0: Dependencies in kaart + import-conventie

**Voer uit vóór je iets verplaatst.** Dit is het belangrijkste onderdeel.

**Eerst check je de project-conventie voor imports.** Kijk naar recente
commits en ESLint-config: gebruikt dit project absolute paden
(`@/features/themes/actions`) of relatieve (`../actions`) binnen een
feature? Veel projecten hebben een `no-relative-parent-imports` of
vergelijkbare ESLint-rule die dit afdwingt via `eslint --fix` bij elke
commit. Als dat zo is: volg die conventie, niet een externe "best
practice". Zie [`references/lessons-learned.md`](references/lessons-
learned.md) les #11.

Maak vervolgens een overzicht van:

1. **Files die verhuizen** (primair domein) — groepeer per laag
2. **Files die verwijderd mogen worden** (sandbox, experimenten)
3. **Externe consumers** (wie importeert uit dit domein, moet imports
   updaten)
4. **Uitgaande dependencies** (wat importeert dit domein zelf — packages/
   blijft, interne paden wisselen van `@/validations/…` naar `@/features/
[f]/validations` of equivalent)
5. **Interne cross-imports** (binnen dezelfde map, `./naam` — blijven
   werken zonder wijziging)
6. **Tests** (horen ze mee of alleen imports updaten?)

Lees [`references/substeps.md`](references/substeps.md) sectie "Stap 0 —
inventarisatie" voor concrete Grep-queries.

**Stop niet voordat je een tabel per laag hebt.** Beslissingen over subpak
(sandbox meeverhuizen? dev-tools apart? deuren wel/niet?) neem je **vóór**
je begint. Zonder deze inventarisatie gaat het mis.

### Stap 1: Drie beslissingen

Voordat je iets verplaatst, neem deze drie beslissingen expliciet:

1. **Sandbox/experimentele routes** — mee verhuizen, apart houden, of
   verwijderen? (Bijvoorbeeld `theme-lab/` bij themes-migratie.)
2. **Dev-tools** — in de feature of blijven ze plat?
3. **Barrel-deuren (`index.ts`) per laag** — welke lagen krijgen een deur?
   Zie [`references/per-laag-regels.md`](references/per-laag-regels.md) —
   kort: actions/hooks/validations JA, components NEE.

### Stap 2: Substappen in deze volgorde

### Variant A (apps → features/)

Verhuis in deze volgorde (laagste blast radius eerst):

- **Substap A**: `validations/` + `hooks/` (meestal 2-3 files totaal)
- **Substap B**: `actions/` (4-6 files)
- **Substap C**: `components/` (10-20 files, grootste risico — geen barrel!)
- **Substap D**: optionele cleanup (sandbox, dev-tools verwijderen)
- **Substap E**: **README schrijven** — altijd. Het menu voor AI en mens.

### Variant B (packages → submap per domein)

Per getroffen laag één substap:

- **B1** per domein: verhuis platte files `[domein]-*.ts` naar submap
  `[domein]/*.ts` + `index.ts`-deur. Herhaal voor elk domein-cluster in
  de laag.
- **B-final**: README per submap (het menu).

**Per substap:** verplaats → imports updaten → verifiëren → handmatige
smoke test → commit. **Stop na elke substap** om te evalueren. Niet
doorstomen.

Volledige uitvoering per substap: zie
[`references/substeps.md`](references/substeps.md).

**README is niet optioneel.** Zonder is de feature/submap onzichtbaar
voor AI — die moet dan 15-40 files lezen om context op te bouwen. Met
README is dat één file. Zie
[`references/substeps.md`](references/substeps.md) sectie "Substap E".

### Stap 3: Verificatie per substap

**Drie lagen verificatie**, in deze volgorde:

1. `npx tsc --noEmit -p apps/[app]` — type-check
2. **`npm run build --workspace=apps/[app]` — productiebuild.** KRITIEK:
   type-check vangt client/server-bundle-problemen NIET. Alleen de build
   doet dat.
3. **Handmatige browser smoke test** door de user — jij kunt niet zelf
   klikken, dus dit is essentieel.

Details in [`references/verification.md`](references/verification.md).

### Stap 4: Commit per substap

**Eén commit per substap.** Niet samenvoegen. Als iets misgaat kun je één
commit terug.

Commit-message stijl:

```
refactor([app]/[feature]): verplaats [laag] naar features/[feature]/[laag]/

[body met wat er verhuisd is + welke imports geüpdate]

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Harde regels

- **Gebruik `git mv`**, nooit copy + delete. Git history behoudt zo de
  file-geschiedenis als rename.
- **Verplaats imports NA de move**, niet voor. Volgorde: mv → relative/
  feature imports updaten → verificaties.
- **Geen drive-by refactors.** Als je onderweg rare code tegenkomt: noteer
  het, niet in deze commit.
- **Pre-commit hooks regenereren dependency-graph.** Laat dat gebeuren,
  dat is normaal.
- **Variant A: queries + mutations gaan NIET mee naar features/.** Die
  blijven horizontaal in `packages/database/` omdat andere apps (devhub,
  portal, MCP) ze ook kunnen gebruiken. Dit geldt óók voor AI-agents in
  `packages/ai/`.
- **Variant B: blijf binnen de bestaande laag.** Submap-groepering binnen
  `packages/ai/pipeline/` of `packages/database/queries/` mag; verhuizen
  naar een nieuwe top-level map niet. Dat is geen verticalisering — dat
  is laag-cleanup.

## Eindstaat (voorbeeld themes)

```
apps/cockpit/src/features/themes/
  ├─ actions/
  │  ├─ crud.ts
  │  ├─ regenerate.ts
  │  ├─ review.ts
  │  └─ index.ts        ← deur, re-exports
  ├─ components/         ← GEEN index.ts (barrel breekt Next.js)
  │  ├─ theme-edit-form.tsx
  │  ├─ theme-pill.tsx
  │  └─ ... (12 andere)
  ├─ hooks/
  │  ├─ use-theme-form-state.ts
  │  └─ index.ts        ← deur
  └─ validations/
     ├─ themes.ts
     └─ index.ts        ← deur
```

## Lessons learned

Zie [`references/lessons-learned.md`](references/lessons-learned.md) voor
details. Korte versie:

1. **Build is niet optioneel.** Altijd productie-build voor commit.
2. **Components-barrel breekt Next.js.** Per-client-component direct
   importeren.
3. **Queries en mutations blijven in packages.** Horizontaal, want gedeeld.
4. **Restore mag.** Tests die per ongeluk naar diepe paden zijn gezet kun
   je terugdraaien als de deur het al oplost.
5. **Klein-CRUD hoort plat.** Niet elke file een submap.
