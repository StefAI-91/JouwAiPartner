# Micro Sprint CC-003: DevHub Source-Badge

## Doel

Maak in DevHub-triage in één oogopslag duidelijk welke tickets van een klant komen versus intern aangemaakt. Vandaag staan klant-feedback en interne meldingen visueel identiek tussen elkaar — een PM-endorsed ticket uit het portal ziet er hetzelfde uit als een handmatig aangemaakt issue, terwijl het werk-prioriteit en communicatie-context volledig verschillen.

Dit is sprint 3 van 5 (CC-001 t/m CC-005) afgeleid uit `docs/specs/vision-customer-communication.md` §12. Pure UX-polish: geen schema-changes, geen data-flow-wijzigingen, geen nieuwe pipelines.

## Vision-alignment

- `docs/specs/vision-customer-communication.md` **§12** — sprint-volgorde noemt CC-003 expliciet als "DevHub source-badge — small UX win".
- Initieel design-gesprek op 2026-05-01 (zie git-history van vision-doc): aanbeveling was "klein bron-badge naast TypeBadge/StatusBadge, geen rij-recoloring". CC-003 implementeert die afspraak.
- Geen botsing met CC-001 (statusgate) of CC-002 (notificaties) — werkt onafhankelijk.

## Afhankelijkheden

- Bestaande `IssueRow.source`-veld in `packages/database/src/queries/issues/core.ts:33` (waardes: `portal`, `userback`, `jaip_widget`, `manual`, `ai`).
- Bestaande mapping `PORTAL_SOURCE_GROUPS` + `resolvePortalSourceGroup()` in `packages/database/src/constants/issues.ts:181-205`.
- Bestaande shared-badge-template `apps/devhub/src/components/shared/type-badge.tsx` (kopiëren als basis voor `SourceBadge`).
- Bestaande triage-rendering: `apps/devhub/src/features/issues/components/issue-row.tsx:167-169` (regel waar `TypeBadge`/`StatusBadge`/`ComponentBadge` zitten).
- Bestaande filter-infra: `apps/devhub/src/features/issues/components/issue-filters/` + `use-issue-filters-url.ts`.

CC-001 / CC-002 zijn **geen** harde dep — CC-003 kan ervoor of erna landen. Als CC-001 al gemerged is werkt de badge ook op `needs_pm_review`-items (extra leuk in cockpit-inbox-context).

## Open vragen vóór start

1. **Eén "Klant"-badge of twee aparte ("Klant-PM" vs "Eindgebruiker")?** Aanbeveling: **twee aparte**. Ze gedragen zich verschillend — een klant-PM heeft account + ziet status-updates direct, een eindgebruiker (via embedded widget) is vaak anoniem. Door visueel te splitsen ziet PM in DevHub direct of een ticket aandacht-van-stakeholder vraagt of "iemand op de website klikte verkeerd". Concreet:
   - `portal` → "Klant-PM" (paars/blauw accent)
   - `userback` + `jaip_widget` → "Eindgebruiker" (oranje accent)
   - `manual` + `ai` → géén badge (intern is default — geen visuele ruis)
2. **Source-filter in DevHub-triage v1?** Aanbeveling: **ja, klein**. Voeg "Bron"-filter toe aan bestaand `filter-dropdown` met dezelfde drie groepen + "Alle". Kost weinig, helpt PM om gerichte triage-sessies te doen ("vandaag alleen klant-tickets"). Skip als 't framework van `use-issue-filters-url.ts` te veel aanpassing kost (verifieer in taak 2).
3. **Filter ook in cockpit-inbox (CC-001) toevoegen?** Aanbeveling: **nee, niet nu**. CC-001 toont alleen klant-items per definitie (status `needs_pm_review` + open questions). Een bron-filter daar is overbodig. Eventueel later in CC-005 (per-project-tab) als de mix groter wordt.

## Taken

Bouwvolgorde **constants → component → wire-in row → filter (optioneel) → tests**. Klein, lineair.

### 1. DevHub source-groep-constanten

Pad: `packages/database/src/constants/issues.ts` (bestand bestaat — uitbreiden, niet vervangen).

Voeg toe naast bestaande `PORTAL_SOURCE_GROUPS`:

