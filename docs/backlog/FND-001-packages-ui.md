# Micro Sprint FND-001: packages/ui/ — Shared UI Component Library

## Doel

Een gedeeld UI-pakket (`packages/ui/`) opzetten zodat cockpit, devhub en het toekomstige portal dezelfde basis-componenten gebruiken. Voorkomt dat elke app zijn eigen kopie van Button, Sheet, Badge etc. onderhoudt. Na deze sprint importeren beide apps hun UI-componenten uit `@repo/ui`.

## Waarom

Met 3 geplande apps (cockpit, devhub, portal) wordt elke gedupliceerde component 3x onderhouden. Nu al zijn Button en Sheet in beide apps gekopieerd met subtiele verschillen. Dit sprint elimineert die duplicatie.

## Prerequisites

Geen — dit is een fundament-sprint die voor alles kan.

## Inventaris huidige duplicatie

| Component | Cockpit (regels) | DevHub (regels) | Verschil                                        |
| --------- | ---------------- | --------------- | ----------------------------------------------- |
| Button    | 60               | 49              | Cockpit heeft meer variants (xs, icon-xs, link) |
| Sheet     | 125              | 86              | Cockpit is volledigere versie                   |
| Badge     | 49               | —               | Alleen cockpit                                  |
| Card      | 92               | —               | Alleen cockpit                                  |
| Accordion | 72               | —               | Alleen cockpit                                  |
| Tabs      | 93               | —               | Alleen cockpit (custom, niet shadcn)            |
| `cn()`    | 7                | 7               | Identiek                                        |

## Taken

### Taak 1: Package opzetten

Maak `packages/ui/` aan met de juiste monorepo-configuratie:

```
packages/ui/
├── package.json
├── tsconfig.json
└── src/
    ├── utils.ts          ← cn() helper
    ├── button.tsx
    ├── badge.tsx
    ├── card.tsx
    ├── sheet.tsx
    ├── accordion.tsx
    └── tabs.tsx
```

**package.json:**

```json
{
  "name": "@repo/ui",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    "./*": "./src/*.tsx",
    "./utils": "./src/utils.ts"
  },
  "dependencies": {
    "@base-ui/react": "^1.3.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^1.7.0",
    "tailwind-merge": "^3.5.0"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "typescript": "^5.8.0"
  }
}
```

### Taak 2: Componenten verplaatsen

Gebruik de **cockpit-versies** als bron (die zijn vollediger). Verplaats naar `packages/ui/src/`:

1. `button.tsx` — uit `apps/cockpit/src/components/ui/button.tsx`
2. `badge.tsx` — uit `apps/cockpit/src/components/ui/badge.tsx`
3. `card.tsx` — uit `apps/cockpit/src/components/ui/card.tsx`
4. `sheet.tsx` — uit `apps/cockpit/src/components/ui/sheet.tsx`
5. `accordion.tsx` — uit `apps/cockpit/src/components/ui/accordion.tsx`
6. `tabs.tsx` — uit `apps/cockpit/src/components/ui/tabs.tsx`
7. `utils.ts` — `cn()` functie (identiek in beide apps)

**Let op:**

- Alle componenten importeren `cn` uit `./utils` (relatief) in plaats van `@/lib/utils`
- Geen app-specifieke imports

### Taak 3: Cockpit updaten

1. Verwijder `apps/cockpit/src/components/ui/` (hele map)
2. Verwijder `cn()` uit `apps/cockpit/src/lib/utils.ts` (als er niets anders in staat, verwijder het bestand)
3. Voeg `"@repo/ui": "*"` toe aan `apps/cockpit/package.json` dependencies
4. Voeg `"@repo/ui"` toe aan `transpilePackages` in `apps/cockpit/next.config.ts`
5. Zoek-en-vervang alle imports:

```typescript
// OUD
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// NIEUW
import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import { cn } from "@repo/ui/utils";
```

### Taak 4: DevHub updaten

1. Verwijder `apps/devhub/src/components/ui/` (hele map)
2. Verwijder `apps/devhub/src/lib/utils.ts`
3. Voeg `"@repo/ui": "*"` toe aan `apps/devhub/package.json` dependencies
4. Voeg `"@repo/ui"` toe aan `transpilePackages` in `apps/devhub/next.config.ts`
5. Zoek-en-vervang alle imports (zelfde patroon als cockpit)

### Taak 5: Shared dependencies opruimen

Verwijder uit **beide** app package.json's de dependencies die nu in `@repo/ui` zitten:

- `class-variance-authority`
- `clsx`
- `tailwind-merge`

Deze worden nu transitief via `@repo/ui` meegenomen.

### Taak 6: Verify

1. `npm install` (root)
2. `npm run type-check`
3. `npm run build`
4. Controleer dat beide apps correct compileren

## Acceptatiecriteria

- [ ] `packages/ui/` bestaat met alle 6 componenten + utils
- [ ] Cockpit heeft geen `components/ui/` map meer
- [ ] DevHub heeft geen `components/ui/` map meer
- [ ] Alle imports in beide apps wijzen naar `@repo/ui/*`
- [ ] `npm run build` slaagt voor beide apps
- [ ] Geen `cn()` duplicatie meer in `lib/utils.ts`

## Risico's

- Tailwind v4 CSS-first tokens moeten beschikbaar zijn in het ui-package. Oplossing: componenten gebruiken alleen Tailwind utility classes die de consuming app definieert in `globals.css`.
- shadcn CLI (`npx shadcn add`) moet worden geconfigureerd om naar `packages/ui/src/` te schrijven in plaats van de app.
