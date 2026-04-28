# 14. Design-keuzes

> Dit hoofdstuk legt de visuele en interactie-keuzes vast die we hebben getoetst in de design-preview onder `/design-preview/roadmap` (live op de Vercel-deploy van `apps/portal`). Componenten leven in [`apps/portal/src/components/roadmap-preview/`](../../../apps/portal/src/components/roadmap-preview/). Bij sprint-implementatie worden deze keuzes het uitgangspunt; afwijken kan, mits in de PR-beschrijving gemotiveerd.

## 14.1 Aesthetic-richting — "Editorial broadsheet meets Linear"

De Portal richt zich op externe klanten en moet **rust, vertrouwen en transparantie** uitstralen. Bewust níét de "playful assistant"-toon van de Cockpit-app (Fredoka + mascotte). Inspiratie komt uit drie hoeken:

- **Stripe Press / The Times online** — editorial typografie als gezicht van professionaliteit
- **Linear's project-views** — gelaagdheid en density waar data telt
- **Basecamp Shape Up** — narratief boven valse precisie (hill charts > burndowns)

**Eén-zin-toetsing**: voelt elk scherm als een doordacht document, niet als een dashboard? Zo ja, op koers.

## 14.2 Typografie

| Rol                | Font                                                                     | Reden                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Display / headings | **Newsreader** (Production Type / Google Fonts) — optical sizes, italics | Editorial autoriteit zonder schreeuwen; onderscheidt zich van generieke Inter/Söhne. Komt vooral tot leven op de masthead van het rapport-detail (§ 9.3.5). |
| Body               | **Geist Sans** (Vercel)                                                  | Neutraal, leesbaar, distinctief zonder weird karakter.                                                                                                      |
| Data / metadata    | **Geist Mono**                                                           | Tabular numerals voor counters, datums, statuses — alles wat moet uitlijnen.                                                                                |

**Implementatie**: fonts worden via `next/font/google` geladen in `apps/portal/src/app/design-preview/layout.tsx`, gescoped op een `.preview-editorial` wrapper-class zodat de bestaande Portal-routes (Nunito + Fredoka) onaangeraakt blijven. Bij productie-implementatie verschuift dit naar de root-layout van het roadmap-onderdeel.

**Tabular numerals**: de utility `.num-tabular` (zie `globals.css`) zet `font-variant-numeric: tabular-nums` op counters zodat "03 / 12 / 04 / 05" netjes onder elkaar uitlijnt — kleine details die de toon optillen.

## 14.3 Kleurpalet

**Foundation: warm-neutraal, paper-toned.** Geen stark white, geen ziekenhuiswit. Het palet is OKLCH-based zodat we kleur-contrast voorspelbaar kunnen sturen.

| Token                                        | Waarde                       | Gebruik                                      |
| -------------------------------------------- | ---------------------------- | -------------------------------------------- |
| `--paper`                                    | `oklch(0.985 0.005 75)`      | App-achtergrond                              |
| `--paper-elevated`                           | `oklch(0.995 0.003 75)`      | Cards, panels                                |
| `--paper-deep`                               | `oklch(0.96 0.008 75)`       | Sidebar, secondary panels                    |
| `--paper-cream`                              | `oklch(0.97 0.018 78)`       | Editorial accents (rapport-masthead, banner) |
| `--ink`                                      | `oklch(0.18 0.014 60)`       | Primaire tekst (warm-zwart, geen pure black) |
| `--ink-soft` / `--ink-muted` / `--ink-faint` | gradient                     | Hiërarchische tekst-tinten                   |
| `--rule-hairline` / `--rule-soft`            | `oklch(0.88..0.93 0.005 75)` | Borders, dividers — bijna onzichtbaar        |

**Brand-accent: spaarzaam.** Het cockpit-groen `#006B3F` keert terug als `--accent-brand`, maar wordt **alleen** ingezet voor:

- Primaire actions (focus rings, primary buttons)
- Subtiele markers (active-dot in sidebar, byline-avatar in rapport, hover-pijl)
- `--accent-brand-soft` voor active-state backgrounds

**Bucket-hues — desaturated, papier-getint.** Vier buckets krijgen subtiele tonen, geen schreeuwerige badges:

