# Micro Sprint TH-007: Cleanup blockers (CI, security, perf)

## Doel

Vier kritieke findings uit de quality-review op de TH-tranche (commits `989e909..6a49fa4`) oplossen. Dit zijn geen feature-wijzigingen maar harde blockers die merges breken (CI-lint), security-contracten versoepelen, of observable performance-degradatie veroorzaken. Na deze sprint: CI is groen, geen caller-supplied `userId` spoofing mogelijk in mutations, geen dubbele DB-fetch op review-page, en `recalculateThemeStats` is geen N+1 meer.

## Requirements

| ID         | Beschrijving                                                                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| FIX-TH-701 | Lint-error `react-hooks/set-state-in-effect` in `emoji-picker-popover.tsx` opgelost                                                           |
| FIX-TH-702 | `recalculateThemeStats` herschreven van N+1 (3 queries × N themes) naar één aggregate UPDATE                                                  |
| FIX-TH-703 | `/review` page roept `listEmergingThemes` nog maar 1× aan — niet in page én Suspense-child                                                    |
| FIX-TH-704 | `rejectThemeMatch` mutation heeft expliciet security-contract (JSDoc + naam) zodat caller-supplied userId-spoofing onmogelijk is zonder guard |

## Bronverwijzingen

- Quality-review output (in-conversation) voor code-review branch `claude/start-th-001-wrcHL`
- CLAUDE.md → §Security (drie lagen), §Database & Queries (geen N+1), §Error Handling

## Context

### FIX-TH-701 — emoji-picker-popover setState-in-effect

`apps/cockpit/src/components/themes/emoji-picker-popover.tsx:47` triggert cascading renders via `useEffect(() => { setFocusIndex(...) }, [open])`.

**Fix:** verplaats reset naar `onOpenChange`-callback van de Popover.Root:

```tsx
<Popover.Root
  open={open}
  onOpenChange={(next) => {
    setOpen(next);
    if (next) {
      const i = ALL_EMOJIS.findIndex((e) => e === value);
      setFocusIndex(i >= 0 ? i : 0);
    }
  }}
>
```

Verwijder de eerste `useEffect` (lijnen 44-49). De tweede effect (focus-sync naar DOM-button) blijft staan — die is event-driven en geen state-setter.

### FIX-TH-702 — `recalculateThemeStats` N+1 aggregate UPDATE

`packages/database/src/mutations/meeting-themes.ts:105-136` doet nu `for (themeId of themeIds) { count + latest + update }` → 3 × N sequentiële queries.

**Fix:** één aggregate-query via correlated subqueries of RPC:

```ts
const { error } = await db.rpc("recalculate_theme_stats", { theme_ids: themeIds });
```

Plus migration `supabase/migrations/20260422110000_theme_stats_rpc.sql`:

```sql
CREATE OR REPLACE FUNCTION recalculate_theme_stats(theme_ids uuid[])
RETURNS void
LANGUAGE sql
AS $$
  UPDATE themes t
  SET
    mention_count = COALESCE(s.cnt, 0),
    last_mentioned_at = s.latest
  FROM (
    SELECT
      theme_id,
      COUNT(*)::int AS cnt,
      MAX(created_at) AS latest
    FROM meeting_themes
    WHERE theme_id = ANY(theme_ids)
    GROUP BY theme_id
  ) s
  WHERE t.id = s.theme_id AND t.id = ANY(theme_ids);

  -- Themes zonder matches: reset naar 0/null
  UPDATE themes t
  SET mention_count = 0, last_mentioned_at = NULL
  WHERE t.id = ANY(theme_ids)
    AND NOT EXISTS (SELECT 1 FROM meeting_themes mt WHERE mt.theme_id = t.id);
$$;

REVOKE ALL ON FUNCTION recalculate_theme_stats(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION recalculate_theme_stats(uuid[]) TO service_role;
```

**Security-scope (review-aanpassing):** géén `SECURITY DEFINER`, géén `GRANT TO authenticated`. Beide callers (`tag-themes.ts` pipeline + `rejectThemeMatchAction`) draaien via `getAdminClient()` (service-role). Dit volgt het patroon van `reset_extractions_for_meeting` (migratie 20260419110000). Zo kan een ingelogde user niet via `rpc()` willekeurige theme-counts forceren.

Test de return van `.rpc(...)` op error zoals alle andere RPC-calls in de codebase.

### FIX-TH-703 — dubbel fetchen van emerging themes op /review

`apps/cockpit/src/app/(dashboard)/review/page.tsx:11-18` haalt `listEmergingThemes()` op om `totalItems` te berekenen. `emerging-themes-section.tsx:16` fetcht dezelfde query nog een keer in het Suspense-child.

**Fix:** pass de data als prop vanuit de page:

