# Micro Sprint PR-013: Portal Rapporten-Archief + Detail-pagina

## Doel

In de Portal een rapporten-archief (`/projects/[id]/reports/page.tsx`) en detail-pagina (`/reports/[reportId]/page.tsx`) bouwen. De detail-pagina is **dé visuele hoogtepunt** van het Portal-product: editorial typografie met drop cap, romeinse cijfers per bucket-sectie, leeswijdte 62ch, masthead in `--paper-cream`. Klant kan historische rapporten doorzoeken; rapport rendert zoals CAI's Notion-doc — niet als dashboard, maar als doordacht document.

## Requirements

| ID            | Beschrijving                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| PR-REQ-140    | Pagina `/projects/[id]/reports/page.tsx` toont lijst van gepubliceerde rapporten, nieuwste eerst                                   |
| PR-REQ-141    | Per rapport in lijst: titel ("Wekelijks rapport — 23 april 2026"), `compiled_by` naam, `published_at`                              |
| PR-REQ-142    | Klikbaar naar `/projects/[id]/reports/[reportId]/page.tsx`                                                                         |
| PR-REQ-143    | Drafts (status='draft') zijn níét zichtbaar voor klant — RLS uit PR-011 borgt; UI dubbelchecken                                    |
| PR-REQ-144    | Rapport-detail rendert masthead: "Wekelijks rapport — Project [naam] / Samengesteld op [datum] door [naam]" met `--paper-cream`-bg |
| PR-REQ-145    | Rapport-detail rendert kritische noot vooraf met **drop cap** op eerste alinea (`::first-letter` styling)                          |
| PR-REQ-146    | Rapport-detail rendert vier bucket-secties met **romeinse cijfers** (I, II, III, IV) als section-marker                            |
| PR-REQ-147    | Rapport-detail rendert patterns-sectie ("Wat herhaalt zich") als bullet-lijst onderaan; alleen tonen als gevuld                    |
| PR-REQ-148    | `narrative_note` rendert als markdown (bold, lists, links) via bestaande `react-markdown` + `remark-gfm`                           |
| PR-REQ-149    | Bevroren `content_snapshot` wordt gebruikt — niet live `topics`-query (per PR-RULE-040)                                            |
| PR-REQ-150    | Onder de live-roadmap-view een prominente CTA: "Bekijk wekelijkse rapporten →" links naar archief                                  |
| PR-REQ-151    | RLS-test: klant van CAI ziet alleen CAI-rapporten; klant van andere org → 404                                                      |
| PR-DESIGN-050 | Typografie volgt §14.2: Newsreader voor display + drop cap, Geist body, Geist Mono voor metadata                                   |
| PR-DESIGN-051 | Leeswijdte voor narratief: `max-w-[62ch]` via `.prose-editorial` utility                                                           |
| PR-DESIGN-052 | § section-markers ("§ 00", "§ 01") in mono uppercase als editorial structuur-cue                                                   |
| PR-DESIGN-053 | Hairline rule onder section-markers, vult breedte tot regeleinde                                                                   |
| PR-DESIGN-054 | Asymmetric grid waar het verhaal het draagt: bucket-titels 34% breedte, beschrijvingen rest                                        |

## Afhankelijkheden

- **PR-011** (rapport-DB + queries) — `listPublishedReports`, `getReportById`
- **PR-004** (Portal roadmap) — voor CTA-koppeling
- **PR-000** (mobile drawer) — leesbaarheid op mobile

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- §14.10 punt 2 (drop cap fallback): in 2026 is `::first-letter` goed ondersteund — niet implementeren tenzij issue
- §14.10 punt 3 (markdown-rendering): hergebruik `react-markdown` + `remark-gfm` (al present)

## Visuele referentie

- Live preview: `/design-preview/roadmap` § 08 (report-detail.tsx + reports-list.tsx)
- Design-spec: §14.2 typografie, §14.3 kleurpalet (`--paper-cream` masthead), §14.4 editorial details (drop cap, romeinse cijfers, § markers, leeswijdte)

## Migreren vanuit preview

| Preview-bestand                                                | Productie-doel                                         | Wat doen                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| `apps/portal/src/components/roadmap-preview/reports-list.tsx`  | `apps/portal/src/components/reports/reports-list.tsx`  | Migreren as-is; vervang mock met `listPublishedReports`        |
| `apps/portal/src/components/roadmap-preview/report-detail.tsx` | `apps/portal/src/components/reports/report-detail.tsx` | Migreren editorial typografie 1:1; data uit `content_snapshot` |

## Taken

### 1. Compositiepagina

- Maak `apps/portal/src/components/reports/`:

  ```
  apps/portal/src/components/reports/
  ├── reports-list.tsx               # archief-lijst
  ├── report-detail.tsx              # editorial render
  ├── masthead.tsx                   # paper-cream titel-blok
  ├── narrative-note.tsx             # markdown + drop cap
  ├── bucket-section.tsx             # roman-numeral section
  ├── patterns-section.tsx           # "Wat herhaalt zich"
  └── empty-states.tsx               # geen rapporten
  ```

### 2. Routes

- `apps/portal/src/app/(app)/projects/[id]/reports/page.tsx`:
  - Server Component
  - Fetch `listPublishedReports(id)`
  - Render `<ReportsList reports={...} projectId={id} />`
- `apps/portal/src/app/(app)/projects/[id]/reports/[reportId]/page.tsx`:
  - Server Component
  - Fetch `getReportById(reportId)`
  - Verifieer `report.project_id === id` (defensieve check naast RLS)
  - Render `<ReportDetail report={...} />`
