# Micro Sprint TH-8: Cleanup majors (DRY, SRP, query-efficiency)

## Doel

Acht major findings uit de quality-review oplossen die op korte termijn werken maar bij groei (meer themes, meer matches, meer features die slugs/whitelist nodig hebben) ofwel performance-bugs ofwel maintenance-drift veroorzaken. Na deze sprint: één source-of-truth voor admin-guard, denormalized stats worden daadwerkelijk gebruikt, dashboard doet één DB-call waar het twee deed, detail-page tabs via nested joins, form-state gedeeld, en `queries/themes.ts` gesplitst in 4 coherente files. Geen nieuwe user-facing features — alleen onderhoud.

## Requirements

| ID         | Beschrijving                                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| FIX-TH-801 | `requireThemeApprover` verwijderd; `requireAdminInAction()` uit `@repo/auth/access` gebruikt in alle 4 theme Server Actions |
| FIX-TH-802 | `createEmergingTheme` + `slugify` verhuisd van `mutations/meeting-themes.ts` naar `mutations/themes.ts` (SRP)               |
| FIX-TH-803 | `slugify` als gedeelde helper in `packages/database/src/lib/slugify.ts` (herbruikbaar voor toekomstige entities)            |
| FIX-TH-804 | Dashboard-fetch consolidatie: 1× `fetchWindowAggregation` voor pills + donut i.p.v. 2× parallel                             |
| FIX-TH-805 | `listTopActiveThemes` + `getThemeShareDistribution` gebruiken denormalized `mention_count` via DB-filter + order + limit    |
| FIX-TH-806 | `getThemeDecisions` + `getThemeParticipants` gemergde of nested-relational fetch i.p.v. 2 roundtrips                        |
| FIX-TH-807 | `useThemeFormState` hook in `apps/cockpit/src/hooks/` — hergebruikt door `theme-edit-form` + `theme-approval-card`          |
| FIX-TH-808 | `queries/themes.ts` gesplitst in 4 files (base / dashboard / detail / review) elk onder 200 regels                          |
| FIX-TH-809 | Index `meeting_themes_created_at_idx` op `(created_at DESC)` toegevoegd via migration                                       |

## Bronverwijzingen

- Quality-review output uit in-conversation agents (query-efficiency + DRY + quality-checker)
- CLAUDE.md → §Architectuur (SRP, splits bij ~150 regels), §Database & Queries (denormalize, geen N+1)
- `packages/auth/src/access.ts` — bestaande `requireAdminInAction` + `isAdmin`

## Context

### FIX-TH-801 — één whitelist-helper

Nu zit `requireThemeApprover()` in `apps/cockpit/src/actions/themes.ts:43-50`. Dat dupliceert functioneel wat `requireAdminInAction()` uit `@repo/auth/access` al doet. Risico: bij toekomstige role-tweaks (bv. een "theme-editor" rol) loopt één van de twee paden achter.

```ts
// apps/cockpit/src/actions/themes.ts — voor elk van de 4 actions:
const guard = await requireAdminInAction();
if ("error" in guard) return { error: guard.error };
// guard.user.id beschikbaar voor verified_by / rejected_by / etc.
```

Vervolgens: verwijder `requireThemeApprover`, strip de import.

### FIX-TH-802 / FIX-TH-803 — SRP + shared slugify

`createEmergingTheme` in `mutations/meeting-themes.ts:67-90` muteert de `themes`-tabel — dat hoort in `mutations/themes.ts`. `slugify` (lijnen 204-212) is een generieke helper die straks ook voor andere entity-slugs nuttig is.

Structuur na fix:

```
packages/database/src/
├── lib/slugify.ts                — export function slugify(name: string): string
├── mutations/themes.ts           — insertTheme, updateTheme, archiveTheme, createEmergingTheme (verhuisd)
└── mutations/meeting-themes.ts   — linkMeetingToThemes, clearMeetingThemes, deleteMatchesForMeeting,
                                    recalculateThemeStats, rejectThemeMatchAsAdmin
```

Updaten: `packages/ai/src/pipeline/steps/tag-themes.ts` import-path van `createEmergingTheme`.

### FIX-TH-804 + FIX-TH-805 — dashboard-efficiency

Nu roept `apps/cockpit/src/app/(dashboard)/page.tsx` de volgende server-components via `<Suspense>`:

- `ThemePillsStrip` → `listTopActiveThemes()` → `fetchWindowAggregation(30)` → 2 DB-calls
- `TimeSpentDonutSection` → `getThemeShareDistribution()` → `fetchWindowAggregation(30)` → nog eens 2 DB-calls

**Twee-koppen fix:**

