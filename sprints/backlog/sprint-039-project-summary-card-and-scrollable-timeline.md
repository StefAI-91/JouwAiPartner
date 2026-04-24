# Sprint 039: Project Summary Card + Scrollable Timeline (UI-refactor)

> **Scope.** UI-only refactor van `/projects/[id]`. Alle benodigde data bestaat al (`briefing_summary.structured_content.timeline`, `project.start_date`, `project.deadline`). Geen nieuwe AI-agents, geen nieuwe DB-migraties, geen schema-wijzigingen.
>
> **Aanleiding.** Huidige project-page toont samenvatting + timeline als losse blokken die met de page-scroll meerollen. Bij projecten met 30+ touchpoints wordt de pagina onhandelbaar lang en verliest de samenvatting zijn "altijd zichtbaar"-rol. Mockup `docs/specs/sketches/sketch-feature-projectverloop-contained-v2.html` (zonder de inzichten-container — die volgt in sprint 040) toont het beoogde patroon: gestileerde summary-card boven, projectverloop in een **eigen scroll-container** met sticky spine, maand-grouping en kantelpunt-accent.

## Doel

Aan het eind van deze sprint opent Stef `/projects/cai-studio` en ziet:

1. Een **Project Summary Card** bovenaan met progress-strip (kickoff ─── nu ─── deadline), context-kolom en briefing-kolom — altijd volledig zichtbaar zonder dat hij hoeft te scrollen.
2. Een **Projectverloop-container** daaronder met eigen interne scroll van vaste hoogte (640px), sticky spine links, maand-grouping en kantelpunt-accent.
3. De rest van de pagina (tabs voor meetings/emails/extracties) blijft onveranderd onder de fold.

De timeline-data en summary-data wijzigen niet — dit is puur een visuele en architecturele refactor.

## Requirements

| ID       | Beschrijving                                                                                                                                                   |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI-090   | `ProjectSummaryCard` component op `/projects/[id]` bovenaan, vervangt losse briefing+context blokken                                                           |
| UI-091   | `ProjectProgressStrip` toont kickoff-datum, vandaag, deadline-datum + percentage voltooide tijdspanne + dagen tot deadline                                     |
| UI-092   | Progress-strip rendert alleen als beide `project.start_date` EN `project.deadline` zijn gezet; anders subtiel weggelaten                                       |
| UI-093   | `ProjectTimeline` component refactored naar **scrollable container** (`overflow-y: auto`, vaste hoogte 640px)                                                  |
| UI-094   | Sticky spine links binnen scroll-container met maand-dots (Jan-Jun) + "je bent hier"-indicator die meebeweegt met container-scroll                             |
| UI-095   | Timeline-entries gegroepeerd per maand met sticky maand-header binnen de scroll-container                                                                      |
| UI-096   | Datum-prefix tussen haakjes uit titels gestript bij render (`(Status):` etc.) — defensief in de UI, niet in de prompt                                          |
| UI-097   | Kantelpunt-detectie heuristiek: meeting_type ∈ `['kickoff', 'strategy', 'review']` OF `key_decisions.length >= 3` → gekleurde linker-balk + grotere typografie |
| UI-098   | Container-header toont "Kijkt nu naar: [Maand]"-pill die mee-update via IntersectionObserver gebonden aan de scroll-container                                  |
| UI-099   | Top/bottom fade-overlays binnen scroll-container suggereren dat er meer content is                                                                             |
| UI-100   | `RegenerateSummaryButton` verplaatst van onder de timeline naar de footer-strip van `ProjectSummaryCard`                                                       |
| FUNC-090 | Pure helper `groupTimelineByMonth(entries)` — groepeert entries per `YYYY-MM`, sorteert oud→nieuw                                                              |
| FUNC-091 | Pure helper `detectPivot(entry)` — heuristiek conform UI-097, geen AI-call                                                                                     |
| FUNC-092 | Pure helper `formatProjectProgress(start, deadline, today)` — retourneert `{ percent, daysRemaining, status }` voor de progress-strip                          |
| RULE-030 | Geen wijziging aan `TimelineEntrySchema`, `ProjectSummaryOutputSchema` of de AI-prompt. Alle nieuwe gedrag zit in de UI-laag                                   |
| RULE-031 | Geen nieuwe queries of mutations. `getProjectById` blijft de enige data-bron                                                                                   |
| EDGE-030 | Project zonder timeline-entries → `ProjectTimeline` rendert een lege staat met uitleg ("Geen verified meetings nog")                                           |
| EDGE-031 | Project zonder `start_date` of `deadline` → progress-strip wordt overgeslagen, de rest van de summary-card rendert normaal                                     |
| EDGE-032 | Timeline met 1 maand data → spine toont alleen die maand actief, andere maanden gedimd; geen crash                                                             |

