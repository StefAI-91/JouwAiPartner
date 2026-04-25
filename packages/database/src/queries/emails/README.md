# queries/emails

Read-helpers voor het emails-domein. Reden voor cluster: 550 regels en 24
exports in de oude `emails.ts` — boven de drempel uit CLAUDE.md (>300 regels
of >15 exports). Bovendien heeft `emails` een corresponderende
`features/emails/` in cockpit.

## Sub-files

| File          | Rol                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------- |
| `accounts.ts` | Google Account CRUD: `listActiveGoogleAccounts*`, `getGoogleAccount*`. Tokens: server-only.   |
| `lists.ts`    | Overzichten met filters: `listEmails`, `countEmailsByFilterStatus`, `countEmailsByDirection`. |
| `detail.ts`   | Single-email + draft-views: `getEmailById`, `listDraftEmails`, `getDraftEmailById`.           |
| `pipeline.ts` | Pipeline-input + sync helpers: `getEmailForPipelineInput`, `listEmailsForReclassify`, sync.   |
| `index.ts`    | Publieke deur — re-exporteert alles. Importeer via `@repo/database/queries/emails`.           |

## Import-patterns

```ts
// Default — barrel
import { listEmails, getEmailById } from "@repo/database/queries/emails";

// Fine-grained (handig in pipeline routes om bundle klein te houden)
import { getEmailForPipelineInput } from "@repo/database/queries/emails/pipeline";
```

## Types

`EmailFilterStatus` woont in `lists.ts` (eerste consumer) en wordt door
`detail.ts` geïmporteerd via `./lists`. Re-export gaat via de barrel.

## Mutations

Schrijf-helpers staan in `@repo/database/mutations/emails.ts` (nog flat,
75 regels — onder de drempel).
