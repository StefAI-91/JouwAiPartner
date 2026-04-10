# Micro Sprint DH-011: Component refactoring en code kwaliteit

## Doel

De oversized componenten opsplitsen, prop drilling verminderen, en ontbrekende loading/error boundaries toevoegen. Na deze sprint voldoen alle DevHub componenten aan de 150-regels richtlijn, is de IssueSidebar interface vereenvoudigd, en heeft elke route een loading en error boundary.

## Bevindingen uit architectuurreview

Deze sprint adresseert de volgende bevindingen uit de DevHub architectuurreview (10 april 2026):

| #   | Bevinding                                           | Ernst  | Locatie                                        |
| --- | --------------------------------------------------- | ------ | ---------------------------------------------- |
| 5   | IssueSidebar: 307 regels, moet gesplitst            | HOOG   | `issue-sidebar.tsx`                            |
| 6   | IssueForm: 271 regels, moet gesplitst               | HOOG   | `issue-form.tsx`                               |
| 7   | IssueRowItem: 223 regels, desktop/mobile duplicatie | HOOG   | `issue-row.tsx`                                |
| 8   | Prop drilling: 14 losse props naar IssueSidebar     | HOOG   | `issue-detail.tsx:121-138`                     |
| 9   | Ontbrekende loading.tsx en error.tsx op 3 routes    | MEDIUM | `/issues/new`, `/settings`, `/settings/import` |
| 10  | Suspense zonder fallback in app layout              | MEDIUM | `(app)/layout.tsx:14,18`                       |
| 11  | Polling via router.refresh() elke 3 seconden        | MEDIUM | `ai-execution-panel.tsx:56`                    |
| 12  | Ontbrekende searchParams validatie                  | MEDIUM | `issues/page.tsx`                              |

## Taken

### Taak 1: IssueSidebar opsplitsen (307 -> ~150 regels)

**Probleem:** `issue-sidebar.tsx` bevat 307 regels met meerdere verantwoordelijkheden: editable fields, read-only display, AI classificatie sectie, en delete confirmatie.

**Oplossing:**

- [ ] Verplaats `SidebarSelect` en `SidebarAssignee` naar `apps/devhub/src/components/issues/sidebar-fields.tsx` — dit zijn generieke form controls die ook elders bruikbaar zijn
- [ ] Verplaats AI classificatie sectie (regels 251-274) naar `apps/devhub/src/components/issues/sidebar-ai-classification.tsx`
- [ ] Verplaats delete confirmatie (regels 276-303) naar `apps/devhub/src/components/issues/sidebar-delete.tsx`
- [ ] `IssueSidebar` wordt een composer die de sub-componenten rendert

**Geraakt:**

- `apps/devhub/src/components/issues/issue-sidebar.tsx` (refactor, ~100 regels)
- `apps/devhub/src/components/issues/sidebar-fields.tsx` (nieuw)
- `apps/devhub/src/components/issues/sidebar-ai-classification.tsx` (nieuw)
- `apps/devhub/src/components/issues/sidebar-delete.tsx` (nieuw)

### Taak 2: IssueSidebar prop drilling oplossen

**Probleem:** `IssueDetail` geeft 14 individuele props door aan `IssueSidebar` (regels 121-138). Elk nieuw veld vereist wijzigingen in beide componenten.

**Oplossing:**

- [ ] Wijzig `IssueSidebarProps` interface: vervang de 14 losse issue-velden door een enkel `issue` object
- [ ] Nieuwe interface:
  ```typescript
  interface IssueSidebarProps {
    issue: IssueRow;
    people: Person[];
    onFieldChange: (field: string, value: string | null) => void;
    isPending: boolean;
  }
  ```
- [ ] Update `IssueDetail` om `issue={issue}` door te geven in plaats van losse props
- [ ] Update `IssueSidebar` om velden uit `issue` object te lezen
- [ ] De `aiClassification` parsing die nu in `issue-detail.tsx:55-64` zit, verplaatsen naar `IssueSidebar` zelf (of naar de nieuwe `sidebar-ai-classification.tsx`)

**Geraakt:**

