# Micro Sprint TH-009: Cleanup minors (conventies, tokens, hygiëne)

## Doel

Alle resterende minor + nitpick findings uit de quality-review op één plek opruimen. Geen functionele veranderingen, geen architectuur-shifts — alleen conventie-naleving, design-token-discipline, en ontdubbelen van magic numbers. Na deze sprint zitten de theme-files volledig binnen de CLAUDE.md-standaarden en is de codebase klaar voor review-by-new-developer zonder "oh dat doen we hier anders"-momenten.

## Requirements

| ID             | Beschrijving                                                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FIX-TH-901     | Zod schema `updateThemeSchema.matching_guide` → camelCase `matchingGuide` (CLAUDE.md conventie)                                                                                                   |
| ~~FIX-TH-902~~ | ~~Validatie-drempels als constants~~ — **AL OPGELOST in TH-008** (`THEME_NAME_MIN` etc. geëxporteerd)                                                                                             |
| FIX-TH-903     | Hardcoded `bg-[#006B3F]` in 2 theme-files (`error.tsx` + `not-found.tsx`) → `bg-primary text-primary-foreground` (scope-beperkt — zie context)                                                    |
| FIX-TH-904     | Hardcoded `stroke="#e5e7eb"` in `time-spent-donut.tsx` → Tailwind `stroke-muted` (dark-mode compatible)                                                                                           |
| FIX-TH-905     | `ConfidenceBadge` in `meetings-tab.tsx` vervangen door shared `Badge` (optie A: `default`/`secondary` variant)                                                                                    |
| FIX-TH-906     | Zod fail-errors geven field-errors terug i.p.v. generieke `"Invalid input"` — 6 actions + test-assertions mee                                                                                     |
| FIX-TH-907     | `export { getThemeBySlug }` re-export vanuit `actions/themes.ts` verwijderd (query als action exposed is anti-pattern)                                                                            |
| FIX-TH-908     | `console.info` in `rejectEmergingThemeAction` → `console.warn` (CLAUDE.md zegt alleen warn/error)                                                                                                 |
| FIX-TH-909     | Literal `&apos;s` in `emerging-themes-section.tsx:30` (string-expressie binnen braces) vervangen door unicode `'s`                                                                                |
| ~~FIX-TH-910~~ | ~~Import-volgorde~~ — **grotendeels OK na TH-008**; geen linter-error, marginale opbrengst. Niet urgent, uit scope.                                                                               |
| FIX-TH-911     | `updateTheme` mutation gebruikt `Object.fromEntries + filter` i.p.v. 7× manual undefined-check                                                                                                    |
| FIX-TH-912     | `getThemeRecentActivity` — **markeren als bewuste 2-query design** (count window-filtered, lastMentioned all-time). Geen code-change, wel JSDoc-comment bijwerken om die keuze vast te leggen     |
| FIX-TH-913     | `THEME_COLUMNS` gesplitst in `THEME_COLUMNS_BASIC` (voor pills/donut via `fetchWindowAggregation`) en `THEME_COLUMNS_FULL` (detail/edit/review)                                                   |
| FIX-TH-914     | `getThemeMeetings` dubbele sort (SQL + JS) → één SQL-sort met `referencedTable: "meetings"`. Supabase-js 2.100+ ondersteunt dit                                                                   |
| FIX-TH-915     | Nieuwe `queries/meeting-themes.ts` (`listTaggedMeetingIds`) + `listVerifiedMeetingIdsOrderedByDate` in `queries/meetings.ts`; `scripts/batch-tag-themes.ts` gebruikt die i.p.v. directe `.from()` |
| ~~FIX-TH-916~~ | ~~Shared Skeleton-component~~ — **SKIP**: slechts 2 theme-skeletons, geen 3e use-case opgedoken. Wacht tot er patroon is.                                                                         |

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

### FIX-TH-902 — ~~validatie-constants~~ **AL OPGELOST**

TH-008 heeft dit al toegevoegd: `THEME_NAME_MIN=2`, `THEME_NAME_MAX=80`, `THEME_DESC_MIN=5`, `THEME_DESC_MAX=200`, `THEME_GUIDE_MIN=20` staan geëxporteerd in `apps/cockpit/src/validations/themes.ts` en worden gebruikt door `useThemeFormState`, de Zod-schema's, en de `minLength`-attrs in beide forms. Geen actie.

