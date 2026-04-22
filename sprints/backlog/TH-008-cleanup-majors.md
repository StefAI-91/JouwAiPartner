# Micro Sprint TH-008: Cleanup majors (DRY, SRP, query-efficiency)

## Doel

Acht major findings uit de quality-review oplossen die op korte termijn werken maar bij groei (meer themes, meer matches, meer features die slugs/whitelist nodig hebben) ofwel performance-bugs ofwel maintenance-drift veroorzaken. Na deze sprint: één source-of-truth voor admin-guard, denormalized stats worden daadwerkelijk gebruikt, dashboard doet één DB-call waar het twee deed, detail-page tabs via nested joins, form-state gedeeld, en `queries/themes.ts` gesplitst in 4 coherente files. Geen nieuwe user-facing features — alleen onderhoud.

## Requirements

| ID         | Beschrijving                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| FIX-TH-801 | `requireThemeApprover` verwijderd; `requireAdminInAction()` uit `@repo/auth/access` gebruikt in alle 6 theme Server Actions          |
| FIX-TH-802 | `createEmergingTheme` + `slugify` verhuisd van `mutations/meeting-themes.ts` naar `mutations/themes.ts` (SRP)                        |
| FIX-TH-803 | `slugify` als gedeelde helper in `packages/database/src/lib/slugify.ts` (herbruikbaar voor toekomstige entities)                     |
| FIX-TH-804 | Dashboard-fetch consolidatie: 1× `fetchWindowAggregation(30)` in page, doorgegeven als `preloaded` aan pills + donut (4→2 DB-calls)  |
| FIX-TH-805 | `fetchWindowAggregation` gebruikt denormalized `mention_count > 0` pre-filter om archived/zero-mention themes efficiënter te skippen |
| FIX-TH-806 | `getThemeDecisions` + `getThemeParticipants` gemergde of nested-relational fetch i.p.v. 2 roundtrips                                 |
| FIX-TH-807 | `useThemeFormState` hook in `apps/cockpit/src/hooks/` — hergebruikt door `theme-edit-form` + `theme-approval-card`                   |
| FIX-TH-808 | `queries/themes.ts` gesplitst in 4 files (base / dashboard / detail / review) elk onder 200 regels                                   |
| FIX-TH-809 | Index `meeting_themes_created_at_idx` op `(created_at DESC)` toegevoegd via migration                                                |

## Bronverwijzingen

- Quality-review output uit in-conversation agents (query-efficiency + DRY + quality-checker)
- CLAUDE.md → §Architectuur (SRP, splits bij ~150 regels), §Database & Queries (denormalize, geen N+1)
- `packages/auth/src/access.ts` — bestaande `requireAdminInAction` + `isAdmin`

## Context

### FIX-TH-801 — één whitelist-helper

Nu zit `requireThemeApprover()` in `apps/cockpit/src/actions/themes.ts:43-50`. Dat dupliceert functioneel wat `requireAdminInAction()` uit `@repo/auth/access` al doet. Risico: bij toekomstige role-tweaks (bv. een "theme-editor" rol) loopt één van de twee paden achter.

**Signatuur-aanpassing:** `requireAdminInAction()` retourneert `{ user: { id, email } } | { error }`. Mijn codepaden gebruiken nu `guard.userId` — na migratie wordt dat `guard.user.id`.

```ts
// apps/cockpit/src/actions/themes.ts — voor elk van de 6 actions:
const guard = await requireAdminInAction();
if ("error" in guard) return { error: guard.error };
// guard.user.id beschikbaar voor verified_by / rejected_by / etc.
```

**Precedent:** `apps/cockpit/src/actions/team.ts` gebruikt al `requireAdminInAction` uit `@repo/auth/access` (3× patroon); exact datzelfde toepassen.

Zes call-sites aanpassen: `updateThemeAction`, `archiveThemeAction`, `approveThemeAction`, `rejectEmergingThemeAction`, `rejectThemeMatchAction`, `regenerateMeetingThemesAction`. Vervolgens: verwijder `requireThemeApprover` helper + strip de imports (`getAuthenticatedUser`, `isAdmin`) die er voor waren.

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

### FIX-TH-804 + FIX-TH-805 — dashboard-efficiency (shared aggregation)

Nu roept `apps/cockpit/src/app/(dashboard)/page.tsx` de volgende server-components via `<Suspense>`:

- `ThemePillsStrip` → `listTopActiveThemes()` → `fetchWindowAggregation(30)` → 2 DB-calls
- `TimeSpentDonutSection` → `getThemeShareDistribution()` → `fetchWindowAggregation(30)` → nog eens 2 DB-calls

**Keuze (review-vastgesteld):** de 30d-semantiek blijft intact — UI-copy zegt expliciet "laatste 30 dagen" op 4 plekken (theme-pills-strip kop, theme-pill badge, donut aria-label, donut "30 dgn" badge) en dat verliezen is duur en verliest informatie. Een `mention_count_30d` kolom + nightly job is te veel werk voor cleanup. Daarom: **shared aggregation**.

**Implementatie:**

1. **`fetchWindowAggregation` wordt public export** (nu privé in `queries/themes.ts:158`). Na file-split (FIX-TH-808) landt hij in `queries/theme-dashboard.ts`.