## Bronverwijzingen

- **Mockup (ground truth voor visueel):** `docs/specs/sketches/sketch-feature-projectverloop-contained-v2.html` — negeer de Inzichten-container (zit in sprint 040), focus op summary-card bovenaan + verloop-container met spine.
- **Huidige project-page:** `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`
- **Huidige timeline-component (te refactoren):** `apps/cockpit/src/features/projects/components/project-timeline.tsx`
- **Schema (ongewijzigd):** `packages/ai/src/validations/project-summary.ts` — `TimelineEntry`, `extractProjectTimeline`
- **Project-query (ongewijzigd):** `packages/database/src/queries/projects.ts` — `getProjectById` levert al `start_date`, `deadline`, `briefing_summary.structured_content`
- **Vergelijkbaar feature-folder pattern:** `apps/cockpit/src/features/meetings/components/` (zie `meeting-detail.tsx` voor compositie)
- **Bestaande org-timeline (referentie voor sticky-sort gedrag):** `apps/cockpit/src/components/organizations/org-timeline.tsx`

## Context

### Huidige staat

- `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx` rendert de timeline direct op page-niveau via `ProjectTimeline`, met de regenerate-knop er los onder.
- De briefing-tekst (markdown) wordt waarschijnlijk in `ProjectSections` of een naburige component getoond — moet bevestigd worden tijdens implementatie.
- `ProjectTimeline` is nu een lijst zonder eigen scroll: groeit ongelimiteerd mee met de page.
- Geen progress-strip; deadline-info wordt nergens visueel getoond.

### Ontwerpkeuzes (door Stef bevestigd)

1. **Container-hoogte 640px.** Past 3-4 entries volledig + suggereert meer via fade. Vaste pixel-waarde i.p.v. `vh` zodat de page-layout voorspelbaar blijft.
2. **Pivot-detectie via heuristiek (optie A).** Geen schema-uitbreiding, geen AI-call. Reden: stabieler en sneller. Schema-veld `is_pivot` kan in een latere sprint als blijkt dat heuristiek tekortschiet.
3. **Datum-prefix-stripping in UI, niet in prompt.** Reden: defensief tegen historische data en oude prompt-versies. Eén regex in render-laag dekt alle entries.
4. **Regenerate-knop verhuist naar summary-footer.** Conceptueel hoort die bij de samenvatting (regenereert alle 3: context + briefing + timeline), niet bij de timeline alleen.
5. **Geen "open-acties rollup".** Overwogen in mockup v1 maar bewust uitgesteld — overlapt te veel met sprint 040 (Inzichten) die acties + risico's structureel gaat aanpakken.

### File-organisatie

Alle componenten in `apps/cockpit/src/features/projects/components/`. Pure helpers in `apps/cockpit/src/features/projects/utils/` (nieuwe sub-folder, parallel aan `components/` en `actions/`).