### FIX-TH-903 + FIX-TH-904 — design tokens

**Scope-besluit (review):** `bg-[#006B3F]` staat op **40+ andere plekken** in de app (admin, clients, projects, intelligence, etc.) — buiten TH-scope. TH-009 beperkt zich tot de 2 theme-files. App-wide replacement is een aparte hygiene-sprint.

`apps/cockpit/src/app/(dashboard)/themes/[slug]/error.tsx:12` + `not-found.tsx:12`: vervang `bg-[#006B3F] ... text-white` door `bg-primary text-primary-foreground`.

`apps/cockpit/src/components/themes/time-spent-donut.tsx` (regels 53 + 91): vervang `stroke="#e5e7eb"` door Tailwind utility:

```tsx
<circle cx="70" cy="70" r={CIRCLE_R} fill="none" className="stroke-muted" strokeWidth="20" />
```

Geverifieerd: `--color-muted` staat in `globals.css @theme`-blok; `stroke-muted` resolveert correct en is dark-mode compatible.

### FIX-TH-905 — ConfidenceBadge via shared Badge (optie A)

`apps/cockpit/src/app/(dashboard)/themes/[slug]/tabs/meetings-tab.tsx:98-110`. Grep toonde **geen andere confidence-badges** in risks/issues, dus optie B (CVA-variant) is overkill. **Optie A gekozen:**

```tsx
import { Badge } from "@repo/ui/badge";

<Badge variant={confidence === "high" ? "default" : "secondary"}>{confidence}</Badge>;
```

Verwijder inline `ConfidenceBadge` functie + import.

### FIX-TH-906 — Zod field-errors

Zes Server Actions in `actions/themes.ts` (niet 4 — zie TH-008) doen nu:

```ts
if (!parsed.success) return { error: "Invalid input" };
```

**Precedent:** `apps/cockpit/src/actions/email-review.ts:109-110` gebruikt al het betere patroon: `parsed.error.issues[0]?.message ?? "Invalid input"`. Dat patroon adopteren.

```ts
if (!parsed.success) {
  return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
}
```

**Test-impact:** `apps/cockpit/__tests__/actions/themes.test.ts` en `themes-review.test.ts` doen `expect(result).toEqual({ error: "Invalid input" })` voor Zod-fails. Na deze wijziging krijgen die tests een concrete field-error terug (bv. `"String must contain at least 2 character(s)"` of iets analoog uit Zod 4). Tests aanpassen naar `expect.stringMatching(/must contain at least/i)` of asserties op `.error` niet-leeg.

### FIX-TH-907 — verwijder action/query re-export

`apps/cockpit/src/actions/themes.ts:122-123`:

```ts
export { getThemeBySlug };
```

De comment noemt "type-safety" maar een re-export vanuit een `"use server"` file maakt de query als Server Action bereikbaar — overhead + verkeerd signaal. Verwijder; consumers importeren direct vanuit `@repo/database/queries/themes`.

### FIX-TH-908 — console.info → console.warn

`actions/themes.ts:158` (regel verschoven na TH-008) logt rejection-note via `console.info`. CLAUDE.md zegt alleen `warn`/`error`. Upgrade:

```ts
if (parsed.data.note) {
  console.warn(
    `[rejectEmergingTheme] ${parsed.data.themeId} rejected by ${guard.user.id}: ${parsed.data.note}`,
  );
}
```

Let op: `guard.userId` werd `guard.user.id` in TH-008 — zorg dat deze call-site die migratie ook gevolgd heeft (waarschijnlijk al OK door replace_all, maar checken).

V2-scope: `theme_audit_log`-tabel is een apart ticket.

### FIX-TH-909 — apostrof rendert letterlijk

`emerging-themes-section.tsx:30` (regel verschoven na TH-007) — binnen een JS-expressie (braces) werkt `&apos;` niet. Vervang door unicode:

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

### FIX-TH-912 — bewuste 2-query keuze documenteren

`getThemeRecentActivity` (nu in `queries/theme-detail.ts`) doet 2 parallelle queries:

1. `count` **met** `.gte(created_at, since)` → 30d-window mentions
2. `latest` **zonder** window-filter → absolute last match timestamp (ongeacht window)

