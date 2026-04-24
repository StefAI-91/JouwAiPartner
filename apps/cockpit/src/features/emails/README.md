# Emails feature

Gmail-inbox integratie: inkomende emails van klanten en interne partijen
worden automatisch opgehaald, geclassificeerd (type + party) en door
AI-agents doorzocht op action-items, decisions en needs. Net als
meetings: draft → review → verified.

Volledig verticaal sinds de emails-migratie (commits `b1e00f0`,
`e720c99`, `b9a6ae7`).

## Structuur

```
features/emails/
  ├─ actions/        (4 files + index.ts)
  ├─ components/     (14 files, GEEN index.ts)
  └─ validations/    (3 files + index.ts)
```

**Geen hooks-map** — emails heeft (nog) geen client-side form-state-hooks.
Zodra die nodig zijn, komen ze in `features/emails/hooks/`.

**Waarom een barrel per laag behalve components?** Actions en
validations zijn homogeen (allemaal `"use server"` of pure Zod).
Components mixen client + server via transitive imports — een barrel-
file daar breekt Next.js' client/server-scheiding. Zie de skill
`feature-folder-migrate` voor de theorie.

---

## Menu — actions (server actions)

Import-pad: `@/features/emails/actions`

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
| `updateEmailPartyTypeAction(input)`    | party-type (internal, client, partner, other)            |

### Filter (`filter.ts`)

| Actie                        | Wat hij doet                                     |
| ---------------------------- | ------------------------------------------------ |
| `unfilterEmailAction(input)` | eerder weggefilterde email terugzetten als draft |

**Totaal:** 10 acties. Alle met admin-guard → Zod-validatie → Supabase-
mutation → revalidatePaths. Return `{ success: true }` of `{ error: string }`.

## Menu — validations

Import-pad: `@/features/emails/validations`

**Review-schemas** (in `email-review.ts`):

- `verifyEmailSchema` — approve-zoals-hij-is
- `verifyEmailWithEditsSchema` — approve met edits per extraction
- `rejectEmailSchema` — afwijzen

**Links-schemas** (in `email-links.ts`):

- `emailProjectSchema` — project link/unlink
- `emailOrganizationSchema` — organisatie toewijzen
- `emailSenderPersonSchema` — persoon koppelen
- `emailTypeSchema` — email-type + allowed values
- `emailPartyTypeSchema` — party-type + allowed values

## Menu — components

**Geen index.ts.** Consumers importeren direct per specifieke component:

```ts
import { EmailReviewCard } from "@/features/emails/components/email-review-card";
```

### Review-scherm

| Component           | Props (interface) | Doel                           |
| ------------------- | ----------------- | ------------------------------ |
| `EmailReviewCard`   | `{ email }`       | compacte kaart in review-queue |
| `EmailReviewDetail` | `{ email }`       | detail-view voor reviewen      |

### Lijst + detail

| Component         | Props (interface)           | Doel                                           |
| ----------------- | --------------------------- | ---------------------------------------------- |
| `EmailList`       | `{ emails, direction }`     | lijst inkomend/uitgaand                        |
| `EmailLinkEditor` | `{ email, ... }`            | metadata-edit-panel                            |
| `FilteredBanner`  | `{ emailId, filterReason }` | banner "weggefilterd, klik om terug te zetten" |

### Link-selectors (voor metadata-edits)

| Component              | Props (interface)                                    |
| ---------------------- | ---------------------------------------------------- |
| `ProjectLinker`        | `{ emailId, linkedProjects, allProjects }`           |
| `OrganizationSelector` | `{ emailId, currentOrganization, allOrganizations }` |
| `SenderPersonSelector` | `{ emailId, currentPerson, allPeople }`              |
| `PartyTypeSelector`    | `{ emailId, currentType }`                           |
| `EmailTypeSelector`    | `{ emailId, currentType }`                           |

### Bulk-tools / settings

| Component              | Props (interface)  | Doel                                      |
| ---------------------- | ------------------ | ----------------------------------------- |
| `SyncButton`           | `—`                | handmatige Gmail-sync triggeren           |
| `ProcessPendingButton` | `{ pendingCount }` | gatekeeper-pipeline voor wachtende emails |
| `ReclassifyButton`     | `—`                | herclassificeer bestaande emails          |
| `GoogleAccountStatus`  | `{ accounts }`     | OAuth-status per geconnecteerd account    |

---

## Import-patterns voor consumers

### Server components / Server Actions