- `apps/devhub/src/components/issues/issue-sidebar.tsx` (interface wijzigen)
- `apps/devhub/src/components/issues/issue-detail.tsx` (vereenvoudigen)

### Taak 3: IssueForm opsplitsen (271 -> ~150 regels)

**Probleem:** `issue-form.tsx` bevat 271 regels. Het label input gedeelte (regels 219-257) en de select field groepen zijn kandidaten voor extractie.

**Oplossing:**

- [ ] Extraheer `LabelInput` component naar `apps/devhub/src/components/issues/label-input.tsx` — bevat de label toevoeg/verwijder logica met tag-achtige UI
- [ ] Extraheer `FormSelect` component (herbruikbaar select veld met label en error handling) als dit niet al bestaat in `@repo/ui`
- [ ] `IssueForm` wordt korter door compositie van sub-componenten

**Geraakt:**

- `apps/devhub/src/components/issues/issue-form.tsx` (refactor)
- `apps/devhub/src/components/issues/label-input.tsx` (nieuw)

### Taak 4: IssueRowItem desktop/mobile duplicatie

**Probleem:** `issue-row.tsx` bevat 223 regels. De desktop (regels 141-178) en mobile (regels 181-219) secties dupliceren de thumbnail, AI pickup button, en dropdown menu code.

**Oplossing:**

- [ ] Maak een `IssueRowActions` sub-component die thumbnail, AI pickup button, en dropdown menu combineert
- [ ] Gebruik responsive Tailwind classes om dezelfde `IssueRowActions` te tonen als inline (desktop) of onder de content (mobile) — bijvoorbeeld via een `className` prop of `flex-col sm:flex-row` pattern
- [ ] Dit elimineert de dubbele rendering van dezelfde interactieve elementen

**Geraakt:**

- `apps/devhub/src/components/issues/issue-row.tsx` (refactor)

### Taak 5: Ontbrekende loading en error boundaries

**Probleem:** Drie routes missen `loading.tsx` en/of `error.tsx`:

- `/issues/new/` — fetcht people data, kan falen
- `/settings/` — settings pagina
- `/settings/import/` — fetcht sync status, kan falen

**Oplossing:**

- [ ] Maak `apps/devhub/src/app/(app)/issues/new/loading.tsx` — skeleton van het issue formulier
- [ ] Maak `apps/devhub/src/app/(app)/issues/new/error.tsx` — error boundary
- [ ] Maak `apps/devhub/src/app/(app)/settings/loading.tsx` — simpele loading skeleton
- [ ] Maak `apps/devhub/src/app/(app)/settings/error.tsx` — error boundary
- [ ] Maak `apps/devhub/src/app/(app)/settings/import/loading.tsx` — sync card skeleton
- [ ] Maak `apps/devhub/src/app/(app)/settings/import/error.tsx` — error boundary

**Geraakt:**

- `apps/devhub/src/app/(app)/issues/new/loading.tsx` (nieuw)
- `apps/devhub/src/app/(app)/issues/new/error.tsx` (nieuw)
- `apps/devhub/src/app/(app)/settings/loading.tsx` (nieuw)
- `apps/devhub/src/app/(app)/settings/error.tsx` (nieuw)
- `apps/devhub/src/app/(app)/settings/import/loading.tsx` (nieuw)
- `apps/devhub/src/app/(app)/settings/import/error.tsx` (nieuw)

### Taak 6: Suspense fallbacks in app layout

**Probleem:** `(app)/layout.tsx:14,18` wraps sidebar en topbar in `<Suspense>` zonder `fallback` prop. Gebruikers zien niets totdat het component geladen is.

**Oplossing:**

- [ ] Voeg `fallback` prop toe aan beide Suspense boundaries met skeleton componenten
- [ ] Sidebar fallback: een `<div>` met dezelfde afmetingen als de sidebar (`w-56 h-full border-r bg-sidebar`)
- [ ] TopBar fallback: een `<div>` met dezelfde hoogte als de topbar (`h-16 border-b`)
- [ ] Houd de skeletons simpel — geen aparte component nodig als het een paar regels is

**Geraakt:**

- `apps/devhub/src/app/(app)/layout.tsx` (wijziging)

