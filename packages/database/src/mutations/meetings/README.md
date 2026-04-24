# mutations/meetings/

Write-operaties voor het meetings-domein. Deur via `export *`.

## Bestanden

| File                   | Wat                                                                                            | Hoofdexports                                                                                                                                                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`             | Deur — re-export van alle sub-files                                                            | —                                                                                                                                                                                                                                                                               |
| `core.ts`              | Meeting-CRUD (insert, update-title/summary/type/classification), embeddings-stale              | `insertMeeting`, `insertManualMeeting`, `updateMeetingTitle`, `updateMeetingSummary`, `updateMeetingSummaryOnly`, `updateMeetingClassification`, `updateMeetingRawFireflies`, `updateMeetingElevenLabs`, `markMeetingEmbeddingStale`, `linkAllMeetingProjects`, `deleteMeeting` |
| `participants.ts`      | `meeting_participants` junction (people ↔ meeting)                                             | `linkMeetingParticipants`                                                                                                                                                                                                                                                       |
| `project-summaries.ts` | Segment-tagging (`meeting_project_summaries`) — schrijven + embeddings                         | `insertMeetingProjectSummaries`, `updateSegmentEmbedding`, `linkSegmentToProject`, `removeSegmentTag`                                                                                                                                                                           |
| `themes.ts`            | `meeting_themes` junction + stats-recalculatie. Roept `../extractions/themes` aan voor cascade | `linkMeetingToThemes`, `clearMeetingThemes`, `recalculateThemeStats`, `MeetingThemeMatch`                                                                                                                                                                                       |

## Imports

```ts
import { insertMeeting } from "@repo/database/mutations/meetings";
import { linkMeetingParticipants } from "@repo/database/mutations/meetings/participants";
import { insertMeetingProjectSummaries } from "@repo/database/mutations/meetings/project-summaries";
import { linkMeetingToThemes } from "@repo/database/mutations/meetings/themes";
```

## Mirror

Queries-tegenhanger: `packages/database/src/queries/meetings/`.