**a) Use denormalisatie (FIX-TH-805)** — `themes` heeft al `mention_count` en `last_mentioned_at` die door `recalculate_theme_stats` worden bijgehouden. De pills-query kan simpeler:

```ts
export async function listTopActiveThemes(
  options?: { limit?: number },
  client?: SupabaseClient,
): Promise<TopActiveTheme[]> {
  const limit = options?.limit ?? 8;
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("themes")
    .select("id, slug, name, emoji, mention_count, last_mentioned_at")
    .eq("status", "verified")
    .gt("mention_count", 0)
    .order("mention_count", { ascending: false })
    .order("last_mentioned_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(`top active themes failed: ${error.message}`);
  return (data ?? []).map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    emoji: t.emoji,
    mentions30d: t.mention_count, // denormalisatie: hele-tijd-count; 30d via aparte query als nodig
    lastMentionedAt: t.last_mentioned_at,
  }));
}
```

Caveat: `mention_count` is all-time, niet 30d-window. Voor v1 accepteer je dat (UI-copy aanpassen naar "laatste mentions" zonder de 30d-belofte), of voeg een `mention_count_30d` kolom toe die nightly wordt geupdate. Keuze documenteren in de sprint-execution. Simpelste pad: drop de 30d-belofte in UI, gebruik de denormalisatie.

**b) Share-distribution als aggregate view (FIX-TH-804)** — `getThemeShareDistribution` blijft wél per-window (anders verschuift de UI-semantiek), maar:

```ts
// Nieuwe signatuur accepteert al-opgehaalde aggregation of haalt zelf op
export async function getThemeShareDistribution(
  options?: { windowDays?: number; preloaded?: WindowAggregation },
  client?: SupabaseClient,
): Promise<ThemeShareDistribution> {
  const agg = options?.preloaded ?? await fetchWindowAggregation(...);
  // ... rest
}
```

Dashboard page-component haalt 1× op en geeft mee:

```tsx
// page.tsx
const aggregation = await fetchWindowAggregation(30);  // 1× DB
<ThemePillsStrip preloadedAggregation={aggregation} />
<TimeSpentDonutSection preloadedAggregation={aggregation} />
```

`fetchWindowAggregation` wordt hiervoor public export (niet meer privé).

### FIX-TH-806 — detail-page tabs 2-roundtrips

`getThemeDecisions` + `getThemeParticipants` doen allebei:

1. Fetch `meeting_themes` → meeting_ids
2. Fetch `extractions` / `meeting_participants` met `.in("meeting_id", meetingIds)`

**Fix**: gebruik Supabase relational select, fetch in één roundtrip:

```ts
// getThemeDecisions — één query, geen in-memory filter
const { data } = await db
  .from("meeting_themes")
  .select(
    `
    meeting:meeting_id (
      id, title, date,
      extractions!inner (id, content, created_at)
    )
  `,
  )
  .eq("theme_id", themeId)
  .eq("meeting.extractions.type", "decision");
```

Idem voor participants (`meeting_participants!inner (person_id, person:person_id (id, name))`). Test dat de inner-join geen meetings zonder decisions dropt per ongeluk — of split in één list-meeting-ids + één batched fetch die nog steeds 2 roundtrips is maar dan parallel.

Pragmatische fallback als relational inner joins te fragiel zijn: behoud de 2 roundtrips maar draai ze **parallel** via `Promise.all`, dat scheelt de helft van de latency.

### FIX-TH-807 — form-state hook

`theme-edit-form.tsx:29-45` en `theme-approval-card.tsx:30-39` hebben identieke state (`name`, `description`, `matchingGuide`, `emoji`, `error`) + validatie (`canSubmit = >=2 && >=5 && >=20`).

```ts
// apps/cockpit/src/hooks/use-theme-form-state.ts
import { useState, useMemo } from "react";
import type { ThemeRow } from "@repo/database/queries/themes";
import type { ThemeEmoji } from "@repo/ai/agents/theme-emojis";
import { THEME_NAME_MIN, THEME_DESC_MIN, THEME_GUIDE_MIN } from "@/validations/themes";

export function useThemeFormState(
  initial: Pick<ThemeRow, "name" | "description" | "matching_guide" | "emoji">,
) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [matchingGuide, setMatchingGuide] = useState(initial.matching_guide);
  const [emoji, setEmoji] = useState<ThemeEmoji>(initial.emoji as ThemeEmoji);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      name.trim().length >= THEME_NAME_MIN &&
      description.trim().length >= THEME_DESC_MIN &&
      matchingGuide.trim().length >= THEME_GUIDE_MIN,
    [name, description, matchingGuide],
  );

  const isDirty =
    name !== initial.name ||
    description !== initial.description ||
    matchingGuide !== initial.matching_guide ||
    emoji !== initial.emoji;

  return {
    name,
    setName,
    description,
    setDescription,
    matchingGuide,
    setMatchingGuide,
    emoji,
    setEmoji,
    error,
    setError,
    canSubmit,
    isDirty,
  };
}
```

