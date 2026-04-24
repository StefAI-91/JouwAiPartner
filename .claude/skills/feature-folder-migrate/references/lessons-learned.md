# Lessons learned

Geleerd tijdens de themes-migratie (TH-folder, 4 substappen, ~45 files).
Neem deze mee bij elke volgende feature-migratie.

## 1. De build is niet optioneel

**Situatie:** stap 2c van de themes-migratie. Type-check groen, smoke test
nog niet gedaan. Gebruiker vroeg: "doe een build".

**Wat gebeurde:** `npm run build` faalde met een client/server-bundle
error die type-check NIET had gevangen. De components-barrel
(`features/themes/components/index.ts`) trok server-only code de client-
bundle in via `meetings-tab.tsx` (een client component).

**Les:** run altijd een productie-build vóór je een feature-refactor
commit, niet alleen de type-check. De tools vangen verschillende dingen:

| Check              | Wat het vangt                                             |
| ------------------ | --------------------------------------------------------- |
| `tsc --noEmit`     | Ontbrekende imports, type-fouten                          |
| `npm run build`    | Client/server-mix, Next.js specifiek, tree-shaking issues |
| Browser smoke test | Runtime gedrag, data-flow, UI                             |

Alle drie nodig, geen substituten.

## 2. Barrel-files breken Next.js client/server-scheiding

**Situatie:** we hadden per laag een `index.ts`-deur gepland. Voor
`actions/`, `hooks/`, `validations/` werkte dat prima. Voor `components/`
faalde de build.

**Oorzaak:** components-laag is heterogeen — sommige zijn `"use client"`,
sommige worden vanuit server-pages geïmporteerd, en sommige importeren
transitief server-code (via `@repo/auth/access` → `supabase/server.ts`).

Een barrel-file (`export * from ...`) dwingt Next.js om **alle exports
te analyseren** voor elk import-punt. Als één file server-code aanraakt,
wordt dat deel van elke client-bundle die de barrel gebruikt — en crash.

**Les:** barrel voor homogene lagen (alles server, alles client, alles
pure-data). Géén barrel voor gemixte lagen zoals components.

Dit matcht [Bulletproof React's advies](
https://github.com/alan2207/bulletproof-react/blob/master/docs/project-
structure.md): "No barrel files — direct imports preferred to avoid Vite
tree-shaking issues". Next.js heeft hetzelfde issue.

## 3. Queries en mutations blijven in packages/

**Situatie:** bij het plannen van de themes-migratie dacht Stef: "themes
heeft toch geen queries?". Vraag: horen queries ook in de feature?

**Antwoord:** nee. Queries staan in `packages/database/src/queries/
theme-*.ts` en blijven daar. Redenen:

- **MCP-server** (`packages/mcp/`) kan er bij
- **Andere apps** (devhub, portal) kunnen ze hergebruiken
- **Horizontaal** → hoort horizontaal

**Les:** de hybride regel is strikt. Shared code in packages (horizontaal).
App-specifieke UI + lifecycle in features (verticaal). Nooit queries of
mutations in een feature-folder zetten.

## 4. Restore mag, gewoon naar HEAD

**Situatie:** bij stap 1 ontdekten we dat themes-tests in de working copy
waren omgezet naar diepe paden (`../../src/actions/themes/crud`) — de
verkeerde richting. Niet mijn werk, maar iemand had het gedaan.

**Actie:** `git restore apps/cockpit/__tests__/actions/themes*.test.ts` —
en daarna werkte alles want de dynamic import `../../src/actions/themes`
laadt nu automatisch door de nieuwe `themes/index.ts`-deur.

**Les:** als een test (of ander bestand) een working-copy verandering
heeft die tegen onze migratie-richting ingaat, mag je `git restore` naar
HEAD. Dat is geen wijziging — dat is terug naar de source of truth.

## 5. Klein-CRUD hoort plat

**Situatie:** bij de inventarisatie voor stap 2 kwam de vraag: `actions/
people.ts` (68 regels), `organizations.ts` (77), `projects.ts` (73) —
moeten die ook naar `features/`?

**Antwoord:** niet nu. Deze domeinen zijn klein — 1 file per laag volstaat.
Een `features/people/actions/people.ts` + `features/people/components/
...` + `features/people/index.ts` maken voor 68 regels is
over-engineering.

**Les:** de drempel voor verticalisering is **3+ files per laag** of
**~150+ regels per file**. Daaronder: laat horizontaal. Submappen voor
kleine domeinen kosten meer cognitive overhead dan ze opleveren.

## 6. `git mv` behoudt geschiedenis

**Situatie:** normaal `mv` (of copy + delete) verliest git-geschiedenis.
`git log` ziet het als "file X verwijderd, file Y toegevoegd" — blame
wordt onbereikbaar.

**Les:** gebruik ALTIJD `git mv` voor verhuizingen. Git herkent het dan
als rename (R status) en `git log --follow` werkt over de verhuizing
heen.

```bash
git mv apps/cockpit/src/components/themes/theme-pill.tsx \
       apps/cockpit/src/features/themes/components/theme-pill.tsx
```

## 7. Pre-commit hooks regenereren dependency-graph