```ts
import { approveEmailAction } from "@/features/emails/actions";
import type { EmailRow } from "@repo/database/queries/emails";
```

### Client components

```ts
"use client";

import { EmailReviewCard } from "@/features/emails/components/email-review-card";
import { emailProjectSchema } from "@/features/emails/validations";
```

### Tests (integration)

```ts
const mod = await import("../../src/features/emails/actions/review");
```

---

## Gerelateerde packages (horizontaal, blijven daar)

Deze code hoort NIET in deze feature — wordt gedeeld door cockpit + MCP +
toekomstige apps:

| Locatie                                     | Wat                                              |
| ------------------------------------------- | ------------------------------------------------ |
| `@repo/database/queries/emails`             | email-queries (list, detail, pending)            |
| `@repo/database/mutations/emails`           | insert/update/delete                             |
| `@repo/ai/agents/email-extractor`           | LLM-extractie van action-items + decisions       |
| `@repo/ai/agents/email-classifier`          | type-classificatie                               |
| `@repo/ai/pipeline/email/core`              | volledige email-pipeline (sync + extract + save) |
| `@repo/ai/pipeline/email/filter-gatekeeper` | nieuwsbrieven eruit filteren                     |
| `@repo/ai/pipeline/email/pre-classifier`    | pre-filter op type                               |
| `@repo/ai/gmail`                            | Gmail API wrapper + OAuth                        |

Als je een query/mutation toevoegt voor emails: plaats hem in packages/,
niet hier.

> Let op: `packages/ai/pipeline/email-*.ts` zijn nog platte files met
> een prefix. Kandidaat voor een toekomstige **variant B**-groepering
> (packages submap-per-domein) via de `feature-folder-migrate` skill:
> `packages/ai/pipeline/email/` met index.ts.

---

## Database

Schema: `emails`, `email_extractions`, `email_filter_rules` (en gerelateerd
`google_accounts` voor OAuth-state).

Status-flow: `pending` → `draft` → `verified` / `rejected` / `filtered`.

---

## Routes (blijven in app/, Next.js dicteert)

- `/emails` — lijst (inkomend/uitgaand, filtering per type/party)
- `/emails/[id]` — detail page met metadata-editors + extractions
- `/review` — review queue (consumeert `EmailReviewCard`)
- `/review/email/[id]` — email-review-detail

## AI-pipeline

Inkomende emails doorlopen deze stappen (zie `packages/ai/pipeline/`):

1. **Sync** — Gmail API haalt nieuwe berichten op (via `@repo/ai/gmail`)
2. **Pre-classify** — snelle filter op bulk-type (nieuwsbrief, promo)
3. **Filter-gatekeeper** — bevestigt of email relevant is
4. **Classify** — email-classifier bepaalt `email_type` + `party_type`
5. **Extract** — email-extractor haalt action-items, decisions, needs eruit
6. **Save** — als `draft` status, wacht op human review
7. **Review** (in deze feature) — approve → verified, reject → rejected

---

## Design decisions

### Waarom components géén barrel

Lesson uit themes-migratie (zie skill `feature-folder-migrate` les #2):
barrel-files in de components-laag trekken bij Next.js-builds server-code
de client-bundle in. Consumers importeren daarom direct per specifieke
component.

### Geen hooks-map

Emails heeft (nog) geen eigen React hooks. Form-state in de selectors
wordt lokaal met `useState` + `useTransition` beheerd — geen gedeelde
form-logica zoals bij themes (`useThemeFormState`).

Zodra er client-side patterns ontstaan die je in 2+ components hergebruikt,
komt er een hooks-map met een eigen deur-bestand.

### Validations per domein gesplitst

`validations/` heeft twee files (`email-links.ts` + `email-review.ts`) in
plaats van één gebundeld bestand zoals bij themes. De domeinen (linken versus
reviewen) zijn groot genoeg om gescheiden te houden.

---

## Tests

Locatie: `apps/cockpit/__tests__/actions/` — integration-tests per domein
(link-actions en approve/reject flows).

## Migratie-historie

| Commit    | Wat                                                     |
| --------- | ------------------------------------------------------- |
| `bfe2e78` | stap 1 schoonmaak — email-filter/links/review in submap |
| `b1e00f0` | validations naar features/emails/                       |
| `e720c99` | actions naar features/emails/                           |
| `b9a6ae7` | components naar features/emails/                        |

Zie `.claude/skills/feature-folder-migrate/` voor het reusable draaiboek.