- `loading.tsx`, `error.tsx` per route

### 3. Components

- `reports-list.tsx`:
  - Server Component
  - Per rapport: card met titel, datum, compiled_by, link
  - Format datum in mono uppercase: `23 APR 2026`

- `masthead.tsx`:
  - `--paper-cream` background, padding ruim
  - "Wekelijks rapport — Project [naam]" als h1 in Newsreader display
  - Subtekst: "Samengesteld op {date} door {name}" in Geist body
  - Avatar-circle met brand-groen achter byline

- `narrative-note.tsx`:
  - `<article class="prose-editorial">` (= `max-w-[62ch]`)
  - Markdown render via `react-markdown` + `remark-gfm`
  - CSS: `.narrative-note > p:first-of-type::first-letter { font-size: 4rem; float: left; line-height: 0.9; ... }`

- `bucket-section.tsx`:
  - Props: `numeral` ('I'|'II'|'III'|'IV'), `label`, `topics: SnapshotTopic[]`
  - Header: `<h2><span class="num-roman">{numeral}</span> {label}</h2>` met hairline-rule onder
  - Per topic: asymmetric grid (34% titel, rest beschrijving)
  - Optie: § section-marker boven label ("§ 01")

- `patterns-section.tsx`:
  - Toon alleen als `report.patterns_section.length > 0`
  - Header "Wat herhaalt zich" + romeinse cijfer "V"
  - Bullet-lijst met `<li>{title} — {description}</li>`

- `report-detail.tsx`:
  - Server Component, props: `report: TopicStatusReport`
  - Layout: `<Masthead>` → `<NarrativeNote>` → 4× `<BucketSection>` → `<PatternsSection>`

### 4. Editorial CSS

- Update `apps/portal/src/app/globals.css`:
  - `.prose-editorial { max-width: 62ch; line-height: 1.7; }`
  - `.drop-cap::first-letter { font-family: var(--font-display); font-size: 4rem; float: left; line-height: 0.9; padding: 0.1em 0.1em 0 0; }`
  - `.num-roman { font-variant-numeric: oldstyle-nums; }` (of een eigen Roman-numeral renderer)
  - `.editorial-rule { border-top: 1px solid var(--rule-hairline); }`

### 5. CTA op roadmap-page

- Update `apps/portal/src/app/(app)/projects/[id]/roadmap/page.tsx` (uit PR-004):
  - Onder de roadmap-board: link "Bekijk wekelijkse rapporten →" naar `/reports`

### 6. Empty state

- Als geen published reports: `<EmptyState>` met tekst "Nog geen wekelijkse rapporten beschikbaar — komen op vrijdag online."

### 7. RLS-test

- Integration: maak rapport, login als andere-org-user, fetch → 404

## Acceptatiecriteria

- [ ] PR-REQ-140/141: archief-lijst zichtbaar met juiste velden
- [ ] PR-REQ-142: klikbaar naar detail
- [ ] PR-REQ-143: drafts onzichtbaar
- [ ] PR-REQ-144: masthead met `--paper-cream`-bg, Newsreader display
- [ ] PR-REQ-145: drop cap zichtbaar in browser-render
- [ ] PR-REQ-146: vier bucket-secties met I/II/III/IV
- [ ] PR-REQ-147: patterns-sectie toont alleen als gevuld
- [ ] PR-REQ-148: markdown rendert correct
- [ ] PR-REQ-149: detail leest uit content_snapshot, niet live topics
- [ ] PR-REQ-150: CTA op roadmap-page zichtbaar
- [ ] PR-REQ-151: RLS-test slaagt
- [ ] PR-DESIGN-050 t/m PR-DESIGN-054: visuele check tegen `/design-preview/roadmap` § 08
- [ ] Lighthouse-score acceptabel met editorial fonts (open vraag §14.10 punt 1 beantwoord)
- [ ] Type-check + lint slagen

## Risico's

| Risico                                                   | Mitigatie                                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Drop cap rendert verkeerd in Safari/Firefox              | Test in alle browsers; fallback: `:first-letter` + JS-detection (zie open vraag §14.10 #2) |
| Editorial fonts blow up bundle                           | Subset met `next/font` (alleen latin); meet Lighthouse                                     |
| Bevroren snapshot is verouderd: klant verwacht real-time | UI-tekst maakt duidelijk: "Bevroren op {date} — voor live status zie roadmap"              |
| Markdown injectie in `narrative_note`                    | Hergebruik veilige config met `rehype-sanitize` of strict `react-markdown` allowlist       |
| Asymmetric grid breekt op mobile                         | Single-column op `<md`; asymmetric alleen op `md+`                                         |

## Bronverwijzingen

- PRD: `docs/specs/prd-portal-roadmap/09-fase-4-narratief.md` §9.3.4, §9.3.5, §9.3.6 (Portal archief + detail + CTA)
- PRD: `docs/specs/prd-portal-roadmap/14-design-keuzes.md` §14.2, §14.3, §14.4 (editorial details)
- Preview: `apps/portal/src/components/roadmap-preview/report-detail.tsx`, `reports-list.tsx`

## Vision-alignment

Vision §2.4 — narratief is dé "trust amplifier". Een doordacht document beats een live dashboard voor vertrouwensopbouw. Editorial typografie is geen kosmetiek; het signaleert zorg en niveau.
