# Themes feature

Eerste-klas concept in jullie platform: cross-cutting thema's die
automatisch uit meetings worden gedetecteerd (door de Theme-Detector
agent), gereviewed door admins, en zichtbaar zijn op de dashboard, de
theme detail page, en bij meeting-reviews.

Eerste volledig-verticale feature (migratie compleet op 2026-04-24). Dient
als referentie voor andere features die nog volgen.

## Structuur

```
features/themes/
  ├─ actions/        (4 files + index.ts)
  ├─ components/     (14 files, GEEN index.ts)
  ├─ hooks/          (1 file + index.ts)
  └─ validations/    (1 file + index.ts)
```

**Waarom deur (`index.ts`) per laag behalve components?** Actions/hooks/
validations zijn homogeen (allemaal `"use server"`, allemaal client-only,
pure Zod). Components mixen client + server via transitive imports — een
barrel-file daar breekt Next.js' client/server-scheiding. Zie
`docs/specs/architectuur/` sketches deel 1-3 voor de theorie.

---

## Menu — actions (server actions)

Import-pad: `@/features/themes/actions`

| Actie                                  | Wat hij doet                                           |
| -------------------------------------- | ------------------------------------------------------ |
| `updateThemeAction(input)`             | naam/beschrijving/emoji/guide bijwerken                |
| `archiveThemeAction(input)`            | thema archiveren                                       |
| `canEditThemesAction()`                | check of huidige user bewerkrecht heeft                |
| `createVerifiedThemeAction(input)`     | nieuw verified thema aanmaken (dev-pad)                |
| `approveThemeAction(input)`            | emerging thema goedkeuren (met optionele inline edits) |
| `rejectEmergingThemeAction(input)`     | emerging thema afwijzen                                |
| `rejectThemeMatchAction(input)`        | match tussen meeting ↔ thema afwijzen                  |
| `confirmThemeProposalAction(input)`    | theme-proposal bevestigen                              |
| `rejectThemeProposalAction(input)`     | theme-proposal afwijzen                                |
| `regenerateMeetingThemesAction(input)` | AI opnieuw thema-links laten bepalen voor een meeting  |

Alle 10 acties: admin-guard → Zod-validatie → Supabase-mutation →
revalidatePaths. Return `{ success: true }` of `{ error: string }`.

## Menu — hooks

Import-pad: `@/features/themes/hooks`

| Export                             | Type         | Doel                                               |
| ---------------------------------- | ------------ | -------------------------------------------------- |
| `useThemeFormState(initial)`       | React hook   | client-side form-state voor edit/approve-forms     |
| `computeCanSubmit(values)`         | pure functie | "mag deze form submitten?" — testbaar zonder React |
| `computeIsDirty(initial, current)` | pure functie | "zijn er ongewijzigde velden?"                     |

Hook en helpers delen de constanten uit `../validations` zodat client-side
check en server-side Zod-schema's identiek zijn.

## Menu — validations

Import-pad: `@/features/themes/validations`

**Zod-schemas (input-validators):**

- `updateThemeSchema`, `archiveThemeSchema`, `createVerifiedThemeSchema`
- `approveThemeSchema`, `rejectEmergingThemeSchema`, `rejectThemeMatchSchema`
- `confirmThemeProposalSchema`, `rejectThemeProposalSchema`
- `regenerateMeetingThemesSchema`, `runDevDetectorSchema`

**TypeScript input-types** (1-op-1 met de actions):

- `UpdateThemeInput`, `ArchiveThemeInput`, `ApproveThemeInput`, ...

**Grenzen-constanten:**

- `THEME_NAME_MIN`, `THEME_NAME_MAX`
- `THEME_DESC_MIN`, `THEME_DESC_MAX`
- `THEME_GUIDE_MIN`

**Rejection-reasons:**

- `REJECTION_REASONS` (4 opties: `niet_substantieel`, `geen_eigen_gesprek`,
  `verkeerde_thema`, `anders`)
- `RejectionReason` type

Eén bron van waarheid: dezelfde constanten worden gebruikt door de hook
(client-side check), de Zod-schemas (server-side check) en de components
(validation-feedback).

## Menu — components

**Geen index.ts.** Consumers importeren direct per specifieke component:

```ts
import { ThemeEditForm } from "@/features/themes/components/theme-edit-form";
```

| Component                | Props (interface)             | Doel                                 |
| ------------------------ | ----------------------------- | ------------------------------------ |
| `ThemeEditForm`          | `{ theme, onDone, onCancel }` | inline edit-form op detail page      |
| `ThemeApprovalCard`      | `{ theme }`                   | emerging thema approve/reject kaart  |
| `ThemeHeader`            | `{ theme, mentions30d }`      | header op detail page                |
| `ThemePill`              | `{ theme }`                   | klikbare pill (emoji + naam + badge) |
| `ThemePillsStrip`        | `{ themes }`                  | rij van pills op dashboard           |
| `ThemePillsSkeleton`     | `—`                           | loading state                        |
| `TimeSpentDonut`         | `{ slices }`                  | donut-grafiek per thema              |
| `TimeSpentDonutSection`  | `{ distribution }`            | donut + legenda wrapper              |
| `TimeSpentDonutSkeleton` | `—`                           | loading state                        |
| `EmergingThemesSection`  | `{ themes }`                  | sectie op review-queue               |
| `MatchRejectPopover`     | `{ meetingId, themeId }`      | popover om theme-match af te wijzen  |
| `EmojiPickerPopover`     | `{ value, onChange }`         | emoji-kiezer voor thema's            |

