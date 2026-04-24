# pipeline/participant/

Classificatie en link-utilities voor meeting-participants. Deur via `export *`.

## Bestanden

| File            | Wat                                                                                       | Hoofdexports                                                            |
| --------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `index.ts`      | Deur — re-export van classifier + helpers                                                 | —                                                                       |
| `classifier.ts` | Claude-Haiku classifier voor party-type + meeting-type (met cache tegen re-runs)          | `classifyParticipantsWithCache`, `determinePartyType`, `isBoardMeeting` |
| `helpers.ts`    | Attendee resolving: Fireflies email-strings → known people, dan `linkMeetingParticipants` | `MeetingAttendee`, `resolveAttendees`, `linkAttendeesToMeeting`         |

## Imports

```ts
import { classifyParticipantsWithCache } from "@repo/ai/pipeline/participant";
import { resolveAttendees } from "@repo/ai/pipeline/participant/helpers";
```

## Pipeline-context

Wordt aangeroepen door `gatekeeper-pipeline.ts` (meeting-ingest).
`classifier.ts` gebruikt `@repo/ai/agents/gatekeeper` types en
`@repo/database/queries/people`; `helpers.ts` roept
`@repo/database/mutations/meetings/participants` aan.
