# Micro Sprint TH-9: Cleanup minors (conventies, tokens, hygiëne)

## Doel

Alle resterende minor + nitpick findings uit de quality-review op één plek opruimen. Geen functionele veranderingen, geen architectuur-shifts — alleen conventie-naleving, design-token-discipline, en ontdubbelen van magic numbers. Na deze sprint zitten de theme-files volledig binnen de CLAUDE.md-standaarden en is de codebase klaar voor review-by-new-developer zonder "oh dat doen we hier anders"-momenten.

## Requirements

| ID         | Beschrijving                                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| FIX-TH-901 | Zod schema `updateThemeSchema.matching_guide` → camelCase `matchingGuide` (CLAUDE.md conventie)                              |
| FIX-TH-902 | Validatie-drempels (2/5/20) geëxporteerd als constants uit `validations/themes.ts`                                           |
| FIX-TH-903 | Hardcoded `bg-[#006B3F]` in `error.tsx` + `not-found.tsx` → `bg-primary text-primary-foreground`                             |
| FIX-TH-904 | Hardcoded `stroke="#e5e7eb"` in `time-spent-donut.tsx` → Tailwind `stroke-muted` (dark-mode compatible)                      |
| FIX-TH-905 | `ConfidenceBadge` in `meetings-tab.tsx` gebruikt `@repo/ui/badge` variant (of nieuwe variant toegevoegd)                     |
| FIX-TH-906 | Zod fail-errors geven field-errors terug i.p.v. generieke `"Invalid input"` string                                           |
| FIX-TH-907 | `export { getThemeBySlug }` re-export vanuit `actions/themes.ts` verwijderd (query als action exposed is anti-pattern)       |
| FIX-TH-908 | `console.info` in `rejectEmergingThemeAction` → `console.warn` of structured audit-log                                       |
| FIX-TH-909 | Literal `&apos;s` in `emerging-themes-section.tsx:27` vervangen door unicode `'s` (rendert nu letterlijk)                    |
| FIX-TH-910 | Import-volgorde in `actions/themes.ts:15-17` gecorrigeerd (@repo/database groeperen, dan @repo/ai, dan @/)                   |
| FIX-TH-911 | `updateTheme` mutation gebruikt `Object.fromEntries + filter` i.p.v. 6x manual undefined-check                               |
| FIX-TH-912 | `getThemeRecentActivity` count+latest in één query (COALESCE MAX + COUNT via relational select)                              |
| FIX-TH-913 | `THEME_COLUMNS` gesplitst in `THEME_COLUMNS_BASIC` (voor pills/donut) en `THEME_COLUMNS_FULL` (detail/edit)                  |
| FIX-TH-914 | `getThemeMeetings` dubbele sort (SQL + JS) → enkele SQL-sort op `meeting.date desc`, JS-sort verwijderd                      |
| FIX-TH-915 | `getVerifiedMeetingIds()` + `listTaggedMeetingIds()` queries toegevoegd; `batch-tag-themes.ts` gebruikt die i.p.v. `.from()` |
| FIX-TH-916 | Optioneel: shared `@repo/ui/skeleton.tsx` — alleen als 3e skeleton-use-case opduikt tijdens deze sprint                      |

## Bronverwijzingen

- Quality-review output (agents)
- CLAUDE.md → §Conventies (camelCase), §Components (props, states), §Error Handling (field errors)

## Context

Korte notes per fix — code staat in-source klaar, dit sprintbestand is een checklist.

### FIX-TH-901 — `matching_guide` → `matchingGuide`

Zod-schema `updateThemeSchema` in `apps/cockpit/src/validations/themes.ts:8-14`. Rename field; mirror-mapping naar DB-snake_case blijft in `updateThemeAction`:

```ts
await updateThemeMutation(themeId, {
  name,
  description,
  matching_guide: matchingGuide, // expliciete mapping
  emoji,
});
```

Callers bijwerken: `theme-edit-form.tsx`, `theme-approval-card.tsx`, `actions/themes.ts`, tests.

### FIX-TH-902 — validatie-constants

In `apps/cockpit/src/validations/themes.ts`:

