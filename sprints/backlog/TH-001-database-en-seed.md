# Micro Sprint TH-001: Database & seed-themes

## Doel

De drie tabellen (`themes`, `meeting_themes`, `theme_match_rejections`) aanmaken via Supabase migrations, de 10 seed-themes uit de PRD inserten, types regenereren en basis query/mutation-stubs aanmaken. Na deze sprint staat het fundament klaar: database heeft 10 verified themes, types kloppen, helpers zijn importeerbaar. Geen AI-integratie, geen UI — puur data-laag. Eerste tastbare deliverable: je kunt via Supabase Studio de 10 themes zien.

## Requirements

| ID       | Beschrijving                                                                                                                                         |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| DATA-200 | Tabel `themes` met velden uit PRD §6.1 (slug, name, emoji, description, matching_guide, status, gedenormaliseerde mention_count + last_mentioned_at) |
| DATA-201 | Status-CHECK constraint: `emerging` / `verified` / `archived`                                                                                        |
| DATA-202 | Tabel `meeting_themes` junction met composite PK + confidence CHECK (medium/high)                                                                    |
| DATA-203 | Tabel `theme_match_rejections` met reason CHECK + index op `(theme_id, rejected_at DESC)`                                                            |
| DATA-204 | Indexes: `themes_status_idx`, `themes_last_mentioned_idx`, `meeting_themes_theme_idx`, `meeting_themes_meeting_idx`                                  |
| DATA-205 | RLS enabled permissive v1 (lijn met `tasks`) op alle drie tabellen                                                                                   |
| DATA-206 | Seed `supabase/seed/themes.sql` met 10 verified themes uit PRD §11.4                                                                                 |
| DATA-207 | Seed is idempotent (`ON CONFLICT DO UPDATE`) zodat re-runs veilig zijn                                                                               |
| DATA-208 | Elk seed-theme heeft name, emoji uit shortlist, description (1 zin), matching_guide (2–4 zinnen)                                                     |
| DATA-209 | Types hergenereerd in `packages/database/src/types/database.ts`                                                                                      |
| FUNC-200 | Basis query-stubs in `packages/database/src/queries/themes.ts`: `listVerifiedThemes`, `getThemeBySlug`                                               |
| FUNC-201 | Basis mutation-stubs in `packages/database/src/mutations/themes.ts`: `insertTheme`, `updateTheme`, `archiveTheme`                                    |

## Bronverwijzingen

- PRD: `docs/specs/prd-themes.md` → §6 Datamodel (regels 289-367)
- PRD: `docs/specs/prd-themes.md` → §11.3-11.4 seed-themes (regels rondom 745-820)
- Repo: `packages/database/README.md` — query/mutation conventies

## Context

### Migration-bestand

Één migration met volgordelijk: `themes` → `meeting_themes` → `theme_match_rejections` → RLS policies → indexes.

Locatie: `supabase/migrations/YYYYMMDDHHMMSS_create_themes.sql`.

### Seed-data

10 themes uit PRD §11.4, elk met `status='verified'`, `created_by_agent=NULL`, `verified_at=now()`, emoji uit de 42-shortlist. Slugs kebab-case:

1. `ai-native-strategie-positionering` 🧭
2. `interne-platform-kennisbank` 🤖
3. `discovery-mvp-kickoffs` 🙋
4. `werkdruk-founder-capaciteit` 🫂
5. `founder-ritme-samenwerking` 🗣️
6. `klant-ai-transformatie-trajecten` 🚀
7. `stabiliteit-vs-feature-snelheid` 🧱
8. `klantcommunicatie-verwachtingen` 💬
9. `partners-sparring-netwerk` 🤝
10. `team-capaciteit-hiring` 👥

### Query stubs (alleen signatures)

```typescript
// packages/database/src/queries/themes.ts
export async function listVerifiedThemes(client?: SupabaseClient) { ... }
export async function getThemeBySlug(client: SupabaseClient | undefined, slug: string) { ... }
```

Pas vullen in latere sprints (TH-003 en TH-005). Voor nu: `select *` volstaat; filtering komt later.

## Deliverables

- [ ] `supabase/migrations/NNN_create_themes.sql` — drie tabellen, constraints, indexes, permissive RLS
- [ ] `supabase/seed/themes.sql` — 10 seed-themes, idempotent
- [ ] `packages/database/src/types/database.ts` — regenereerd via `supabase gen types`
- [ ] `packages/database/src/queries/themes.ts` — stubs `listVerifiedThemes`, `getThemeBySlug`
- [ ] `packages/database/src/mutations/themes.ts` — stubs `insertTheme`, `updateTheme`, `archiveTheme`

## Acceptance criteria

- Migration draait schoon op lokale Supabase (`supabase db reset`).
- Na seed-run: `SELECT count(*) FROM themes WHERE status = 'verified'` → 10.
- RLS policies toestaan dat een authenticated user alle 10 themes kan lezen.
- `npm run type-check` slaagt zonder nieuwe errors.
- Query-stubs zijn importeerbaar vanuit `apps/cockpit/` zonder compile-errors.

## Handmatige test-stappen

1. `supabase db reset` → migraties draaien.
2. `supabase db execute --file supabase/seed/themes.sql` → 10 themes.
3. Open Supabase Studio → `themes` table → zie alle 10 met emoji, matching_guide, status=verified.
4. `npm run type-check` en `npm run lint` in root.
5. In `apps/cockpit/` tijdelijk een page met `const themes = await listVerifiedThemes(client)` → array van 10.

## Out of scope

- ThemeTagger (TH-002).
- Pipeline integratie (TH-003).
- Enige UI (TH-004 en verder).
- `listTopActiveThemes`, `getThemeShareDistribution` — die komen pas in TH-004.