| Bucket               | Tone       | Hue (oklch chroma 0.04-0.06) |
| -------------------- | ---------- | ---------------------------- |
| Recent gefixt        | sage       | groen-getint papier          |
| Komende week         | amber      | warm-geel papier             |
| Hoge prio daarna     | slate-blue | koel-blauw papier            |
| Niet geprioritiseerd | rose       | warm-roze papier             |

> Rationale: bucket-kleuren moeten hiërarchie communiceren zonder visuele agressie. Zie `globals.css` voor de complete `--bucket-*` token-set.

## 14.4 Component-systeem

### Cards

- **Hairline borders** (1px, kleur `--rule-hairline`), géén shadows. Heavy SaaS-shadows passen niet bij de toon.
- Subtiel hover-state: achtergrond verschuift van `--paper-elevated` naar `white`. Geen lift, geen scale.
- Interne dividers gebruiken `border-dashed` met kleur `--rule-soft` — visueel zachter dan solid.

### Badges

| Type                              | Vorm                                    | Voorbeeld                          |
| --------------------------------- | --------------------------------------- | ---------------------------------- |
| Type (Bug/Feature)                | Klein bullet + label, geen pill         | `● Bug` (klein, in mono uppercase) |
| Priority (P0-P3)                  | Tekst-only in mono, kleur naar severity | `P0` in donker-rood, `P3` in grijs |
| Status-pill (in topic-detail)     | Pill met dot + label in bucket-hue      | `● Komende week`                   |
| Klant-signaal (in andere buckets) | Pill met emoji + label                  | `🔥 Must-have`                     |

### Signaal-knoppen (fase 2)

- **Pills, geen losse emoji**. Emoji + label in één pill, met border-color en bg afhankelijk van active-state.
- Active-state: `inset 0 0 0 1px ringkleur` shadow, lichte tinted background, ink-kleur naar de hue van het signaal.
- Single-select: klikken op het reeds-actieve signaal heft het op.
- 👎 (`not_relevant`) toont een undo-toast met "Ongedaan maken" en "Sluiten" — voorkomt dat klant per ongeluk een topic afsluit.

### Editorial details (rapport-detail)

- **Drop cap** op de eerste alinea van de kritische noot — kranten-detail, zet onmiddellijk de toon. Implementatie via `::first-letter` selector.
- **§ section-markers** in mono uppercase ("§ 00", "§ 01") — editorial structuur-cue.
- **Romeinse cijfers** voor de vier bucket-secties in het rapport (I, II, III, IV).
- **Hairline rule** na de section-marker, vult de breedte tot het einde van de regel.
- **Leeswijdte** voor narratief: `max-w-[62ch]` (`.prose-editorial` utility). Voor data-secties: 100% van de container.

### Drawer + sidebar (chrome)

- Sidebar (≥lg, 240px breed) en mobile drawer delen één `SidebarContent` component voor consistentie.
- Inhoud: brand-blok / workspace-switcher / projecten / project-subnav / preview-secties (in de preview).
- Mobile drawer wordt via **`React.createPortal` naar `document.body`** gerenderd — zie 14.7 voor het waarom.

## 14.5 Layout-principes

- **Generous whitespace**, vooral rond editorial content. `mt-14` / `mt-16` tussen secties is normaal in het rapport-detail.
- **Asymmetric grids waar het verhaal het draagt**: in de rapport-bucket-secties krijgen titels 34% van de breedte, beschrijvingen de rest.
- **Density alleen waar data telt**: roadmap-buckets en topic-cards zijn pragmatisch dicht; rapport en topic-detail zijn ruim.
- **Sticky elements**: topbar (z-20, met blur), sidebar (lg+ sticky top-0). Géén sticky inline TOC — die zit nu in de sidebar zelf.

## 14.6 Mobile-strategie

| Breakpoint      | Gedrag                                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `<sm` (~<640px) | Hamburger-trigger in topbar; drawer voor sidebar; breadcrumb toont alleen huidige pagina ("Roadmap"); uitlog-knop toont alleen icon |
| `sm` (≥640px)   | Breadcrumb toont "CAI Studio › Roadmap"; uitlog-knop met label                                                                      |
| `md` (≥768px)   | Breadcrumb compleet ("Projecten › CAI Studio › Roadmap"); mock-email zichtbaar                                                      |
| `lg` (≥1024px)  | Sidebar permanent zichtbaar; hamburger verborgen; volledige topbar                                                                  |

