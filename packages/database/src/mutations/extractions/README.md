# mutations/extractions/

Write-operaties voor extractions (pipeline-output). Deur via `export *`.

## Bestanden

| File                    | Wat                                                                                                       | Hoofdexports                                                                                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`              | Deur — re-export van core + themes + experimental-risks                                                   | —                                                                                                                                                               |
| `core.ts`               | Primary extraction CRUD door pipeline en handmatig (insert, delete-by-meeting, correct, updateNeedStatus) | `insertExtractions`, `deleteExtractionsByMeetingId`, `deleteExtractionsByMeetingAndType`, `correctExtraction`, `getExtractionForCorrection`, `updateNeedStatus` |
| `themes.ts`             | Junction tabel `extraction_themes` (link/clear per meeting)                                               | `linkExtractionsToThemes`, `clearExtractionThemesForMeeting`, `ExtractionThemeRow`                                                                              |
| `experimental-risks.ts` | Experimentele risk-specialist output (losse tabel voor evaluatie)                                         | `insertExperimentalRiskExtraction`, `ExperimentalRiskExtractionInput`                                                                                           |

## Imports

```ts
import { insertExtractions, correctExtraction } from "@repo/database/mutations/extractions";
import { linkExtractionsToThemes } from "@repo/database/mutations/extractions/themes";
import { insertExperimentalRiskExtraction } from "@repo/database/mutations/extractions/experimental-risks";
```

## Cross-package

Queries zijn in `packages/database/src/queries/extractions.ts` (plat,
geen submap — 1 file). AI-pipeline in `packages/ai/src/pipeline/` roept
deze mutations aan vanuit save-risk-extractions, scan-needs en
link-themes stappen.