```ts
export const THEME_NAME_MIN = 2;
export const THEME_NAME_MAX = 80;
export const THEME_DESC_MIN = 5;
export const THEME_DESC_MAX = 200;
export const THEME_GUIDE_MIN = 20;

export const updateThemeSchema = z.object({
  themeId: z.string().uuid(),
  name: z.string().min(THEME_NAME_MIN).max(THEME_NAME_MAX),
  description: z.string().min(THEME_DESC_MIN).max(THEME_DESC_MAX),
  matchingGuide: z.string().min(THEME_GUIDE_MIN),
  emoji: z.enum(ALL_THEME_EMOJIS),
});
```

`useThemeFormState` (uit TH-8) + HTML `minLength`-attrs importeren dezelfde constants. Single source of truth.

### FIX-TH-903 + FIX-TH-904 — design tokens

`apps/cockpit/src/app/(dashboard)/themes/[slug]/error.tsx:12` + `not-found.tsx:12`: vervang `bg-[#006B3F] ... text-white` door `bg-primary text-primary-foreground`.

`apps/cockpit/src/components/themes/time-spent-donut.tsx:53` + `:91`: vervang `stroke="#e5e7eb"` door:

```tsx
<circle cx="70" cy="70" r={CIRCLE_R} fill="none" className="stroke-muted" strokeWidth="20" />
```

### FIX-TH-905 — ConfidenceBadge via shared Badge

`apps/cockpit/src/app/(dashboard)/themes/[slug]/tabs/meetings-tab.tsx:98-110`. Kies een van:

**Optie A** — bestaande Badge varianten hergebruiken:

```tsx
import { Badge } from "@repo/ui/badge";

<Badge variant={confidence === "high" ? "default" : "secondary"}>{confidence}</Badge>;
```

**Optie B** — `@repo/ui/badge` krijgt `confidence-high` / `confidence-medium` varianten via CVA. Alleen doen als twee+ andere features ook confidence-badges tonen (check bij risks, issues).

Verwijder inline `ConfidenceBadge` functie.

### FIX-TH-906 — Zod field-errors

Alle 4 Server Actions in `actions/themes.ts` doen nu:

```ts
if (!parsed.success) return { error: "Invalid input" };
```

Consistent met andere cockpit-actions: geef de eerste field-error terug, of een `fieldErrors`-shape:

```ts
if (!parsed.success) {
  const first = parsed.error.issues[0];
  return { error: first ? `${first.path.join(".")}: ${first.message}` : "Invalid input" };
}
```

### FIX-TH-907 — verwijder action/query re-export

`apps/cockpit/src/actions/themes.ts:122-123`:

```ts
export { getThemeBySlug };
```

De comment noemt "type-safety" maar een re-export vanuit een `"use server"` file maakt de query als Server Action bereikbaar — overhead + verkeerd signaal. Verwijder; consumers importeren direct vanuit `@repo/database/queries/themes`.

### FIX-TH-908 — console.info → structured

`actions/themes.ts:178-181` logt rejection-note via `console.info`. CLAUDE.md zegt alleen `warn`/`error`. Upgrade:

```ts
if (parsed.data.note) {
  console.warn(
    `[rejectEmergingTheme] ${parsed.data.themeId} rejected by ${guard.userId}: ${parsed.data.note}`,
  );
}
```

Of beter (v2 scope): voeg een `theme_audit_log`-tabel toe.

### FIX-TH-909 — apostrof rendert letterlijk

`emerging-themes-section.tsx:27` — binnen string-literal werkt `&apos;` niet. Vervang door unicode:

```tsx
thema{emerging.length === 1 ? "" : "'s"} voor.
```

### FIX-TH-911 — undefined-strip helper

`packages/database/src/mutations/themes.ts:65-73`:

```ts
const payload = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));

if (Object.keys(payload).length === 0) return { success: true };
```

Scheelt 6 if-lines, werkt type-correct omdat `UpdateThemeInput` alles optional heeft.

### FIX-TH-912 — combined count+latest

`getThemeRecentActivity` doet nu 2 parallelle queries (count + latest). Kan in één:

```ts
const { data, error } = await db
  .from("meeting_themes")
  .select("created_at", { count: "exact" })
  .eq("theme_id", themeId)
  .gte("created_at", since)
  .order("created_at", { ascending: false })
  .limit(1);

if (error) throw new Error(...);
return {
  mentions: data.length === 0 ? 0 : /* of gebruik count */,
  lastMentionedAt: data[0]?.created_at ?? null,
  windowDays,
};
```