**Breakpoint-keuze rationale**: `lg` voor sidebar volgt de productie-conventie (`apps/portal/src/components/layout/app-sidebar-client.tsx` gebruikt dezelfde `hidden lg:flex`). De drawer is dus tussen `<sm` en `<lg` in actief, voor smartphones én tablets.

## 14.7 Valkuilen — uit de preview-iteratie geleerd

Twee productie-relevante bugs hebben we tijdens de preview opgevangen. Documenteren zodat de échte feature-implementatie ze niet herhaalt.

### Valkuil 1: gedeelde sidebar-content met `onClick` props

**Symptoom**: Vercel build crasht met `Event handlers cannot be passed to Client Component props` tijdens prerender.

**Oorzaak**: de gedeelde `SidebarContent`-component (gebruikt door zowel desktop-aside als mobile-drawer) bevat `<a onClick={...}>` om bij navigatie de drawer te sluiten. Zodra je `onClick` op een DOM-element zet, wordt de hele module impliciet client-side. Zonder `"use client"` directive faalt prerender.

**Regel voor productie**: elk bestand dat event-handlers bevat — ook al zijn het optionele props vanuit een client-parent — krijgt **`"use client"`** bovenaan. Minimaal: het bestand dat de handler ontvangt.

### Valkuil 2: `backdrop-filter` op topbar = containing block voor `position: fixed`

**Symptoom**: mobile drawer (`position: fixed; inset: 0; z-50`) wordt opgesloten in de 56px hoge header in plaats van het hele scherm te vullen. Pagina-content schijnt door de drawer heen.

**Oorzaak**: CSS-spec — `backdrop-filter` (zoals `blur(8px)` op de sticky topbar) creëert een **nieuw containing block** voor descendants met `position: fixed`. De drawer's `inset: 0` is daardoor relatief tot de topbar, niet tot het viewport. Dit is dezelfde quirk als `transform`, `filter`, `perspective`, `will-change`.

**Regel voor productie**: render modal-achtige overlays (drawer, dialog, toast) **altijd via `React.createPortal(node, document.body)`** zodat ze los staan van enige containing-block of stacking-context tricks van voorouders. Plus:

- Gebruik een `mounted`-flag (set in `useEffect`) om SSR-mismatch te voorkomen.
- Als de portal-tree CSS-variabelen nodig heeft die alleen op een wrapper-class staan, hang die class ook op de portal-root (in onze preview: `preview-editorial` class op het panel-div).

> Zie [`preview-mobile-nav.tsx`](../../../apps/portal/src/components/roadmap-preview/preview-mobile-nav.tsx) voor de werkende implementatie.

## 14.8 Component-inventaris (preview → productie-mapping)

Wat in de preview leeft en hoe het migreert:

