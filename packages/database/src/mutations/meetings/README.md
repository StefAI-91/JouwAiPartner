# mutations/meetings/

Write-operaties voor het meetings-domein. Deur via `export *`.

## Bestanden

| File                   | Wat                                                                                                                               | Hoofdexports                                                                                                                                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`             | Deur — re-export van alle sub-files                                                                                               | —                                                                                                                                                                                                                          |
| `crud.ts`              | Meeting-CRUD: insert via Fireflies, manual insert, delete                                                                         | `insertMeeting`, `insertManualMeeting`, `deleteMeeting`                                                                                                                                                                    |
| `classification.ts`    | AI-classifier compound + per-veld metadata-edits (type/party/title/organization)                                                  | `updateMeetingClassification`, `updateMeetingType`, `updateMeetingPartyType`, `updateMeetingTitle`, `updateMeetingOrganization`                                                                                            |
| `linking.ts`           | `meeting_projects` junction — single + bulk + unlink                                                                              | `linkMeetingProject`, `linkAllMeetingProjects`, `unlinkMeetingProject`                                                                                                                                                     |
| `pipeline.ts`          | Pipeline-state: transcripts (ElevenLabs + named-cache), summary, raw-fireflies, embedding-stale flag, park/restore voor reprocess | `updateMeetingElevenLabs`, `updateMeetingNamedTranscript`, `updateMeetingSummary`, `updateMeetingSummaryOnly`, `updateMeetingRawFireflies`, `markMeetingEmbeddingStale`, `parkMeetingForReprocess`, `restoreParkedMeeting` |
| `participants.ts`      | `meeting_participants` junction (people ↔ meeting)                                                                                | `linkMeetingParticipants`                                                                                                                                                                                                  |
| `project-summaries.ts` | Segment-tagging (`meeting_project_summaries`) — schrijven + embeddings                                                            | `insertMeetingProjectSummaries`, `updateSegmentEmbedding`, `linkSegmentToProject`, `removeSegmentTag`                                                                                                                      |
| `themes.ts`            | `meeting_themes` junction + stats-recalculatie. Roept `../extractions/themes` aan voor cascade                                    | `linkMeetingToThemes`, `clearMeetingThemes`, `recalculateThemeStats`, `MeetingThemeMatch`                                                                                                                                  |

## Imports

```ts
import { insertMeeting } from "@repo/database/mutations/meetings";
import { linkMeetingParticipants } from "@repo/database/mutations/meetings/participants";
import { insertMeetingProjectSummaries } from "@repo/database/mutations/meetings/project-summaries";
import { linkMeetingToThemes } from "@repo/database/mutations/meetings/themes";
```

## Mirror

Queries-tegenhanger: `packages/database/src/queries/meetings/`.