```ts
// ── DevHub-specifieke source-groepering ──
//
// Portal en DevHub gebruiken niet dezelfde mapping: PORTAL_SOURCE_GROUPS
// (regel 181) groepeert vanuit klant-perspectief ("mijn meldingen" vs "van
// gebruikers"); DevHub groepeert vanuit triage-perspectief — één badge per
// type-stakeholder, met intern (`manual`/`ai`) zonder badge omdat dat default
// is en visueel ruis zou geven.

export const DEVHUB_SOURCE_GROUPS = [
  { key: "client_pm", label: "Klant-PM", sources: ["portal"] },
  { key: "end_user", label: "Eindgebruiker", sources: ["userback", "jaip_widget"] },
  // 'manual' en 'ai' krijgen GEEN badge — return null vanuit resolver
] as const;

export type DevhubSourceGroupKey = (typeof DEVHUB_SOURCE_GROUPS)[number]["key"];

/** Mapt issue.source naar de DevHub-badge-groep, of null voor intern. */
export function resolveDevhubSourceGroup(
  source: string | null | undefined,
): DevhubSourceGroupKey | null {
  if (!source) return null;
  for (const group of DEVHUB_SOURCE_GROUPS) {
    if ((group.sources as readonly string[]).includes(source)) return group.key;
  }
  return null;
}
```

### 2. SourceBadge component

Pad: `apps/devhub/src/components/shared/source-badge.tsx` (nieuw, structuur exact zoals `type-badge.tsx`).

```tsx
import { cn } from "@repo/ui/utils";
import {
  resolveDevhubSourceGroup,
  type DevhubSourceGroupKey,
} from "@repo/database/constants/issues";

const SOURCE_CONFIG: Record<DevhubSourceGroupKey, { label: string; className: string }> = {
  client_pm: { label: "Klant-PM", className: "bg-violet-50 text-violet-700 border-violet-200" },
  end_user: { label: "Eindgebruiker", className: "bg-orange-50 text-orange-700 border-orange-200" },
};

export function SourceBadge({ source, className }: { source: string | null; className?: string }) {
  const group = resolveDevhubSourceGroup(source);
  if (!group) return null; // intern → geen badge
  const config = SOURCE_CONFIG[group];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[0.7rem] font-medium leading-none",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
```

Kleurkeuze: violet voor PM (rustig, gelijkwaardig aan TypeBadge purple), oranje voor eindgebruiker (lichte urgentie-tint zonder rood-alarm te zijn). Mag aangepast als design-style-guide andere tokens dicteert.

### 3. Wire in IssueRowItem

`apps/devhub/src/features/issues/components/issue-row.tsx`:

- Toevoegen aan imports (regel 10-13): `import { SourceBadge } from "@/components/shared/source-badge";`
- Toevoegen na regel 169 (`<ComponentBadge component={issue.component} />`):
  ```tsx
  <SourceBadge source={issue.source} />
  ```
  Volgorde: type → status → component → bron — bron achteraan zodat hij er visueel uitspringt zonder andere badges te verdrukken.

### 4. Source-filter in issue-filters (open vraag #2 — meedoen)

`apps/devhub/src/features/issues/components/issue-filters/`:

- **`use-issue-filters-url.ts`**: voeg URL-param `source` toe (kommagescheiden lijst, bv. `?source=client_pm,end_user`). Pattern volgt bestaande `status`/`type`-params.
- **`filter-dropdown.tsx`**: voeg sectie "Bron" toe met checkboxen:
  - Klant-PM
  - Eindgebruiker
  - Intern (mappt op `manual,ai`)

  Default: alle drie aan = geen filter. Zodra één uitgaat → filter-actief in URL.

- **Server-side filtering**: in `packages/database/src/queries/issues/core.ts` `listIssues`-helper: voeg `params.sourceGroups?: DevhubSourceGroupKey[]` toe. Vertaal naar `source IN (...)` clause door de groepen te flatten naar ruwe source-values via `DEVHUB_SOURCE_GROUPS`.

  > Als deze server-side wijziging te groot voelt voor een polish-sprint: defer naar follow-up. UI-only client-filter (slice na fetch) als v1-shortcut staat **niet** toe — schaalt slecht en breekt pagination. Liever helemaal geen filter dan client-side filter.

- **DevHub triage-page** (`apps/devhub/src/app/(app)/issues/page.tsx`): lees `sourceGroups` uit URL-params en geef door aan `listIssues({ sourceGroups, ... })`.

### 5. Tests

- **`packages/database/__tests__/constants/issues-devhub-source.test.ts`** (nieuw):
  - `resolveDevhubSourceGroup("portal")` → `"client_pm"`
  - `resolveDevhubSourceGroup("userback")` → `"end_user"`
  - `resolveDevhubSourceGroup("jaip_widget")` → `"end_user"`
  - `resolveDevhubSourceGroup("manual")` → `null`
  - `resolveDevhubSourceGroup("ai")` → `null`
  - `resolveDevhubSourceGroup(null)` → `null`
  - `resolveDevhubSourceGroup("onbekend")` → `null` (defensief)

- **`apps/devhub/__tests__/components/shared/source-badge.test.tsx`** (nieuw):
  - Render met `source="portal"` → "Klant-PM" zichtbaar.
  - Render met `source="manual"` → component returnt `null`, niets in DOM.
  - Render met `source="userback"` → "Eindgebruiker" zichtbaar.

