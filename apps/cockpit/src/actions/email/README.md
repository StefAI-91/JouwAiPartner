# Email actions

Server actions voor email-lifecycle: review/approve/reject, metadata-edits
(organisatie, persoon, project, type), filter-toggle.

> **Status:** nog geen verticale feature-folder. De actions zitten
> gegroepeerd hier, maar components en types staan nog elders. Zie
> "Waar leeft de rest van email" hieronder. Wordt waarschijnlijk later
> gemigreerd naar `features/email/` via de
> [`feature-folder-migrate`](../../../../../.claude/skills/feature-folder-migrate/SKILL.md)
> skill.

## Menu — actions

Import-pad: `@/actions/email`

### Review-flow (`review.ts`)

| Actie                                | Wat hij doet                                       |
| ------------------------------------ | -------------------------------------------------- |
| `approveEmailAction(input)`          | email goedkeuren zoals hij is                      |
| `approveEmailWithEditsAction(input)` | email goedkeuren met inline edits op extractions   |
| `rejectEmailAction(input)`           | email afwijzen (draft blijft, wordt niet verified) |

### Metadata-links (`links.ts`)

| Actie                                  | Wat hij doet                                             |
| -------------------------------------- | -------------------------------------------------------- |
| `linkEmailProjectAction(input)`        | email aan project koppelen                               |
| `unlinkEmailProjectAction(input)`      | project-link verwijderen                                 |
| `updateEmailOrganizationAction(input)` | organisatie toewijzen/wijzigen                           |
| `updateEmailSenderPersonAction(input)` | afzender-persoon koppelen                                |
| `updateEmailTypeAction(input)`         | email-type instellen (project_communication, sales, ...) |
| `updateEmailPartyTypeAction(input)`    | party-type (internal, client, ...)                       |

### Filter (`filter.ts`)

| Actie                        | Wat hij doet                                     |
| ---------------------------- | ------------------------------------------------ |
| `unfilterEmailAction(input)` | eerder weggefilterde email terugzetten als draft |

**Totaal:** 10 acties. Alle met admin-guard → Zod-validatie → Supabase-
mutation → revalidatePaths.

---

## Waar leeft de rest van email

Email-code is momenteel verspreid over 4 mappen:

| Laag                  | Locatie                                                                                                   | Wat                                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Actions**           | `apps/cockpit/src/actions/email/`                                                                         | deze map (met index.ts-deur)                                                                                             |
| **Components**        | `apps/cockpit/src/components/emails/`                                                                     | sender-person-selector, project-linker, party-type-selector, organization-selector, email-type-selector, filtered-banner |
| **Review components** | `apps/cockpit/src/components/review/`                                                                     | `email-review-card.tsx`, `email-review-detail.tsx`                                                                       |
| **Queries/Mutations** | `@repo/database/queries/emails`, `@repo/database/mutations/emails`                                        | horizontaal — blijft in packages ook na een eventuele verticale migratie                                                 |
| **AI extraction**     | `@repo/ai/agents/email-extractor`, `@repo/ai/agents/email-classifier`, `@repo/ai/pipeline/email-pipeline` | horizontaal — blijft in packages                                                                                         |
| **Routes**            | `apps/cockpit/src/app/(dashboard)/emails/`                                                                | Next.js App Router — blijft in app/                                                                                      |

---

## Import-patterns voor consumers

### Server components / Server Actions

```ts
import { approveEmailAction } from "@/actions/email";
```

### Client components

```ts
"use client";

import { approveEmailAction } from "@/actions/email";
import { SenderPersonSelector } from "@/components/emails/sender-person-selector";
```

### Tests (integration)

```ts
const mod = await import("../../src/actions/email/links");
// Let op: tests verwijzen nog naar specifieke sub-files
// (email/links, email/review, email/filter) — niet via de deur
```

---

## Gerelateerde packages (horizontaal, blijven daar)

| Locatie                                     | Wat                                        |
| ------------------------------------------- | ------------------------------------------ |
| `@repo/database/queries/emails`             | email-queries (list, detail)               |
| `@repo/database/mutations/emails`           | insert/update/delete                       |
| `@repo/ai/agents/email-extractor`           | LLM-extractie van action-items + decisions |
| `@repo/ai/agents/email-classifier`          | type-classificatie                         |
| `@repo/ai/pipeline/email-pipeline`          | volledige email-pipeline                   |
| `@repo/ai/pipeline/email-filter-gatekeeper` | nieuwsbrieven eruit filteren               |
| `@repo/ai/pipeline/email-pre-classifier`    | pre-filter op type                         |
| `@repo/ai/gmail`                            | Gmail API wrapper                          |

Als je een query/mutation toevoegt voor emails: plaats hem in packages/,
niet hier.

---

## Toekomst: verticaliseren?

Om email een complete feature-folder (zoals themes) te maken:

**Wel meeverhuizen** (naar `features/email/`):

- Deze actions-map (`actions/email/` → `features/email/actions/`)
- `components/emails/` → `features/email/components/`
- `components/review/email-review-*` → `features/email/components/`
- Hooks en validations, mocht er iets specifiek voor emails bestaan

**NIET meeverhuizen:**

- `@repo/database/queries/emails` + mutations (horizontaal, shared)
- `@repo/ai/agents/email-*` + pipeline (horizontaal, shared)
- `app/(dashboard)/emails/` routes (Next.js dicteert)

De blast radius zou vergelijkbaar zijn met themes (~20-30 files + imports).
De skill [`feature-folder-migrate`](../../../../../.claude/skills/feature-folder-migrate/SKILL.md)
dekt het exacte proces.

---

## Design note

Deze submap is ontstaan uit de architectuur-schoonmaak van stap 1 (commit
`bfe2e78` op 2026-04-24): de oude platte files `email-filter.ts`,
`email-links.ts`, `email-review.ts` zijn verhuisd naar deze `email/`
submap met een `index.ts`-deur, omdat drie bij elkaar horende files
impliciet al een submap-domein waren.
