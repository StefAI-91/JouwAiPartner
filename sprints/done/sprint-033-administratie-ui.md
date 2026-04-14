# Sprint 033: Administratie UI — route, tabs en organisatie-lijst

> **Scope-afbakening.** Vervolg op sprint 032 (datamodel). Bouwt de `/administratie` route met twee tabs ("Adviseurs" en "Intern"), hergebruikt de bestaande organisatie-kaart-stijl, en laat de admin-toevoegflow ook 'advisor' en 'internal' ondersteunen. Geen detail-pagina voor adviseurs (die hergebruikt `/clients/[id]`). Geen e-mail-koppeling in deze sprint — dat vraagt om daadwerkelijk aangemaakte adviseur-rijen en is werk voor een vervolg.

## Doel

Na deze sprint kan Stef in de cockpit:

1. Via een nieuw sidebar-item "Administratie" naar `/administratie` navigeren
2. Tabs "Adviseurs" (`type='advisor'`) en "Intern" (`type='internal'`) zien
3. Bestaande administratie-organisaties bekijken (nu alleen Flowwijs onder Intern)
4. Via de "Organisatie toevoegen"-knop direct een adviseur aanmaken (met NL-labels in de type-dropdown)
5. Gevonden adviseurs klikken en de bestaande `/clients/[id]` detail-pagina bekijken (hergebruik)

Verder wordt `/clients` opgeschoond: die toont vanaf nu alléén commerciële relaties (`client`, `partner`, `supplier`, `other`) — dus Flowwijs verdwijnt uit `/clients` en verschijnt onder `/administratie`.

## Requirements

| ID       | Beschrijving                                                                                                               |
| -------- | -------------------------------------------------------------------------------------------------------------------------- |
| UI-210   | Sidebar-item "Administratie" met icoon `Receipt`, actief op paths die beginnen met `/administratie`.                       |
| UI-211   | Route `/administratie/page.tsx` rendert twee tabs: "Adviseurs" en "Intern".                                                |
| UI-212   | Tab "Adviseurs" toont organisaties waar `type='advisor'`, in dezelfde kaartstijl als `/clients`.                           |
| UI-213   | Tab "Intern" toont organisaties waar `type='internal'` (nu alleen Flowwijs).                                               |
| UI-214   | Lege tab toont duidelijke Nederlandse empty-state met toevoeg-knop.                                                        |
| UI-215   | `/administratie` heeft eigen `loading.tsx` en `error.tsx` in dezelfde stijl als `/clients`.                                |
| UI-216   | `/clients` filtert administratie-organisaties (`advisor` + `internal`) uit; die verschijnen nu alleen op `/administratie`. |
| UI-217   | Tab-state is URL-gestuurd via `?tab=adviseurs` / `?tab=intern` zodat links deelbaar zijn.                                  |
| UI-218   | Organisatie-kaarten op `/administratie` linken naar bestaande `/clients/[id]` detail-pagina (hergebruik).                  |
| FUNC-032 | Constants `ORG_TYPES` en `ORG_TYPE_COLORS` uitgebreid met `advisor` + `internal` (gap in sprint 032).                      |
| FUNC-033 | Nieuwe constant `ORG_TYPE_LABELS` map DB-waardes naar NL-labels (Klant, Partner, Leverancier, Adviseur, Intern, Overig).   |
| FUNC-034 | `AddOrganizationButton` dropdown toont NL-labels in plaats van ruwe DB-waardes.                                            |

## Bronverwijzingen

- Sprint 032: `sprints/done/sprint-032-administratie-datamodel.md` (datamodel + `listOrganizationsByType`)
- Style-guide: `docs/specs/style-guide.md` sectie 11 "Language Convention (RULE-007)"
- Nav-constants: `apps/cockpit/src/lib/constants/navigation.ts`
- Clients-lijst als template: `apps/cockpit/src/app/(dashboard)/clients/page.tsx`
- Clients-detail (hergebruikt): `apps/cockpit/src/app/(dashboard)/clients/[id]/page.tsx`
- Tabs-component: `packages/ui/src/tabs.tsx`
- Org-colors: `apps/cockpit/src/components/shared/organization-colors.ts`
- Org-constants: `packages/database/src/constants/organizations.ts`
- Add-button: `apps/cockpit/src/components/clients/add-organization-button.tsx`
- Helper-query: `packages/database/src/queries/organizations.ts` → `listOrganizationsByType`

## Context

### Scope van "Administratie"

Deze sprint levert twee tabs: **Adviseurs** en **Intern**. Geen HR, geen Vendors/Tools — die krijgen later een eigen tab zodra er data voor is.

