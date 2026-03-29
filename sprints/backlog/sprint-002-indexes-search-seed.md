# Sprint 002: Indexes, search functions, seed data, embed utility

**Fase:** 0 — Walking Skeleton
**Doel:** Database is doorzoekbaar. Seed data staat erin. Embedding utility is klaar.

## Requirements

DATA-042..049, DATA-053, FUNC-019, FUNC-027, FUNC-028

## Scope

1. HNSW vector indexes op people, projects, meetings, extractions embedding-kolommen
2. GIN indexes op meetings.search_vector en extractions.search_vector
3. B-tree indexes op FK-kolommen en veelgebruikte filters
4. Search functions: `search_all_content()` (hybrid: vector + full-text via RRF), `match_people()`, `match_projects()`, `search_meetings_by_participant()`
5. pg_cron schedule voor re-embed worker (elke 5 min)
6. Seed script: initiele organizations, people, projects (idempotent, ON CONFLICT DO UPDATE)
7. Cohere embed-v4 utility (`src/lib/utils/embed.ts`)
8. `cohere-ai` SDK installeren

## Taken

- [ ] Migratie 7: HNSW vector indexes
- [ ] Migratie 8: GIN + B-tree indexes
- [ ] Migratie 9: search_all_content(), match_people(), match_projects(), search_meetings_by_participant()
- [ ] Migratie 10: pg_cron schedule
- [ ] Maak seed script `supabase/seed/seed.sql`
- [ ] Installeer `cohere-ai` SDK
- [ ] Maak `src/lib/utils/embed.ts` (Cohere embed-v4, 1024-dim, inputType parameter)
- [ ] Voeg `COHERE_API_KEY` toe aan environment variabelen

## Testbaar

- Seed data staat in organizations, people, projects
- Handmatig een meeting met embedding INSERT → vindbaar via `search_all_content()`
- `match_projects()` matcht op embedding similarity

## Geraakt

- `supabase/migrations/*` (4 nieuwe migraties)
- `supabase/seed/seed.sql` (nieuw)
- `src/lib/utils/embed.ts` (nieuw)
- `package.json` (cohere-ai toevoegen)
