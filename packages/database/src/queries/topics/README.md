# queries/topics/

Read-laag voor topics — de curatielaag tussen issues en reports. Eén deur
(`index.ts`), drie content-files. Cluster-keuze volgt criterium 3 uit
CLAUDE.md: topics heeft een eigen `features/topics/` in DevHub (PR-003).

## Bestanden

| File               | Wat                                    | Publieke API                                                                                |
| ------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `index.ts`         | Deur — re-exporteert alles             | (zie de andere files)                                                                       |
| `list.ts`          | Lijst- en bucket-views                 | `TOPIC_LIST_COLS`, `TopicListRow`, `ListTopicsFilters`, `listTopics`, `listTopicsByBucket`  |
| `detail.ts`        | Eén topic + linked issues in één query | `TopicDetailRow`, `LinkedIssueRow`, `TopicWithIssues`, `getTopicById`, `getTopicWithIssues` |
| `linked-issues.ts` | Counts en losse junction-lookups       | `countIssuesPerTopic`, `getIssuesForTopic`                                                  |

## Imports

```ts
// Standaard — via de deur
import { listTopics, type TopicListRow } from "@repo/database/queries/topics";

// Fine-grained — als je wilt afdwingen welke sub-file je raakt
import { countIssuesPerTopic } from "@repo/database/queries/topics/linked-issues";
```

## Gerelateerd

- Mutations: `packages/database/src/mutations/topics/`
- Validations: `packages/database/src/validations/topics.ts`
- Constants (statuses, types, bucket-mapping): `packages/database/src/constants/topics.ts`

## Performance-aannames

- `listTopicsByBucket` doet 1 query met `.in('status', [...])`, gebruikt
  `idx_topics_project_status`. Filtering binnen "Komende week" gebeurt in
  JS — geen `target_sprint_id`-WHERE op DB-niveau, want we accepteren
  topics zonder sprint óók (zie inline-comment).
- `countIssuesPerTopic` doet 1 query met `.in('topic_id', [...])` en
  aggregeert in JS. Cap consumenten op ≤100 topics per call.
- `getTopicWithIssues` gebruikt PostgREST embed door de junction —
  exact 1 SQL-roundtrip ongeacht aantal linked issues.