```
apps/cockpit/src/features/projects/
├── actions/
├── components/
│   ├── project-summary-card.tsx        ← NIEUW (composeert progress + context + briefing)
│   ├── project-progress-strip.tsx      ← NIEUW (sub-component van summary-card)
│   ├── project-timeline.tsx            ← REFACTOR (van losse lijst → scrollable container)
│   ├── timeline-spine.tsx              ← NIEUW (sticky spine met dots + you-are-here)
│   ├── timeline-month-section.tsx      ← NIEUW (groepering per maand met sticky header)
│   ├── timeline-entry.tsx              ← NIEUW (één entry render, met pivot-accent)
│   └── ... (overige bestaande componenten ongewijzigd)
├── hooks/                              ← NIEUWE sub-folder
│   └── use-active-month-observer.ts    ← NIEUW (IntersectionObserver gebonden aan scroll-container)
├── utils/                              ← NIEUWE sub-folder
│   ├── group-timeline-by-month.ts      ← NIEUW (FUNC-090)
│   ├── detect-pivot.ts                 ← NIEUW (FUNC-091)
│   ├── format-project-progress.ts      ← NIEUW (FUNC-092)
│   └── strip-title-prefix.ts           ← NIEUW (UI-096)
└── README.md                           ← UPDATE (nieuwe componenten + folders documenteren)
```

### Right-sizing

Geen AI, geen DB. Wel een denkmoment: `ProjectTimeline` wordt opgesplitst zodat geen enkele file boven ~150 regels uitkomt (CLAUDE.md regel). De huidige file is ~145 regels — na refactor wordt het anders verdeeld over 4 files (`project-timeline`, `timeline-spine`, `timeline-month-section`, `timeline-entry`).

## Prerequisites

Geen blokkers. Alles bestaat:

- `briefing_summary.structured_content.timeline` wordt al geleverd door `getProjectById`
- `extractProjectTimeline` valideert al
- `project.start_date` en `project.deadline` zijn al velden op de projects-tabel

## Taken

### Utils-laag (puur, makkelijk testbaar — bouw eerst)

- [ ] [FUNC-090] `apps/cockpit/src/features/projects/utils/group-timeline-by-month.ts` — input: `TimelineEntry[]`, output: `{ month: string; label: string; entries: TimelineEntry[] }[]`. Sorteert oud→nieuw. Maand-key in `YYYY-MM` formaat, label in NL ("April 2026").
- [ ] [FUNC-091] `apps/cockpit/src/features/projects/utils/detect-pivot.ts` — input: `TimelineEntry`, output: `boolean`. Heuristiek: `meeting_type ∈ ['kickoff', 'strategy', 'review']` OF `key_decisions.length >= 3`.
- [ ] [FUNC-092] `apps/cockpit/src/features/projects/utils/format-project-progress.ts` — input: `(start: Date | null, deadline: Date | null, today: Date)`, output: `{ percent: number, daysRemaining: number, status: 'before' | 'in_progress' | 'overdue' } | null`. Returnt `null` als start of deadline ontbreekt.
- [ ] [UI-096] `apps/cockpit/src/features/projects/utils/strip-title-prefix.ts` — input: `string`, output: `string`. Regex `/^\([^)]+\):\s*/` weghalen aan begin van titel.

### Hooks

- [ ] [UI-098] `apps/cockpit/src/features/projects/hooks/use-active-month-observer.ts` — gebonden aan een container-ref. Retourneert de `data-month`-key van de entry die het meest in beeld is. IntersectionObserver met `root: containerRef.current`.

### Components