| Preview (`components/roadmap-preview/`)                                 | Productie-doel                                                                                                                                                                                       | Status                                                  |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `mock-data.ts`                                                          | Vervangen door echte queries uit `@repo/database/queries/topics/`                                                                                                                                    | Schrappen                                               |
| `roadmap-board.tsx`                                                     | `components/roadmap/roadmap-board.tsx`                                                                                                                                                               | Migreren as-is, vervang mock met props                  |
| `topic-card.tsx`                                                        | `components/roadmap/topic-card.tsx`                                                                                                                                                                  | Migreren as-is                                          |
| `topic-detail.tsx`                                                      | `components/roadmap/topic-detail.tsx` (compositiepagina)                                                                                                                                             | Migreren, voeg server-side data fetching toe            |
| `signal-buttons.tsx`                                                    | `components/roadmap/signal-buttons.tsx` (client)                                                                                                                                                     | Vervang useState met server-action `setSignal` (fase 2) |
| `rejected-panel.tsx`                                                    | `components/roadmap/rejected-panel.tsx`                                                                                                                                                              | Migreren (fase 3)                                       |
| `audit-timeline.tsx`                                                    | `components/roadmap/audit-timeline.tsx`                                                                                                                                                              | Migreren (fase 3)                                       |
| `reports-list.tsx`                                                      | `components/reports/reports-list.tsx`                                                                                                                                                                | Migreren (fase 4)                                       |
| `report-detail.tsx`                                                     | `components/reports/report-detail.tsx`                                                                                                                                                               | Migreren (fase 4)                                       |
| `badges.tsx`                                                            | Splits: deel naar `@repo/ui` indien herbruikbaar, deel naar `components/roadmap/`                                                                                                                    | Beoordelen per badge                                    |
| `preview-shell.tsx`                                                     | Schrappen (was alleen voor preview-chrome)                                                                                                                                                           | Schrappen                                               |
| `preview-sidebar.tsx` + `preview-topbar.tsx` + `preview-mobile-nav.tsx` | Productie heeft al `app-sidebar.tsx` + `top-bar.tsx`. **Mobile drawer ontbreekt nog** — implementeer in een aparte sprint vóór roadmap-go-live, op basis van het preview-pattern (incl. portal-fix). | Aparte sprint                                           |

**Editorial design tokens** in `globals.css` (sectie `/* --- Design Preview: Editorial scope --- */`): bij productie-migratie verplaatsen naar de top-level Portal-tokens of houden onder een nieuwe scope-class. Beslissen vóór de eerste sprint-PR.

## 14.9 Wat we expliciet níét doen

- **Geen donkere modus** in v1 (geen `dark:` varianten). Voorkomt verdubbeling van design-werk vóór we weten of er vraag naar is.
- **Geen animaties** behalve sober (200ms slide-in voor drawer, simple hover-transitions). Geen page-load orchestraties, geen scroll-triggers, geen confetti.
- **Geen iconen op topic-cards** — typografische badges volstaan. Lucide-icons alleen in chrome (sidebar, topbar, drawer, signal-knoppen).
- **Geen aparte "compact"-modus** — als de design op kleine schermen niet werkt, lossen we dat met responsive breakpoints op, niet met een toggle.
- **Geen dichtheids-instellingen** voor klanten — één density, één lay-out. Personalisatie pas overwegen als data het rechtvaardigt.

## 14.10 Open design-vragen voor sprint-1

Te beslissen tijdens sprint-spec, niet nu:

1. **Editorial fonts in productie of niet?** Newsreader is mooi, maar voegt 3 font-families toe aan de bundle. Acceptabel? Of vervangen door één family (Newsreader gebruiken voor zowel display als body)? Aanbeveling: meten Lighthouse-score met beide opties.
2. **Drop cap fallback** voor browsers zonder `::first-letter` styling-support? Marginaal in 2026 — `::first-letter` is goed ondersteund. Niet implementeren tenzij issue opduikt.
3. **Markdown-rendering** in `client_description` en `narrative_note`: hergebruiken `react-markdown` (al in portal-deps) of zelf parsen voor stricte sanitization? Aanbeveling: hergebruiken, met `remark-gfm` plugin (al present).
4. **Bucket-counters** — toon "03" of "3"? Mock toont padded ("03"). Voelt editorial, maar bij driecijferige aantallen oneerlijk. Beslissen vóór sprint-PR.
5. **Mobile drawer als aparte sprint** ja/nee? Productie-Portal mist hem nu helemaal. Ofwel meeliften met fase 1, ofwel als losse sprint. Aanbeveling: losse sprint vóór roadmap, want het raakt álle Portal-pagina's.

## 14.11 Design-system-eigendom

Tot er een aparte design-systeem-track is, eigenaarschap van deze keuzes:

- **Tokens** (kleuren, typografie, spacing) — leven in `globals.css` onder de Portal-app
- **Components** — leven in `apps/portal/src/components/roadmap/` (post-migratie)
- **Patterns** (drawer, signal-pills, drop cap, etc.) — gedocumenteerd hier in sectie 14, kort onderhouden bij elke wijziging

Wijziging aan een design-keuze (bijv. ander serif-font, ander palet) → update sectie 14 in dezelfde PR. Drift tussen code en doc wordt bij review teruggedraaid.
