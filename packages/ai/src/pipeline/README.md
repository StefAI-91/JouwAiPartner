# pipeline/

AI-pipeline voor meeting-ingest en verwerking. De pipeline is opgebouwd
in **twee lagen** met een duidelijke rol per laag — een onderscheid dat
historisch impliciet was en nu expliciet hier vastligt.

## Twee lagen

```
pipeline/
├── gatekeeper-pipeline.ts   ← orchestrator (de "hoofdpijplijn")
├── steps/                   ← orchestrator-API: één run*Step per file
├── lib/                     ← pure helpers, herbruikbaar tussen steps
├── saves/                   ← DB-writers voor extraction-tabellen
├── tagger.ts                ← lower-level tagger logica
├── email/                   ← email-classificatie pipeline (eigen orchestrator)
├── embed/                   ← embed-batch pipeline (eigen orchestrator)
├── participant/             ← participant-resolutie (helpers + classifier)
└── summary/                 ← project-summaries pipeline
```

### Laag 1 — Steps (`steps/`)

Public API van de pipeline. Elke step exporteert één `run*Step()`
functie. **Alleen aangeroepen door** `gatekeeper-pipeline.ts` (volle
ingest) en regenerate-actions / reprocess-routes.

Apps en api-routes hoorden via deze laag te importeren — niet
rechtstreeks `runTagger` of andere lower-level building blocks.

Zie [`steps/README.md`](./steps/README.md).

### Laag 2 — Lib (`lib/`)

Pure helpers zonder side-effects op de pipeline-state. Steps leunen op
deze blocks; tests kunnen ze geïsoleerd valideren.

| File                     | Rol                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| `title-builder.ts`       | `buildMeetingTitle` (formattering) + `generateMeetingTitle` (AI-titel via title-generator).   |
| `segment-builder.ts`     | `buildSegments` — tagger-output → meeting_project_summaries-rijen.                            |
| `speaker-map.ts`         | `extractSpeakerNames`, `buildSpeakerMap`, `formatSpeakerContext` voor named-transcript flows. |
| `entity-resolution.ts`   | Project / organization / client matching tegen DB (fuzzy + embeddings).                       |
| `context-injection.ts`   | `buildEntityContext` — projecten + clients + organizations als prompt-context.                |
| `build-raw-fireflies.ts` | Fireflies-payload → genormaliseerd transcript.                                                |

### Saves (`saves/`)

DB-writers voor extraction-tabellen. Aparte folder omdat ze write-only
side-effects hebben en specifiek aan een agent gekoppeld zijn.

| File                         | Rol                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| `action-item-extractions.ts` | Persisteert action-item-specialist output naar `extractions` (canonical + experimental). |
| `risk-extractions.ts`        | Persisteert risk-specialist output naar `extractions` + experimental tabel.              |

### Orchestrator

`gatekeeper-pipeline.ts` is de hoofdpijplijn voor meeting-ingest. Roept
`runGatekeeper` (het filter-agent) aan en scheduleert daarna de steps in
de juiste volgorde inclusief parallel-takken (themes naast embeddings).

### Sub-pipelines (`email/`, `embed/`, `summary/`, `participant/`)

Eigen domeinen met eigen orchestrators of helper-clusters. Lezen een
README per folder.

## Tagger blijft in root

`tagger.ts` blijft op pipeline-niveau staan: het is geen pure helper
(>500 regels eigen logica) en geen "step" in de canonieke zin (de
`runTagAndSegmentStep` wrapt het). Splitsen in een eigen sub-folder
heeft op dit moment geen winst — als hij verder groeit kan dat alsnog.

## Boundary-regel

Apps importeren via `steps/` of via `saves/` — **niet** rechtstreeks
`runTagger` of andere root-helpers. De step-laag is de stabiele
contract-grens. Bestaande directe imports zijn boundary-leaks.