2. **Beide dashboard-queries accepteren een `preloaded`-parameter:**

   ```ts
   export async function listTopActiveThemes(
     options?: { limit?: number; windowDays?: number; preloaded?: WindowAggregation },
     client?: SupabaseClient,
   ): Promise<TopActiveTheme[]> {
     const agg =
       options?.preloaded ?? (await fetchWindowAggregation(options?.windowDays ?? 30, client));
     // rest ongewijzigd: in-JS aggregeren uit `agg.themes` + `agg.junctionRows`
   }

   export async function getThemeShareDistribution(
     options?: { windowDays?: number; preloaded?: WindowAggregation },
     client?: SupabaseClient,
   ): Promise<ThemeShareDistribution> {
     const agg =
       options?.preloaded ?? (await fetchWindowAggregation(options?.windowDays ?? 30, client));
     // rest ongewijzigd
   }
   ```

3. **Dashboard page-component haalt 1× op en geeft mee:**

   ```tsx
   // page.tsx
   const aggregation = await fetchWindowAggregation(30);
   // ... in de JSX:
   <Suspense fallback={<ThemePillsSkeleton />}>
     <ThemePillsStrip preloadedAggregation={aggregation} />
   </Suspense>
   <Suspense fallback={<TimeSpentDonutSkeleton />}>
     <TimeSpentDonutSection preloadedAggregation={aggregation} />
   </Suspense>
   ```

4. **`WindowAggregation` type exporteren** uit `theme-dashboard.ts` zodat page + components dezelfde shape kennen.

**FIX-TH-805 — denormalisatie als pre-filter:** binnen `fetchWindowAggregation` de themes-select nu ongefilterd (`.eq("status","verified")`). Toevoeging: `.gt("mention_count", 0)` — themes die nooit een match hadden komen dan helemaal niet uit de DB. Verified themes met zero matches zijn een no-op voor pills én donut (`counts.get(t.id) ?? 0 = 0` wordt al weggefilterd), maar skippen op DB-niveau scheelt bytes en sorteerwerk als de catalog groeit.

**Netto:** dashboard-aggregatie gaat van 4 DB-calls → 2 DB-calls. UI-copy en field-naam `mentions30d` blijven intact.

### FIX-TH-806 — detail-page tabs 2-roundtrips

`getThemeDecisions` (regels 394-434) en `getThemeParticipants` (regels 508-558) doen allebei:

1. Fetch `meeting_themes` → meeting_ids
2. Fetch `extractions` / `meeting_participants` met `.in("meeting_id", meetingIds)`

Beide query-functies zijn intern sequentieel. Omdat de tweede query afhangt van `meeting_ids` uit de eerste, kunnen die **binnen** de functie niet parallel. Maar de detail-page (`theme-detail/page.tsx`) roept beide functies sequentieel aan — dáár zit de winst.

**Fix (pragmatisch, review-vastgesteld):** behoud de 2 roundtrips binnen elke functie (relational select met `!inner` is fragiel en kan meetings zonder decisions/participants stil droppen). Maak wel **de aanroep in de detail-page parallel** via `Promise.all`. Dat scheelt één queue-positie tijd op elke page-load.

```tsx
// apps/cockpit/src/app/(dashboard)/themes/[slug]/page.tsx
const [activity, meetings, decisions, participants] = await Promise.all([
  getThemeRecentActivity(theme.id, { windowDays: 30 }),
  getThemeMeetings(theme.id),
  getThemeDecisions(theme.id),
  getThemeParticipants(theme.id),
]);
```

Controleer eerst of `page.tsx` ze al in `Promise.all` staan (agent 2 suggereert dat dit gedeeltelijk al zo is) — pas aan wat nog sequentieel is. Relational-select blijft out-of-scope voor deze sprint; die optimalisatie kan in TH-9 terug als nodig.

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

**Constanten-besluit (review-vastgesteld):** de magic numbers (`2/5/20`) staan nu hardcoded in `apps/cockpit/src/validations/themes.ts` binnen de Zod-schemas. In TH-008 introduceren we de constanten direct in datzelfde bestand — geen aparte `constants/`-folder nodig, en Zod-schemas gebruiken ze ook zodat er maar één bron van waarheid is.

```ts
// apps/cockpit/src/validations/themes.ts
export const THEME_NAME_MIN = 2;
export const THEME_DESC_MIN = 5;
export const THEME_GUIDE_MIN = 20;

// dan in de schemas:
name: z.string().min(THEME_NAME_MIN).max(50),
// ...
```

**Hooks-folder:** `apps/cockpit/src/hooks/` bestaat nog niet — maak aan met de nieuwe hook als eerste bestand.

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
-- supabase/migrations/20260422120000_meeting_themes_created_at_idx.sql
CREATE INDEX IF NOT EXISTS meeting_themes_created_at_idx
  ON meeting_themes (created_at DESC);
```

**Eerstvolgende timestamp:** `20260422120000` (na TH-007 `20260422110000_theme_stats_rpc.sql`).

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
- [ ] `supabase/migrations/20260422120000_meeting_themes_created_at_idx.sql`
- [ ] `apps/cockpit/src/validations/themes.ts` — `THEME_NAME_MIN`/`_DESC_MIN`/`_GUIDE_MIN` constanten geëxporteerd + Zod-schemas gebruiken ze
- [ ] `packages/ai/src/pipeline/steps/tag-themes.ts` — import `createEmergingTheme` uit `mutations/themes` i.p.v. `mutations/meeting-themes`
- [ ] `packages/ai/__tests__/pipeline/tag-themes.test.ts` — mock-path bijgewerkt naar nieuwe locatie
- [ ] Tests in `packages/database/__tests__/queries/themes.test.ts` en cockpit `time-spent-donut-section.test.ts` / pills-strip tests — check dat de `preloaded`-prop signatuur doorloopt
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