- **`apps/devhub/__tests__/queries/list-issues-source-filter.test.ts`** (alleen bij meedoen filter, taak 4):
  - `listIssues({ sourceGroups: ["client_pm"] })` → query bevat `source IN ('portal')`.
  - `listIssues({ sourceGroups: ["client_pm", "end_user"] })` → `source IN ('portal','userback','jaip_widget')`.
  - Geen `sourceGroups` → geen source-where-clause.

- **Geen snapshot-test op IssueRowItem** — visueel verschil is één extra badge, snapshot zou bij elke style-tweak breken zonder waarde toe te voegen.

### 6. Sprint-index update

`sprints/backlog/README.md`: voeg rij toe direct onder CC-002:

```
| CC-003   | DevHub source-badge (klant vs intern)                        | Customer Comm | `sprints/backlog/` | Backlog       |
```

## Acceptatiecriteria

- [ ] `DEVHUB_SOURCE_GROUPS` + `resolveDevhubSourceGroup()` toegevoegd in `packages/database/src/constants/issues.ts`, met JSDoc-comment dat verschil met `PORTAL_SOURCE_GROUPS` uitlegt.
- [ ] `SourceBadge` component bestaat in `apps/devhub/src/components/shared/source-badge.tsx`, mirror van `type-badge.tsx`-stijl.
- [ ] `IssueRowItem` rendert `<SourceBadge />` na `<ComponentBadge />` op regel 170.
- [ ] Tickets met `source IN ('manual','ai','null')` tonen GEEN bron-badge (intern is default — geen visuele ruis).
- [ ] Tickets met `source='portal'` tonen "Klant-PM"-badge.
- [ ] Tickets met `source IN ('userback','jaip_widget')` tonen "Eindgebruiker"-badge.
- [ ] Source-filter in `filter-dropdown.tsx` toegevoegd met drie opties; URL-param `source` gerespecteerd; server-side filtering via `listIssues`. (Defer naar follow-up sprint als te groot — vink dan af bij scope-change.)
- [ ] Constants-test, badge-component-test en query-filter-test allemaal groen.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` groen.
- [ ] `sprints/backlog/README.md` bevat CC-003 rij.

## Risico's

| Risico                                                                                                            | Mitigatie                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Twee badges (TypeBadge + SourceBadge) maakt rij visueel druk op smal scherm.                                      | Test op 1280px en 1024px; eventueel SourceBadge uit op `&lt;1024px` via Tailwind `hidden md:inline-flex`.        |
| Kleur van violet/oranje botst met bestaande `STATUS_COLORS` in portal.                                            | DevHub-only badges — portal toont issues niet met deze badge. Geen cross-contamination.                          |
| `PORTAL_SOURCE_GROUPS` en `DEVHUB_SOURCE_GROUPS` divergeren over tijd; verwarring welke waar gebruikt wordt.      | JSDoc-comment in beide constanten verwijst naar elkaar; test-bestand documenteert het verschil expliciet.        |
| Source-filter URL-param `source` botst met bestaand "source"-veld in andere context (bv. unrelated query string). | Prefix met `src=` in URL als botsing optreedt. Verifieer in `use-issue-filters-url.ts` dat `source` nog vrij is. |
| Server-side filter-uitbreiding in `listIssues` raakt veel call-sites.                                             | Optioneel param met default `undefined` = geen filter; bestaande callers blijven werken.                         |

## Niet in scope

- **Rij-recoloring** of border-accenten op de hele rij — bewust verworpen in design-gesprek 2026-05-01 als "te druk bij volume".
- **Filter in cockpit-inbox** (CC-001) — daar is alle content per definitie klant-gesourced, dus filter overbodig.
- **Bron-icoontje** in plaats van label — labels zijn duidelijker bij eerste gebruik en niet ruimte-kritisch.
- **Bron-statistiek-widget** ("deze week 12 klant-tickets, 3 intern") in DevHub-dashboard — kan later als analytics-sprint.
- **Kleur-customization per klant** — overengineering voor 1 sprint.
- **Schema-changes op `issues.source`** — kolom blijft ongewijzigd; CC-003 leest enkel.

## Vision-alignment (samenvatting)

CC-003 is sprint 3/5 uit `vision-customer-communication.md` §12 en levert pure UX-waarde zonder data-laag te raken. Combinatie met CC-001 (PM-gate) en CC-002 (notificaties) maakt klant-feedback eind-tot-eind visueel onderscheidend in elke quadrant: klant ziet status in portal, krijgt mail bij elke wijziging, PM ziet 't apart in cockpit-inbox, developer ziet 't apart in DevHub-triage.

Na CC-003 volgt CC-004 (outbound met AI-draft + review-gate) — daar wordt de communicatie pas echt twee-richtings vanaf cockpit, met een nieuwe agent-pipeline.
