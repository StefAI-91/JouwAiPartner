# queries/meetings/

Alle read-queries voor het meetings-domein. Eén deur (`index.ts`) die
via `export *` alles uit core / project-summaries / themes exporteert.

## Bestanden

| File                   | Wat                                                                                                                | Grootte      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------ |
| `index.ts`             | Deur — re-export van alle sub-files                                                                                | —            |
| `core.ts`              | Meeting-rij, lists, detail-queries, ingestie-lookups (Fireflies-id), pipeline-queries (embedding, reclassify etc.) | 730 regels\* |
| `project-summaries.ts` | Segmenten per meeting + per project. `MeetingSegment`, `ProjectSegment`                                            | 215 regels   |
| `themes.ts`            | Junction-queries op `meeting_themes`. `listTaggedMeetingIds`                                                       | 20 regels    |

\* `core.ts` is groot — kandidaat voor toekomstige splitsing (bv.
ingestion-lookups apart, pipeline-queries apart). Niet in scope nu.

## Imports

```ts
// Standaard — via de deur
import {
  getVerifiedMeetingById,
  type MeetingDetail,
  type MeetingSegment,
} from "@repo/database/queries/meetings";

// Fine-grained
import { getSegmentsByMeetingId } from "@repo/database/queries/meetings/project-summaries";
import { listTaggedMeetingIds } from "@repo/database/queries/meetings/themes";
```

## Cross-package

Mutations in `packages/database/src/mutations/meetings.ts`,
`meeting-participants.ts`, `meeting-themes.ts`,
`meeting-project-summaries.ts`. AI-pipeline gebruikt `core.ts` queries
in `packages/ai/src/pipeline/*`.
