# queries/meetings/

Alle read-queries voor het meetings-domein. Eén deur (`index.ts`) die
via `export *` alles uit alle sub-files exporteert. Splitsing per
sub-domein (SRP-002) zodat elke file < 300r en < 15 exports blijft.

## Bestanden

| File                   | Wat                                                                                                                  | Grootte |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- | ------- |
| `index.ts`             | Deur — re-export van alle sub-files                                                                                  | —       |
| `core.ts`              | Verified-meeting list/detail + board-meeting projectie. `MeetingDetail`, `VerifiedMeetingListItem`, `RecentMeeting`. | ~215 r  |
| `lookup.ts`            | Fireflies-id en title-date lookups (ingest/webhook).                                                                 | ~80 r   |
| `pipeline-fetches.ts`  | Pipeline-fetches: reclassify, dev-extractor, embedding, segmentation, title-generation + extraction-helpers.         | ~225 r  |
| `regenerate.ts`        | Regenerate / reprocess / backfill flows (Q2b-B en Q2b-C).                                                            | ~180 r  |
| `metadata.ts`          | Mini-queries: `organization_id`, project ids, participant ids (diff-logica).                                         | ~80 r   |
| `speaker-mapping.ts`   | Speaker-mapping backfill-tellingen, candidates, en rich-participant-projectie.                                       | ~165 r  |
| `project-summaries.ts` | Segmenten per meeting + per project. `MeetingSegment`, `ProjectSegment`.                                             | ~215 r  |
| `themes.ts`            | Junction-queries op `meeting_themes`. `listTaggedMeetingIds`.                                                        | ~20 r   |

## Imports

```ts
// Standaard — via de deur
import {
  getVerifiedMeetingById,
  type MeetingDetail,
  type MeetingSegment,
} from "@repo/database/queries/meetings";

// Fine-grained
import { getMeetingByFirefliesId } from "@repo/database/queries/meetings/lookup";
import { getMeetingForRegenerate } from "@repo/database/queries/meetings/regenerate";
import { getMeetingParticipantsForSpeakerMapping } from "@repo/database/queries/meetings/speaker-mapping";
import { getSegmentsByMeetingId } from "@repo/database/queries/meetings/project-summaries";
import { listTaggedMeetingIds } from "@repo/database/queries/meetings/themes";
```

## Cross-package

Mutations in `packages/database/src/mutations/meetings.ts`,
`meeting-participants.ts`, `meeting-themes.ts`,
`meeting-project-summaries.ts`. AI-pipeline gebruikt deze queries
in `packages/ai/src/pipeline/*`.