Maar let op: count-header is altijd het window-filtered aantal, last-mention zou zonder window moeten. Dan is 2-calls toch correct — behoud dan de huidige implementatie maar markeer als bewuste keuze.

### FIX-TH-913 — THEME_COLUMNS splits

`packages/database/src/queries/themes.ts:34-35`:

```ts
export const THEME_COLUMNS_BASIC = "id, slug, name, emoji, mention_count, last_mentioned_at";
export const THEME_COLUMNS_FULL =
  "id, slug, name, emoji, description, matching_guide, status, created_by_agent, verified_at, verified_by, archived_at, last_mentioned_at, mention_count, created_at, updated_at";
```

Pills / donut gebruiken BASIC, detail / edit gebruiken FULL.

### FIX-TH-914 — dubbele sort in getThemeMeetings

`queries/themes.ts:342-385` sorteert zowel in SQL (`.order('created_at', desc)`) als in JS na de map. Kies één. Aanbevolen: verplaats naar SQL via relational order:

```ts
const { data } = await db
  .from("meeting_themes")
  .select(
    `confidence, evidence_quote, created_at, meeting:meeting_id (id, title, date, participants)`,
  )
  .eq("theme_id", themeId)
  .order("created_at", { ascending: false })
  // Note: Supabase supports `foreignTable` order via referencedTable option
  .order("date", { ascending: false, referencedTable: "meetings" });
```

Als dat niet werkt (oudere supabase-js), behoud JS-sort maar verwijder de overbodige SQL-sort.

### FIX-TH-915 — batch-script via queries

`scripts/batch-tag-themes.ts:52-82` doet directe `.from("meetings")` en `.from("meeting_themes")`. Buiten `check:queries` scope, maar ondermijnt het beleid.

Voeg toe:

- `packages/database/src/queries/meetings.ts` → `listVerifiedMeetingIdsOrderedByDate(limit?)`
- `packages/database/src/queries/meeting-themes.ts` (NIEUW) → `listTaggedMeetingIds()` en/of `listUntaggedVerifiedMeetings(limit?)`

Script gebruikt die. Houdt `check:queries` consistent.

### FIX-TH-916 — Skeleton-component (optioneel)

Alleen doen als tijdens deze sprint een 3e skeleton-use-case opduikt. Anders laten.

## Deliverables

Zie de requirement-tabel — 16 nummers, elk 1 file-change. Geen tests gebroken, geen nieuwe features.

## Acceptance criteria

- `npm run lint` + `npm run type-check` + `npm run test` alle groen
- Grep op `#006B3F` + `#e5e7eb` + hardcoded hex-colors in TH-files: 0 hits (buiten `donut-palette.ts` die bewust hex houdt voor de segment-kleuren)
- Grep op `matching_guide` in `apps/cockpit/src/validations/themes.ts`: 0 hits in schema-definitie (camelCase gebruiken)
- Grep op `console.info` in `apps/cockpit/src/actions/`: 0 hits
- `THEME_NAME_MIN`, `THEME_DESC_MIN`, `THEME_GUIDE_MIN` geïmporteerd op ≥3 plekken
- Dashboard + detail pages visueel gelijk aan vóór deze sprint (geen UX-regressie)

## Handmatige test-stappen

1. Dashboard openen → pills + donut onveranderd.
2. Theme-detail openen → tabs onveranderd.
3. Review-page: apostrof in "nieuwe thema's voor" rendert correct i.p.v. `&apos;s`.
4. `/themes/does-not-exist` → not-found met `bg-primary` (check dark-mode ook).
5. Donut in dark-mode → stroke-rail zichtbaar, geen wit-op-zwart.
6. Edit een theme met te korte description (4 chars) → field-error in plaats van "Invalid input".
7. `npx tsx scripts/batch-tag-themes.ts --limit=1` → werkt via nieuwe queries.

## Out of scope

- Alles in TH-7 (blockers) + TH-8 (majors)
- Nieuwe features
- Perf-benchmarks (buiten `EXPLAIN ANALYZE` spot-checks)
- Uitbreiding test-coverage voor niet-gewijzigde paden