### Waarom `/clients` ook gefilterd wordt

Zonder filter zou Flowwijs (type `internal` na sprint 032) in beide pagina's verschijnen: `/clients` én `/administratie`. Dat is verwarrend. Door `/clients` strikt op commerciële relaties te houden (`client`, `partner`, `supplier`, `other`) heeft elke organisatie één duidelijk thuis.

### Wat NIET in deze sprint

- Geen dedicated `/administratie/[id]` detail-pagina — klik op een adviseur gaat naar `/clients/[id]`. Werkt al voor elke organisatie, ongeacht type.
- Geen e-mail-koppeling (e-mails filteren op adviseur-organisaties) — dat vraagt eerst om aangemaakte adviseur-rijen en geseemde organisation_id op e-mails. Vervolg-sprint 034.
- Geen vernederlandsing van de rest van de nav (Home / Review / Projects / Directory / Meetings / Emails blijft Engels). Dat is een bredere UI-refactor buiten scope — eventueel sprint 035.
- Geen HR of Vendors/Tools tabs.

### Nieuwe bestanden

- `apps/cockpit/src/app/(dashboard)/administratie/page.tsx`
- `apps/cockpit/src/app/(dashboard)/administratie/loading.tsx`
- `apps/cockpit/src/app/(dashboard)/administratie/error.tsx`
- `apps/cockpit/src/components/administratie/administratie-tabs.tsx` (client, tab-state + organisatie-grid)
- `apps/cockpit/src/components/administratie/organization-card.tsx` (gedeeld: enkele org-card, hergebruikt in beide tabs)
- `apps/cockpit/src/components/shared/org-type-labels.ts` (NL-labels mapping)

### Gewijzigde bestanden

- `packages/database/src/constants/organizations.ts` — `ORG_TYPES` uitgebreid (sprint 032 gap)
- `apps/cockpit/src/components/shared/organization-colors.ts` — kleuren voor `advisor` + `internal`
- `apps/cockpit/src/lib/constants/navigation.ts` — nav-item toegevoegd
- `apps/cockpit/src/components/clients/add-organization-button.tsx` — NL-labels in dropdown
- `apps/cockpit/src/app/(dashboard)/clients/page.tsx` — filter advisor+internal eruit

### Tab-state via URL

Gekozen: `?tab=adviseurs` | `?tab=intern`, default "adviseurs". Zodat links deelbaar zijn ("stuur me link naar intern-overzicht"). Simpele server-side read van `searchParams`, tabs zelf zijn shadcn `Tabs` client component, link-sync via Next's router.

### Icoon

`Receipt` uit Lucide — dekt het boekhoud/administratie-karakter. Alternatief `Briefcase` is te generiek (overlap met "werk"), `FileText` is te saai, `DollarSign` te nauw (alleen finance). `Receipt` past.

## Prerequisites

Sprint 032 moet af zijn (migratie gedraaid, `listOrganizationsByType` bestaat). ✓

## Taken

- [ ] Update `packages/database/src/constants/organizations.ts`:
  - `ORG_TYPES` uitbreiden naar `["client", "partner", "supplier", "advisor", "internal", "other"]`
  - `OrgType` type wordt automatisch breder
- [ ] Update `apps/cockpit/src/components/shared/organization-colors.ts`:
  - `ORG_TYPE_COLORS.advisor = "bg-amber-100 text-amber-800"` (financieel/adviserend)
  - `ORG_TYPE_COLORS.internal = "bg-indigo-100 text-indigo-800"` (eigen bedrijf)
- [ ] Nieuwe file `apps/cockpit/src/components/shared/org-type-labels.ts`:
  ```typescript
  export const ORG_TYPE_LABELS: Record<string, string> = {
    client: "Klant",
    partner: "Partner",
    supplier: "Leverancier",
    advisor: "Adviseur",
    internal: "Intern",
    other: "Overig",
  };
  ```
