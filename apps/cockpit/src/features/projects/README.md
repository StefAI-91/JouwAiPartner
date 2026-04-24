# Feature: Projects

Projecten-domein in de cockpit: CRUD, detailpagina met samenvattingen, en timeline-rendering. Een project hoort altijd bij één organisatie.

## Menu per laag

### `actions/`

Server actions voor CRUD op projecten.

| File          | Exports                                                             | Gebruikt door                                                                                                                                |
| ------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `projects.ts` | `createProjectAction`, `updateProjectAction`, `deleteProjectAction` | `add-project-button`, `edit-project`, `features/meetings/components/project-linker`, `features/meetings/components/create-project-sub-modal` |

### `components/`

UI-componenten voor projectoverzicht, detail en bewerking. Geen barrel — breekt Next.js client-bundle.

| File                               | Rol                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `add-project-button.tsx`           | Knop + modal om nieuw project te maken (lijst-pagina).                                                                    |
| `edit-project.tsx`                 | Modal om bestaand project te bewerken of verwijderen (detail-pagina).                                                     |
| `project-card.tsx`                 | Card-weergave op de lijst-pagina.                                                                                         |
| `project-sections.tsx`             | Container die op de detail-pagina de e-mail- en extractie-secties samenbrengt.                                            |
| `project-emails-section.tsx`       | Gekoppelde e-mails op de detail-pagina.                                                                                   |
| `combined-extractions-section.tsx` | Gecombineerde meeting-extractions op de detail-pagina.                                                                    |
| `project-summary-card.tsx`         | Bovenste card op de detail-pagina: progress-strip + context + briefing + regenerate-knop.                                 |
| `project-progress-strip.tsx`       | Sub-component van de summary-card: kickoff/vandaag/deadline-balk met percentage.                                          |
| `project-timeline.tsx`             | Scrollable tijdlijn-container met eigen scroll en sticky spine. Composeert `timeline-spine` + `timeline-month-section[]`. |
| `timeline-spine.tsx`               | Sticky spine links in de scroll-container met maand-dots, progress-fill en "you are here"-indicator.                      |
| `timeline-month-section.tsx`       | Groepering per maand binnen de scroll-container met sticky maand-header.                                                  |
| `timeline-entry.tsx`               | Render van één timeline-entry met kantelpunt-accent (via `detectPivot`) en email/meeting-discriminatie.                   |
| `regenerate-summary-button.tsx`    | Trigger voor AI-herberekening van de project-samenvatting. Ook gebruikt op org- en client-pagina's.                       |
| `status-pipeline.tsx`              | Statusweergave, samengesteld in `project-card`.                                                                           |

### `hooks/`

| File                           | Rol                                                                                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `use-active-month-observer.ts` | IntersectionObserver gebonden aan een scrollbare container-ref. Retourneert de `data-month` van de entry die momenteel het meest in beeld is. |

### `utils/`

Pure helpers zonder React — volledig unit-tested.

| File                         | Rol                                                                                                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `group-timeline-by-month.ts` | Groepeert `TimelineEntry[]` per `YYYY-MM` met NL-label. Sorteert oud→nieuw.                                                                                                       |
| `detect-pivot.ts`            | Heuristiek voor kantelpunten: `meeting_type ∈ ['kickoff','strategy','review']` OF `key_decisions.length >= 3`.                                                                    |
| `format-project-progress.ts` | Bereken `{ percent, daysRemaining, status }` uit `start_date` / `deadline`. Retourneert `null` bij ontbrekende data. Normaliseert op UTC-midnight om tijdzone-drift te voorkomen. |
| `strip-title-prefix.ts`      | Defensief: haalt `(Status):`/`(Strategie):`-prefixes uit meeting-titels die soms door Haiku toegevoegd worden.                                                                    |

## Gerelateerde packages (NIET in deze feature)

| Pad                                    | Rol                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `@repo/database/queries/projects`      | Read-helpers: `listProjects`, `getProjectById`.                                                         |
| `@repo/database/mutations/projects`    | Write-helpers: `createProject`, `updateProject`, `deleteProject` (gebruikt door `actions/projects.ts`). |
| `@repo/database/validations/entities`  | `updateProjectSchema`, `deleteSchema`.                                                                  |
| `@repo/database/validations/meetings`  | `createProjectSchema` (historisch daar, niet hier gedupliceerd).                                        |
| `@repo/database/constants/projects`    | `PROJECT_STATUSES`, `STATUS_LABELS`.                                                                    |
| `@repo/ai/validations/project-summary` | `extractProjectTimeline` (zet AI-samenvatting om naar timeline-items).                                  |

## Design decisions

- **Geen eigen `validations/`-laag.** Schemas leven in `@repo/database/validations/` omdat ze gedeeld zijn met mutations en tests. Verplaatsen zou duplicatie geven.
- **Tasks-actions horen NIET bij deze feature.** Taken worden gebruikt vanuit dashboard en shared components, niet vanuit project-UI. Die blijven daarom horizontaal in `@/actions/`.
- **`regenerate-summary-button` heeft 3 consumers** (projects, clients, administratie). Hij woont hier omdat hij conceptueel over project-samenvattingen gaat; de andere twee pagina's consumeren dezelfde knop.
- **`cleanInput`** komt uit de shared helpers in `@/actions/_utils` — gedeelde helper, blijft horizontaal.
- **Timeline-container heeft een vaste hoogte van 640px met interne scroll.** Reden: voorkomt dat de page-scroll oneindig lang wordt bij projecten met 30+ touchpoints én zorgt dat de summary-card altijd bovenin zichtbaar blijft. Gekozen boven `vh`-units voor voorspelbaarheid van de page-layout.
- **Kantelpunt-detectie via heuristiek, niet via AI-veld.** `detectPivot` leeft in de UI-laag omdat het een puur visuele verrijking is; geen schema-wijziging nodig. Als blijkt dat de heuristiek tekortschiet, kan een toekomstig `is_pivot`-veld door de AI gevuld worden.
- **Datum-prefix-stripping in UI, niet in prompt.** Defensief: oudere briefings en historische structured_content bevatten nog titels als `(Status): ...`. `stripTitlePrefix` dekt dat af zonder prompt-wijziging.
- **IntersectionObserver gebonden aan de scroll-container (`root: container`), niet aan de window.** Zo beïnvloedt page-scroll de "actieve maand"-indicator niet. De hook (`use-active-month-observer`) koppelt dit aan een `RefObject`.
