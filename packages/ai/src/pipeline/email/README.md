# pipeline/email/

Email-ingest pipeline: Gmail message → classify → resolve org → save.
Deur via `export *`.

## Bestanden

| File                   | Wat                                                                                                                                                       | Hoofdexports                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `index.ts`             | Deur                                                                                                                                                      | —                                                               |
| `core.ts`              | `processEmailBatch` (batch-ingest) + `processEmail` (single re-process). Orkestreert classifier, pre-filter, filter-gatekeeper, org-resolve, embed, save. | `processEmailBatch`, `processEmail`, `resolveEmailOrganization` |
| `filter-gatekeeper.ts` | Nieuwsbrieven / no-reply / bulk mail eruit filteren (rule-based gate)                                                                                     | `decideEmailFilter`, `FilterReason`                             |
| `pre-classifier.ts`    | Light-weight pre-classification (Haiku) vóór de hoofd-classifier om kosten te sparen                                                                      | `preClassifyEmail`                                              |

## Imports

```ts
import { processEmailBatch } from "@repo/ai/pipeline/email/core";
// of via de deur
import { processEmailBatch } from "@repo/ai/pipeline/email";
```

## Cross-package

Roept `@repo/ai/agents/email-classifier` aan voor de hoofd-LLM step.
Gebruikt `pipeline/lib/context-injection` + `pipeline/lib/entity-resolution`
en `@repo/ai/embeddings`.