(Constanten `THEME_NAME_MIN` etc. komen uit TH-9, of je neemt ze in TH-8 mee in het validations-file.)

### FIX-TH-808 — file-split `queries/themes.ts`

Structuur na split:

```
packages/database/src/queries/
├── themes.ts              — ThemeRow type, listVerifiedThemes (+ negatives), getThemeBySlug
├── theme-dashboard.ts     — listTopActiveThemes, getThemeShareDistribution, fetchWindowAggregation (public)
├── theme-detail.ts        — getThemeRecentActivity, getThemeMeetings, getThemeDecisions, getThemeParticipants
└── theme-review.ts        — listEmergingThemes + EmergingThemeRow/ProposalMeeting types
```

Gedeelde types (`ThemeRow`, `THEME_COLUMNS`, `windowStartIso`) verhuizen naar `queries/themes.ts` of `queries/theme-internals.ts`. Alle imports in `apps/cockpit`, `packages/ai` bijwerken.

### FIX-TH-809 — ontbrekende index

`fetchWindowAggregation` doet `.gte("created_at", since)` op `meeting_themes`. Er is geen index op die kolom. Bij 10k+ matches wordt dit merkbaar.

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_meeting_themes_created_at_idx.sql
CREATE INDEX IF NOT EXISTS meeting_themes_created_at_idx
  ON meeting_themes (created_at DESC);
```

## Deliverables

- [ ] Whitelist: `apps/cockpit/src/actions/themes.ts` gebruikt `requireAdminInAction`, `requireThemeApprover` verwijderd
- [ ] `packages/database/src/lib/slugify.ts` — geëxporteerd
- [ ] `packages/database/src/mutations/themes.ts` — `createEmergingTheme` verhuisd
- [ ] `packages/database/src/mutations/meeting-themes.ts` — alleen junction-mutations over
- [ ] `packages/database/src/queries/theme-dashboard.ts`, `theme-detail.ts`, `theme-review.ts` — nieuwe split-files
- [ ] `packages/database/src/queries/themes.ts` — ≤ 200 regels, alleen base-queries
- [ ] `listTopActiveThemes` — DB-order op `mention_count`, geen JS-filter
- [ ] Dashboard page preload van aggregation, 1× DB-call voor pills+donut
- [ ] `getThemeDecisions` + `getThemeParticipants` — relational select OF parallelle `Promise.all`
- [ ] `apps/cockpit/src/hooks/use-theme-form-state.ts` — nieuwe hook
- [ ] `theme-edit-form.tsx` + `theme-approval-card.tsx` — hook geadopteerd
- [ ] `supabase/migrations/YYYYMMDDHHMMSS_meeting_themes_created_at_idx.sql`
- [ ] Tests blijven groen; nieuwe unit-test op `useThemeFormState` (dirty-check + validatie-transities)

## Acceptance criteria

- Grep op `requireThemeApprover` geeft 0 hits
- Geen `.from("themes")` of `.from("meeting_themes")` buiten `packages/database/src/{queries,mutations}`
- `queries/themes.ts` < 200 regels
- Dashboard page doet exact 1 DB-call voor theme-aggregation (Network-tab check + server-log count)
- Detail-page tabs laden in `<meetings_in_theme * 0 + 2>` roundtrips (niet meer × 2 per tab)
- `npm run lint` + `npm run type-check` + `npm run test` alle groen

## Handmatige test-stappen

1. Dashboard openen met getagde meetings → pills + donut renderen zoals voorheen.
2. Supabase log openen tijdens dashboard-load → zie één `fetchWindowAggregation` query.
3. Open theme-detail → Decisions + Mensen tab → tabs laden binnen 1× roundtrip elk (of Promise.all parallel, check met `EXPLAIN ANALYZE` in Studio).
4. Review-page, emerging theme goedkeuren → geen dubbele DB-call voor emerging list.
5. Edit-form én approval-card: wijzig veld → `canSubmit` gedraagt zich identiek in beide.
6. `SELECT * FROM pg_indexes WHERE tablename = 'meeting_themes'` → `meeting_themes_created_at_idx` zichtbaar.

## Out of scope

- Blockers (TH-7)
- Conventies + design-tokens (TH-9)
- Pre-computed `mention_count_30d` nightly job — nu accepteren we all-time `mention_count` in plaats van 30d-window op pills. UI-copy past zich aan.
- Skeleton-component generalisatie (TH-9)