Plus twee helpers voor de donut:

- `buildSegments(slices)` — slice → SVG segment-berekening
- `DONUT_PALETTE` — 10-kleurenpalet

---

## Import-patterns voor consumers

### Server components / Server Actions

```ts
import { updateThemeAction } from "@/features/themes/actions";
import type { ThemeRow } from "@repo/database/queries/themes";
```

### Client components

```ts
"use client";

import { ThemeEditForm } from "@/features/themes/components/theme-edit-form";
import { useThemeFormState } from "@/features/themes/hooks";
import { THEME_NAME_MIN } from "@/features/themes/validations";
```

### Tests (integration)

```ts
const mod = await import("../../src/features/themes/actions");
const { updateThemeAction } = mod;
```

---

## Gerelateerde packages (horizontaal, blijven daar)

Deze code hoort NIET in deze feature — wordt gedeeld door cockpit + MCP +
toekomstige apps:

| Locatie                                      | Wat                                 |
| -------------------------------------------- | ----------------------------------- |
| `@repo/database/queries/themes`              | publieke deur — alle exports samen  |
| `@repo/database/queries/themes/review`       | emerging + proposals (fine-grained) |
| `@repo/database/queries/themes/detail`       | detail-page queries (fine-grained)  |
| `@repo/database/queries/themes/dashboard`    | time-spent stats (fine-grained)     |
| `@repo/database/queries/meeting-themes`      | cross-tabel                         |
| `@repo/database/mutations/themes`            | insert/update/archive               |
| `@repo/database/mutations/meeting-themes`    | link/clear/recalc                   |
| `@repo/database/mutations/extraction-themes` | link aan extractions                |
| `@repo/ai/agents/theme-detector`             | runThemeDetector + prompt           |
| `@repo/ai/agents/theme-emojis`               | emoji-catalogus                     |
| `@repo/ai/pipeline/steps/theme-detector`     | pipeline-stap                       |
| `@repo/ai/pipeline/steps/link-themes`        | pipeline-stap                       |
| `@repo/ai/pipeline/tagger`                   | theme-annotatie parser              |

Als je een query/mutation toevoegt voor themes: plaats hem in packages/,
niet hier.

## Database

Schema: `themes`, `emerging_themes`, `meeting_themes`, `extraction_themes`,
`theme_match_rejections`.

Migraties: `supabase/migrations/202604221*.sql` en `202604231*.sql`.

Seed: `supabase/seed/themes.sql`.

---

## Routes (blijven in app/, Next.js dicteert)

- `/themes/[slug]` — detail page (consumeert `ThemeHeader`, `ThemeEditForm`,
  tabs)
- `/dashboard` — dashboard (consumeert `ThemePillsStrip`,
  `TimeSpentDonutSection`)
- `/review` — review queue (consumeert `EmergingThemesSection`)
- `/dev/detector` — dev sandbox voor Theme-Detector (consumeert
  `createVerifiedThemeAction`)

## Design decisions

### Waarom components géén barrel

De Next.js build faalde in substap 2c toen we `features/themes/components/
index.ts` hadden: de client component `meetings-tab.tsx` importeerde
`MatchRejectPopover` via de barrel en trok daarmee transitief
`@repo/database/supabase/server.ts` de client-bundle in.

Oplossing: directe imports per specifieke component. Bulletproof React's
regel "no barrel files" is hier dwingend.

### Waarom actions, hooks, validations wél een barrel

Die lagen zijn homogeen: alle actions zijn `"use server"` (Next.js
scheidt ze automatisch), alle hooks zijn client-only, validations is
pure Zod. Geen transitive leak mogelijk.

### `dev-detector.ts` blijft plat

Dev-sandbox actie (`actions/dev-detector.ts`) blijft in de platte actions-
map, importeert wel `runDevDetectorSchema` uit deze feature via
`@/features/themes/validations`. Niet-productieve tool, hoort niet in de
feature-folder maar gebruikt wél de feature-validations.

### Theme-lab verwijderd

De sandbox `app/(dashboard)/theme-lab/` (9 files) is in substap 2d
verwijderd — experimentele UI-varianten zonder productie-waarde.

---

## Tests

Locatie: `apps/cockpit/__tests__/`

- `actions/themes.test.ts` — CRUD-action tests (dynamic import)
- `actions/themes-review.test.ts` — review-action tests
- `actions/themes-proposals.test.ts` — proposals tests
- `hooks/use-theme-form-state.test.ts` — pure helpers (`computeCanSubmit`,
  `computeIsDirty`)
- `components/donut-segments.test.ts` — `buildSegments()` met palette

---

## Migratie-historie

| Substap | Commit    | Wat                               |
| ------- | --------- | --------------------------------- |
| 2a      | `77a0337` | validations + hooks verhuisd      |
| 2b      | `98a397d` | actions verhuisd                  |
| 2c      | `542efd6` | components verhuisd (geen barrel) |
| 2d      | `35e79ff` | theme-lab sandbox verwijderd      |

Zie `.claude/skills/feature-folder-migrate/` voor het reusable draaiboek.
