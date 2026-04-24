# pipeline/embed/

Embedding-helpers voor meetings en re-embed worker. Deur via `export *`.

## Bestanden

| File                 | Wat                                                                   | Hoofdexports                  |
| -------------------- | --------------------------------------------------------------------- | ----------------------------- |
| `index.ts`           | Deur                                                                  | —                             |
| `pipeline.ts`        | `embedMeetingWithExtractions` — wordt synchroon na ingest aangeroepen | `embedMeetingWithExtractions` |
| `text.ts`            | Formatter die meeting + extractions samenvoegt tot één embed-tekst    | `buildMeetingEmbedText`       |
| `re-embed-worker.ts` | Batch-worker voor stale rijen (projects/people/extractions/meetings)  | `runReEmbedWorker`            |

## Imports

```ts
import { embedMeetingWithExtractions } from "@repo/ai/pipeline/embed";
import { runReEmbedWorker } from "@repo/ai/pipeline/embed/re-embed-worker";
```

## Cross-package

Gebruikt `@repo/ai/embeddings` (Cohere API wrapper), `@repo/database/
queries/meetings` + `queries/content` + `queries/people`, en
`@repo/database/mutations/embeddings`.