- [ ] Update `AddOrganizationButton`: dropdown-opties tonen `ORG_TYPE_LABELS[t]` als label, waarde blijft `t`
- [ ] Update `primaryNavItems` in `navigation.ts`: voeg `{ href: "/administratie", label: "Administratie", icon: Receipt }` toe — positioneer na `/directory` en vóór eventuele secondary items
- [ ] Update `/clients/page.tsx`: vervang `listOrganizations(supabase)` door `listOrganizationsByType(["client", "partner", "supplier", "other"], supabase)` — verbergt advisor+internal uit clients-lijst
- [ ] Maak `organization-card.tsx`: herbruikbare card (zelfde styling als huidige `/clients`), props `{ org: OrganizationListItem }`, linkt naar `/clients/[org.id]`, toont NL-label uit `ORG_TYPE_LABELS`
- [ ] Maak `administratie-tabs.tsx` (client component): props `{ advisors, internal }`, shadcn Tabs met URL-state via `useSearchParams` + `router.replace`, default "adviseurs", rendert grid van `organization-card` per tab, met empty-state per tab
- [ ] Maak `/administratie/page.tsx`: server component, roept `listOrganizationsByType(['advisor'])` en `listOrganizationsByType(['internal'])` aan, parameter `searchParams` doorgeven naar tabs-component voor initiële tab
- [ ] Maak `/administratie/loading.tsx` en `error.tsx` in stijl van bestaande patterns (kopieer uit `(dashboard)/loading.tsx`)
- [ ] Draai `npm run lint` en `npm run type-check` op gewijzigde workspace(s)
- [ ] Verifieer handmatig: navigeer naar `/administratie`, zie "Intern"-tab met Flowwijs, switch tabs, klik op Flowwijs → gaat naar `/clients/[id]` (bestaande detail)
- [ ] Verifieer handmatig: navigeer naar `/clients`, Flowwijs is er NIET meer (is verhuisd naar `/administratie`)

## Acceptatiecriteria

- [ ] [UI-210] "Administratie" verschijnt in sidebar, highlight correct op `/administratie`
- [ ] [UI-211 / UI-217] `/administratie` rendert tabs "Adviseurs" en "Intern"; `?tab=intern` selecteert direct Intern-tab
- [ ] [UI-212] Tab Adviseurs toont adviseurs of empty-state. Visueel identiek aan clients-kaart (met NL-type-label).
- [ ] [UI-213] Tab Intern toont minstens Flowwijs (na migratie uit sprint 032)
- [ ] [UI-214] Lege tab: Nederlandse tekst + toevoeg-knop (hergebruikt `AddOrganizationButton`)
- [ ] [UI-215] `/administratie/loading` skelet rendert zonder errors; forced error rendert `error.tsx`
- [ ] [UI-216] `/clients` toont Flowwijs niet meer (alleen client/partner/supplier/other)
- [ ] [UI-218] Klik op adviseur op `/administratie` navigeert naar `/clients/[id]` en toont bestaande detail-pagina
- [ ] [FUNC-032] `ORG_TYPES` bevat `'advisor'` en `'internal'` — autocomplete op `OrgType` toont deze waardes in IDE
- [ ] [FUNC-033] `ORG_TYPE_LABELS` bestaat, dekt alle 6 types, UI-bindings gebruiken het
- [ ] [FUNC-034] Dropdown in "Organisatie toevoegen"-modal toont "Adviseur" i.p.v. "advisor", etc.
- [ ] `npm run type-check` op cockpit en database workspaces: geen nieuwe errors
- [ ] `npm run lint` op gewijzigde files: schoon

## Geraakt door deze sprint

### Nieuw

- `apps/cockpit/src/app/(dashboard)/administratie/page.tsx`
- `apps/cockpit/src/app/(dashboard)/administratie/loading.tsx`
- `apps/cockpit/src/app/(dashboard)/administratie/error.tsx`
- `apps/cockpit/src/components/administratie/administratie-tabs.tsx`
- `apps/cockpit/src/components/administratie/organization-card.tsx`
- `apps/cockpit/src/components/shared/org-type-labels.ts`

### Gewijzigd

- `packages/database/src/constants/organizations.ts`
- `apps/cockpit/src/components/shared/organization-colors.ts`
- `apps/cockpit/src/lib/constants/navigation.ts`
- `apps/cockpit/src/components/clients/add-organization-button.tsx`
- `apps/cockpit/src/app/(dashboard)/clients/page.tsx`

## Vervolg (niet in scope)

- **Sprint 034** — e-mail-koppeling: e-mails met `email_type IN ('legal_finance', 'administrative')` of `party_type IN ('accountant', 'tax_advisor', 'lawyer')` tonen onder de juiste adviseur-organisatie. Vereist aangemaakte adviseur-rijen.
- **Sprint 035+** — HR en Vendors/Tools tabs toevoegen zodra data beschikbaar is.
- **Sprint 036** — dedicated `/administratie/[id]` detail-pagina met eigen layout (nu hergebruiken we `/clients/[id]`).
- **Sprint 037** — volledige vernederlandsing van navigatie (Home / Review / Projects / Directory / Meetings / Emails) — aparte refactor-sprint.
