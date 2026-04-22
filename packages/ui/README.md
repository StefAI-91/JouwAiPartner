# @repo/ui

Shared UI-componenten voor alle apps (cockpit, devhub, portal). Gebaseerd op shadcn/ui (base-nova style) met Tailwind CSS v4 tokens. Eén plek voor herbruikbare primitieven zoals Button, Badge, Card, Dialog.

## Wanneer gebruiken

- Een component gebruikt op 2+ plekken → verplaats naar `packages/ui/src/`.
- Nieuwe primitieve nodig (bv. een Table-variant) → hier, niet in een app.
- Cross-app UI zoals de workspace switcher → hoort hier.

**Niet hierin:** app-specifieke feature-components (bv. MeetingCard, IssueList), data-fetching, Server Actions. Die blijven in `apps/{cockpit,devhub,portal}/src/components/`.

## Publieke exports

### shadcn-primitieven

Elk bestand exporteert zowel de base-component als varianten/sub-components:

- `@repo/ui/button` — Button + buttonVariants
- `@repo/ui/badge` — Badge + badgeVariants
- `@repo/ui/card` — Card, CardHeader, CardTitle, CardContent, CardFooter
- `@repo/ui/dialog` — Dialog + trigger/content/header/footer
- `@repo/ui/alert-dialog` — destructieve-actie-bevestiging
- `@repo/ui/dropdown-menu` — DropdownMenu + sub-primitieven
- `@repo/ui/select` — Select + Option/Trigger/Content
- `@repo/ui/sheet` — slide-in panel
- `@repo/ui/table` — Table + Header/Row/Cell
- `@repo/ui/tabs` — Tabs + List/Trigger/Content
- `@repo/ui/accordion` — Accordion + Item/Trigger/Content
- `@repo/ui/tooltip` — Tooltip + Provider/Trigger/Content

### Cross-app

- `@repo/ui/workspace-switcher` — sidebar-switcher die tussen cockpit/devhub/portal navigeert via `NEXT_PUBLIC_*_URL` env vars (met Vercel-prod-fallbacks).
- `@repo/ui/workspaces` — de typed definitie van workspace-targets.

### Utilities

- `@repo/ui/utils` — `cn(...classes)` voor Tailwind class-merge.
- `@repo/ui/format` — gedeelde formatters (datum, getal, relatieve tijd).

## Regels

- **shadcn/ui base-nova style.** Geen eigen design-systeem bouwen. Tokens via `@theme` in elke app's `globals.css` — zie `docs/specs/style-guide.md`.
- **Geen data-fetching in dit package.** Alle UI accepteert data via props.
- **Alle states afhandelen.** Default, loading, empty, error.
- **Lucide-icons.** Geen ander icon-pack zonder gedeelde afspraak.
- **Tailwind v4 CSS-first.** Geen `tailwind.config.js` — tokens via `@theme`. Zie app-specifieke `globals.css`.

## Ontwikkeling

```bash
npm test --workspace=@repo/ui          # alle tests
npm run type-check --workspace=@repo/ui
```

Tests staan in `packages/ui/__tests__/`. Behavioral tests (interactie + accessibility), geen snapshot-test zonder diff-review.

## Afhankelijkheden

- Intern: geen (bewust — UI-laag heeft geen domein-kennis)
- Extern: `react`, `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`

## Gerelateerde sprints

- FND-001 (packages/ui foundation), sprint-031 (shared packages cleanup).