- [ ] [UI-091][UI-092] `project-progress-strip.tsx` — sub-component. Pure presentatie van `formatProjectProgress` output.
- [ ] [UI-090][UI-100] `project-summary-card.tsx` — gestileerde card met header (progress-strip), body (2-koloms context + briefing), footer (regenerate-knop). Accepteert props uit `getProjectById` resultaat.
- [ ] [UI-094] `timeline-spine.tsx` — sticky spine met maand-dots, "you are here"-indicator, kickoff/deadline-labels. Accepteert: actieve maand-key, scroll-percentage.
- [ ] [UI-095][UI-097] `timeline-entry.tsx` — render één entry met pivot-accent (linker-balk + grotere title). Roept `detectPivot()` en `stripTitlePrefix()` aan.
- [ ] [UI-095] `timeline-month-section.tsx` — wrapper om een groep entries met sticky maand-header.
- [ ] [UI-093][UI-098][UI-099] `project-timeline.tsx` — refactor naar scrollable container met sticky spine. Composeert `timeline-spine` + `timeline-month-section[]` + IntersectionObserver-hook. Container heeft fade-overlays en footer-strip.

### Page-integratie

- [ ] `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`:
  - Importeer `ProjectSummaryCard` en gebruik die boven de tabs.
  - `ProjectTimeline` blijft als aparte sectie eronder (eigen container).
  - Verwijder de losse `RegenerateSummaryButton` onder de timeline (zit nu in summary-card-footer).

### Lege staten / edge cases

- [ ] [EDGE-030] `ProjectTimeline` toont lege staat als `timeline.length === 0`: kaart met tekst "Nog geen geverifieerde meetings — verifieer een meeting om het projectverloop te zien." + link naar review-queue.
- [ ] [EDGE-031] `ProjectProgressStrip` retourneert `null` als `formatProjectProgress` `null` levert; `ProjectSummaryCard` toont dan alleen context + briefing zonder de header-strip.
- [ ] [EDGE-032] Spine highlight werkt ook als één maand actief is.

### Documentatie

- [ ] Update `apps/cockpit/src/features/projects/README.md`:
  - Tabel met nieuwe componenten + rol
  - Nieuwe sub-folders `hooks/` en `utils/` documenteren
  - "Design decisions"-sectie uitbreiden met de keuzes uit deze sprint (heuristic pivot, container-hoogte 640px, prefix-stripping in UI)

## Tests

Volgens `docs/specs/test-strategy.md`. Tests voor pure utils zijn verplicht; component-tests zijn nice-to-have als ze observable behavior testen (geen implementatie-details).

- [ ] `apps/cockpit/src/features/projects/utils/__tests__/group-timeline-by-month.test.ts` — sorteert correct, groepeert correct, NL-labels, lege input → lege array.
- [ ] `apps/cockpit/src/features/projects/utils/__tests__/detect-pivot.test.ts` — meeting_type=strategy → true, key_decisions=4 → true, status_update + 0 decisions → false, kickoff → true.
- [ ] `apps/cockpit/src/features/projects/utils/__tests__/format-project-progress.test.ts` — null start → null output, today voor start → status='before', today na deadline → status='overdue', halverwege → percent=50.
- [ ] `apps/cockpit/src/features/projects/utils/__tests__/strip-title-prefix.test.ts` — `"(Status): foo"` → `"foo"`, geen prefix → ongewijzigd, alleen prefix → lege string trimmed.

## Verification

- [ ] `npm run type-check` groen
- [ ] `npm run lint` groen
- [ ] Bestaande tests (`packages/ai/__tests__/validations/project-summary.test.ts`) nog steeds groen
- [ ] Lokaal `/projects/[één-bestaand-project]` openen: summary-card bovenaan zichtbaar, timeline scrollt binnen z'n eigen container, spine beweegt mee, kantelpunten visueel onderscheiden, geen console-errors.
- [ ] Project zonder timeline of zonder start_date: edge cases werken zonder crashes.

## Niet in scope (gaat naar sprint 040)

- Inzichten & signalen-container (Risico's / Insights / Needs)
- Open-acties rollup
- Klikbare timeline-entries → bron-meeting
- Filter-chips op de timeline
- Prompt-aanpassing om datum-prefix in titel te voorkomen (defensief in UI is voor nu genoeg)
