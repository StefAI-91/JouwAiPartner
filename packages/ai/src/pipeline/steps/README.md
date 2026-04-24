# pipeline/steps/

Meeting-ingest pipeline per afzonderlijke step. Elk file exporteert één
`run*Step` functie. Samen worden ze georkestreerd door
`pipeline/gatekeeper-pipeline.ts` (volle ingest) en individueel
aangeroepen door regenerate-actions / reprocess-routes.

Geen deur (`index.ts`) — consumers importeren per step om de mock-scope
klein te houden in tests.

## Steps

Globaal in volgorde van de ingest-keten:

| File                 | Wat                                                                                  | Hoofdexport                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transcribe.ts`      | Audio → transcript via ElevenLabs (alleen voor niet-Fireflies bronnen)               | `runTranscribeStep`, `TranscribeResult`                                                                                                             |
| `summarize.ts`       | Summarizer-agent → markdown-summary + structured content                             | `runSummarizeStep`, `SummarizeResult`                                                                                                               |
| `tag-and-segment.ts` | Transcript → extractions + project-segmenten (met embeddings)                        | `runTagAndSegmentStep`, `TagAndSegmentInput`, `TagAndSegmentResult`                                                                                 |
| `risk-specialist.ts` | Risk-specialist agent → `experimental_risk_extractions`-rijen (evaluatie-only nu)    | `runRiskSpecialistStep`                                                                                                                             |
| `theme-detector.ts`  | Theme-detector agent → voorgestelde meeting↔theme matches                            | `runThemeDetectorStep`, `ThemeDetectorStepInput`, `ThemeDetectorStepResult`                                                                         |
| `link-themes.ts`     | Write-stap: meeting_themes + extraction_themes junction (+ emerging theme proposals) | `runLinkThemesStep`, `LinkThemesStepInput`, `LinkThemesResult`, `PreviewResult`, `MeetingThemeToWrite`, `ProposalToCreate`, `SkippedDueToRejection` |
| `generate-title.ts`  | AI-gegenereerde titel na ingest (of via regenerate-action)                           | `runGenerateTitleStep`, `GenerateTitleStepInput`, `GenerateTitleStepResult`                                                                         |
| `embed.ts`           | Thin wrapper om `pipeline/embed/pipeline` aan te roepen als pipeline-step            | `runEmbedStep`, `EmbedStepResult`                                                                                                                   |

## Imports

```ts
import { runSummarizeStep } from "@repo/ai/pipeline/steps/summarize";
import { runLinkThemesStep } from "@repo/ai/pipeline/steps/link-themes";
```

## Consumers

- **Volle ingest**: `pipeline/gatekeeper-pipeline.ts` ketent de steps.
- **Regenerate-actions** in `apps/cockpit/src/features/meetings/actions/`
  (`regenerate-meeting`, `regenerate-risks`, `reprocess-meeting`) roepen
  individuele steps aan.
- **Reprocess-routes** in `apps/cockpit/src/app/api/ingest/*`.
- **Batch scripts** in `scripts/batch-detect-themes.ts` gebruiken
  `theme-detector` + `link-themes` steps.

## Verschil met andere pipeline-submappen

- `pipeline/email/`, `pipeline/embed/`, `pipeline/summary/` zijn aparte
  pipelines (eigen entry-points, eigen data-flow).
- `pipeline/participant/` zijn classificatie-helpers die door
  `gatekeeper-pipeline.ts` worden aangeroepen.
- `steps/` is de meeting-ingest pipeline per callable step. Niks in
  `steps/` hoort in een van de andere submappen.