Deze twee hebben verschillende semantieken (window-count vs. all-time last-seen) en kunnen **niet** in één query zonder informatie te verliezen. Huidige impl is correct.

**Actie:** alleen JSDoc-comment bijwerken om deze keuze expliciet vast te leggen, zodat toekomstige reviewers niet opnieuw naar "can this be 1 query?" grijpen:

```ts
/**
 * Header-badge data: hoeveel mentions binnen het window + absolute laatste
 * match-tijd.
 *
 * TH-009 — bewust 2 parallelle queries: `count` is window-filtered (30d),
 * `lastMentionedAt` is ongefilterd (all-time) zodat een thema dat >30d geen
 * match had nog steeds zijn laatste mention toont. Eén query zou óf de
 * window óf de all-time semantiek moeten prijsgeven.
 */
```

Geen code-change.

### FIX-TH-913 — THEME_COLUMNS splits

Na TH-008 file-split zit `THEME_COLUMNS` nu in `packages/database/src/queries/theme-internals.ts`. Splits:

```ts
export const THEME_COLUMNS_BASIC = "id, slug, name, emoji, mention_count, last_mentioned_at";
export const THEME_COLUMNS_FULL =
  "id, slug, name, emoji, description, matching_guide, status, created_by_agent, verified_at, verified_by, archived_at, last_mentioned_at, mention_count, created_at, updated_at";
```

**Gebruik:**

- `fetchWindowAggregation` (in `theme-internals.ts`) → **BASIC** (dashboard-aggregatie, ~40% minder bytes over the wire bij grote catalogs)
- `listVerifiedThemes` (base, voor ThemeTagger prompt) → **FULL** (negatives join)
- `getThemeBySlug` (detail) → **FULL**
- `listEmergingThemes` (review) → **FULL**

Backwards-compat: houd `THEME_COLUMNS = THEME_COLUMNS_FULL` als re-export voor bestaande call-sites, zodat migratie incrementeel kan.

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

Requirements-tabel: 12 actieve FIX-items (TH-902, TH-910, TH-916 zijn niet nodig of out-of-scope). Specifieke file-lijst:

- [ ] `apps/cockpit/src/validations/themes.ts` — schema-veld rename `matching_guide` → `matchingGuide` (TH-901)
- [ ] `apps/cockpit/src/actions/themes.ts` — mapping `matching_guide: matchingGuide.trim()` in 2 actions, Zod-error patroon in 6 actions, `console.info` → `console.warn`, re-export `getThemeBySlug` weg, `guard.user.id` consistency
- [ ] `apps/cockpit/src/components/themes/theme-edit-form.tsx` + `theme-approval-card.tsx` — schema-rename doorgevoerd in `updateThemeAction({ matchingGuide })` call
- [ ] `apps/cockpit/src/app/(dashboard)/themes/[slug]/error.tsx` + `not-found.tsx` — `bg-primary text-primary-foreground`
- [ ] `apps/cockpit/src/components/themes/time-spent-donut.tsx` — `stroke-muted` via className (2×)
- [ ] `apps/cockpit/src/app/(dashboard)/themes/[slug]/tabs/meetings-tab.tsx` — `ConfidenceBadge` inline weg, shared `Badge` variant
- [ ] `apps/cockpit/src/components/themes/emerging-themes-section.tsx:30` — unicode `'s`
- [ ] `packages/database/src/mutations/themes.ts` — `updateTheme` via `Object.fromEntries`
- [ ] `packages/database/src/queries/theme-detail.ts` — JSDoc-comment op `getThemeRecentActivity`, `getThemeMeetings` sort via `referencedTable`
- [ ] `packages/database/src/queries/theme-internals.ts` — `THEME_COLUMNS_BASIC` + `THEME_COLUMNS_FULL` exports
- [ ] `packages/database/src/queries/meetings.ts` — `listVerifiedMeetingIdsOrderedByDate(limit?)`
- [ ] `packages/database/src/queries/meeting-themes.ts` (NIEUW) — `listTaggedMeetingIds()`
- [ ] `scripts/batch-tag-themes.ts` — gebruikt bovenstaande queries
- [ ] Tests aangepast: `themes.test.ts` + `themes-review.test.ts` — field-error assertions versoepeld (TH-906)

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