**Situatie:** na elke commit werd `docs/dependency-graph.md` ook
gemodificeerd door de Husky-hook. Dit is verwacht gedrag.

**Les:** niet in paniek als je dat ziet. Het is de `npm run dep-graph`-
hook. Laat de commit het meenemen of commit apart.

## 8. Stop na elke substap

**Situatie:** de verleiding is groot om 2a → 2b → 2c door te drammen. Maar
we hadden expliciet afgesproken: stop, evalueer, dan pas door.

**Les:** de pauze is de waarde. Door te stoppen:

- Krijgt de gebruiker kans om smoke-testen in de browser
- Voorkom je dat een subtiele fout zich accumuleert over meerdere
  substappen
- Blijft de blast radius per commit klein (= eenvoudig te reverten)

Forceer die pauze. Zelfs als alles groen lijkt.

## 9. Tests zijn consumers

Bij het inventariseren van consumers: vergeet `__tests__/` niet. Dynamic
imports (`await import("../../src/actions/themes")`) breken net zo hard
als statische imports als je het pad niet aanpast.

Zoek-patroon:

```bash
Grep "(from|import|require)\(['\"][^'\"]*/[feature]" apps/[app]/__tests__/
```

## 10. Een gemiste test-file is normaal

Bij de components-migratie vergat ik `__tests__/components/donut-segments.
test.ts` in de eerste ronde. Type-check ving het op. Belangrijk: paniek
niet als iets vergeten is — de verificaties vangen het op, dat is waarom
we ze doen.

Standard fix: read → edit → verificaties opnieuw. Kost 2 minuten.

## 11. Variant B is geen "half-variant A"

Toen Stef vroeg "kunnen we dit ook met packages doen?", zat er een
verleiding in: "ja, we maken `packages/themes/`". **Dat is fout.**

**Waarom:** packages in een Turborepo zijn zelfstandige build-units met
eigen `package.json`, `tsconfig`, types. Per-feature packages splitsen
maakt van de monorepo een archipel — elke feature wordt een eiland met
eigen dependencies, versioning, test-setup. MCP, devhub en andere apps
die nu netjes importeren uit `@repo/database/queries/X` zouden ineens met
10 verschillende packages moeten communiceren.

**Wat wél mag:** binnen een bestaande laag per domein submap-groeperen.
`packages/ai/pipeline/email/` is variant B. `packages/email/` zou
monorepo-structuur-schade zijn.

**Les:** het hybride model heeft een vaste grens. Packages blijven
horizontaal **per laag** — dat is een eigenschap van Turborepo, niet
alleen een stijl-keuze. Submap-groepering binnen een laag werkt
uitstekend en is de juiste toepassing van het "deep modules"-principe
voor shared code.

## 12. Volg de project-conventie voor imports, niet je intuïtie

**Situatie:** bij stap 2c schreef ik binnen de feature relatieve imports
(`import { X } from "../actions"`) in plaats van absolute (`import { X }
from "@/features/themes/actions"`). Dat is wat Bulletproof React aanraadt
en wat ik in de eerste versie van de skill had opgeschreven.

**Wat er gebeurde:** de pre-commit hook draait `eslint --fix` + `prettier
--write` op alle staged files. De ESLint-config van dit project dwingt
absolute imports af (waarschijnlijk via `no-relative-parent-imports` of
een vergelijkbare rule). Gevolg: mijn relatieve paden werden automatisch
teruggezet naar absolute vóór de commit, en mijn working copy bleef in
relatieve staat — elke `git status` toonde M-files die "niet klopten".

**Les:** **check vóór je begint de project-conventie voor imports.**
Externe best practices (Bulletproof React, Ousterhout, etc.) zijn goede
startpunten, maar de lokale ESLint-config wint altijd. Als `eslint --fix`
een patroon afdwingt, werk dan direct in dat patroon. Voorkomt:

- Onnodige working-copy drift na commit
- Verwarring bij `git status` ("waarom zijn deze M?")
- Inconsistentie tussen wat je schreef en wat er in git zit

**Hoe check je:**

```bash
# Kijk naar een recente commit in de codebase
git log -p --follow -- apps/[app]/src/features/ | head -50

# Of check de eslint config direct
cat apps/[app]/eslint.config.* .eslintrc.* 2>/dev/null
```

Als recente commits overal `@/…`-paden gebruiken en geen `../…`-paden
binnen dezelfde feature: schrijf absolute, punt uit.

## 13. In packages-variant mag relatief wél

In variant B (packages) is de conventie vaak juist **relatief binnen
dezelfde submap**. Bijvoorbeeld `packages/ai/pipeline/email/pipeline.ts`
importeert `./pre-classifier` — dat is binnen-map-relative, niet parent-
relative. ESLint-rule `no-relative-parent-imports` slaat alleen op `../`
en hoger.

Cross-submap in packages blijft absolute:

```ts
// packages/ai/pipeline/email/pipeline.ts
import { X } from "./pre-classifier"; // ✓ OK (zelfde map)
import { Y } from "@repo/ai/pipeline/meeting"; // ✓ OK (andere submap, absolute)
import { Z } from "../meeting/gatekeeper"; // ✗ parent-relative, ESLint blokkeert
```