### Taak 7: AI execution polling verbeteren

**Probleem:** `ai-execution-panel.tsx:56` doet `router.refresh()` elke 3 seconden. Dit triggert een volledige server-side re-render van de hele pagina boom.

**Oplossing:**

- [ ] Verhoog het interval naar 5 seconden (minder server load, nauwelijks merkbaar voor demo)
- [ ] Stop de polling zodra `status !== "executing"` (nu loopt het door zolang het component gemount is)
- [ ] Voeg een `isPolling` state toe zodat de gebruiker ziet dat er actief gepolled wordt (bijv. een subtle animatie)
- [ ] Overweeg: gebruik `router.refresh()` alleen voor de eerste paar seconden, daarna langer interval (exponential backoff)

**Geraakt:**

- `apps/devhub/src/components/issues/ai-execution-panel.tsx` (wijziging)

### Taak 8: SearchParams validatie

**Probleem:** `issues/page.tsx` accepteert URL params (`project`, `status`, `priority`, `type`, `component`) zonder Zod validatie. Ongeldige waarden worden direct doorgegeven aan de database query.

**Oplossing:**

- [ ] Maak een Zod schema voor de issues pagina searchParams:
  ```typescript
  const issueSearchParamsSchema = z.object({
    project: z.string().uuid().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    type: z.string().optional(),
    component: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
  });
  ```
- [ ] Valideer searchParams met `safeParse` aan het begin van de page component
- [ ] Bij ongeldige `project` param: toon het "selecteer een project" bericht
- [ ] Filter strings hoeven niet op geldige enum waarden gecheckt te worden (database geeft gewoon 0 resultaten bij ongeldige filters)

**Geraakt:**

- `apps/devhub/src/app/(app)/issues/page.tsx` (wijziging)
- Optioneel: `packages/database/src/validations/issues.ts` (schema toevoegen)

## Acceptatiecriteria

- [ ] `issue-sidebar.tsx` is maximaal 150 regels
- [ ] `issue-form.tsx` is maximaal 150 regels
- [ ] `issue-row.tsx` bevat geen gedupliceerde desktop/mobile blokken meer
- [ ] `IssueSidebar` ontvangt een `issue` object in plaats van 14 losse props
- [ ] Elke route onder `(app)/` heeft een `loading.tsx` en `error.tsx`
- [ ] Suspense boundaries in layout hebben `fallback` props
- [ ] AI execution polling stopt wanneer executie klaar is
- [ ] Issues pagina searchParams worden gevalideerd met Zod
- [ ] `npm run build` slaagt
- [ ] `npm run type-check` slaagt

## Geraakt door deze sprint

- `apps/devhub/src/components/issues/issue-sidebar.tsx` (refactor)
- `apps/devhub/src/components/issues/sidebar-fields.tsx` (nieuw)
- `apps/devhub/src/components/issues/sidebar-ai-classification.tsx` (nieuw)
- `apps/devhub/src/components/issues/sidebar-delete.tsx` (nieuw)
- `apps/devhub/src/components/issues/issue-detail.tsx` (vereenvoudigen)
- `apps/devhub/src/components/issues/issue-form.tsx` (refactor)
- `apps/devhub/src/components/issues/label-input.tsx` (nieuw)
- `apps/devhub/src/components/issues/issue-row.tsx` (refactor)
- `apps/devhub/src/components/issues/ai-execution-panel.tsx` (wijziging)
- `apps/devhub/src/app/(app)/layout.tsx` (wijziging)
- `apps/devhub/src/app/(app)/issues/page.tsx` (wijziging)
- `apps/devhub/src/app/(app)/issues/new/loading.tsx` (nieuw)
- `apps/devhub/src/app/(app)/issues/new/error.tsx` (nieuw)
- `apps/devhub/src/app/(app)/settings/loading.tsx` (nieuw)
- `apps/devhub/src/app/(app)/settings/error.tsx` (nieuw)
- `apps/devhub/src/app/(app)/settings/import/loading.tsx` (nieuw)
- `apps/devhub/src/app/(app)/settings/import/error.tsx` (nieuw)