```tsx
// review/page.tsx
<EmergingThemesSection emerging={emerging} />;

// emerging-themes-section.tsx — signatuur wordt:
export async function EmergingThemesSection({ emerging }: { emerging: EmergingThemeRow[] }) {
  const user = await getAuthenticatedUser();
  if (!user?.id) return null;
  if (!(await isAdmin(user.id))) return null;
  if (emerging.length === 0) return null;
  // ... rest ongewijzigd
}
```

Admin-check blijft server-side in de section (defense-in-depth); alleen de DB-fetch verhuist naar de page.

### FIX-TH-704 — security-contract op `rejectThemeMatch`

`packages/database/src/mutations/meeting-themes.ts:192` accepteert `userId` als parameter en schrijft hem naar `theme_match_rejections.rejected_by`. De huidige enige caller (`rejectThemeMatchAction`) doet de admin-guard, maar het contract is impliciet.

**Fix:** expliciet markeren plus rename zodat het obvious is:

```ts
/**
 * TH-006 — reject een theme-match als admin.
 *
 * @security De caller MOET `requireAdminInAction()` / `isAdmin(userId)` hebben
 *           uitgevoerd voordat deze functie wordt aangeroepen. De mutation
 *           zelf doet geen auth-check; `userId` wordt blind als rejected_by
 *           weggeschreven. Aanroepen vanuit niet-gegarde code-paden is een
 *           security-bug en de PR-review moet dit vangen.
 */
export async function rejectThemeMatchAsAdmin(input: {...}) { ... }
```

Hernoem de export én update `apps/cockpit/src/actions/themes.ts` om de nieuwe naam te gebruiken. Zo zie je bij elke call-site direct dat een admin-guard vereist is.

## Deliverables

- [ ] `apps/cockpit/src/components/themes/emoji-picker-popover.tsx` — `useEffect` vervangen door `onOpenChange`-handler. Lint-fout weg.
- [ ] `supabase/migrations/20260422110000_theme_stats_rpc.sql` — `recalculate_theme_stats(uuid[])` functie (service_role-only)
- [ ] `packages/database/src/mutations/meeting-themes.ts` — `recalculateThemeStats` gebruikt `.rpc()`
- [ ] `apps/cockpit/src/app/(dashboard)/review/page.tsx` — pass `emerging` als prop
- [ ] `apps/cockpit/src/components/themes/emerging-themes-section.tsx` — accepteert `emerging` prop i.p.v. zelf te fetchen
- [ ] `packages/database/src/mutations/meeting-themes.ts` — `rejectThemeMatch` → `rejectThemeMatchAsAdmin` + JSDoc @security
- [ ] `apps/cockpit/src/actions/themes.ts` — import bijgewerkt naar nieuwe naam
- [ ] `packages/database/__tests__/queries/themes.test.ts` — import + callsites (2×) bijgewerkt naar `rejectThemeMatchAsAdmin`
- [ ] `apps/cockpit/__tests__/actions/themes-review.test.ts` — mock-key `rejectThemeMatch` → `rejectThemeMatchAsAdmin`
- [ ] Bestaande tests blijven groen; een nieuwe DB-test voor `recalculate_theme_stats` RPC (mention_count + last_mentioned_at klopt na batch-update, inclusief theme zonder matches → reset naar 0/null)

## Acceptance criteria

- `npm run lint` → 0 errors in TH-files
- `recalculateThemeStats` roept maximaal 1 DB-functie aan, ongeacht aantal theme_ids
- `/review` laadt zonder dat `listEmergingThemes` in devtools twee keer als query verschijnt
- Grep op `rejectThemeMatch(` in de codebase geeft 0 hits buiten de mutation-definitie + één call-site in `actions/themes.ts`
- Alle 117 cockpit + 281 @repo/ai tests blijven groen; DB-tests (skippen zonder creds) passen wanneer wel gedraaid

## Handmatige test-stappen

1. `npm run lint` lokaal draaien → geen errors.
2. `npx tsx scripts/batch-tag-themes.ts --force --limit=5` → na afloop: `SELECT id, mention_count, last_mentioned_at FROM themes` klopt met `SELECT theme_id, count(*), max(created_at) FROM meeting_themes GROUP BY theme_id`.
3. Open `/review` in DevTools → Network-tab → filter op `rpc` / `themes`: exact één call naar `listEmergingThemes`-achtige fetch.
4. Probeer `rejectThemeMatchAsAdmin` met een willekeurige `userId` vanuit een test-script zonder admin-guard → het werkt technisch (want dat is de laag-verantwoordelijkheid) maar de functienaam en JSDoc maken de verantwoordelijkheid duidelijk.

## Out of scope

- Dashboard dubbel-fetch via `fetchWindowAggregation` (komt in TH-8)
- Denormalisatie-gebruik in `listTopActiveThemes` (TH-8)
- Nested relational queries voor detail-page tabs (TH-8)
- Whitelist-helper consolidatie (TH-8)
- File-splits voor `queries/themes.ts` (TH-8)
- Alle minor conventies + styling-tokens (TH-9)
