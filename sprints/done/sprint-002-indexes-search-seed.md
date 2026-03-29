# Sprint 002: Indexes, search functions, seed data, embed utility

**Fase:** 0 — Walking Skeleton
**Doel:** Database is doorzoekbaar. Seed data staat erin. Embedding utility is klaar (Cohere i.p.v. OpenAI).

## Requirements

DATA-042..049, DATA-053, FUNC-019, FUNC-027, FUNC-028

## Bestaande code

- `src/lib/embeddings.ts` — bestaande embed utility, maar gebruikt OpenAI 1536-dim. Moet vervangen worden door Cohere 1024-dim.
- Bestaande search functions (1536-dim) zijn gedropt in sprint 001.

## Scope

1. HNSW vector indexes op people, projects, meetings, extractions embedding-kolommen (1024-dim)
2. GIN indexes op meetings.search_vector en extractions.search_vector
3. B-tree indexes op FK-kolommen en veelgebruikte filters
4. Search functions (1024-dim): `search_all_content()` (hybrid: vector + full-text via RRF), `match_people()`, `match_projects()`, `search_meetings_by_participant()`
5. pg_cron schedule voor re-embed worker (elke 5 min)
6. Seed script: initiele organizations, people, projects (idempotent, ON CONFLICT DO UPDATE)
7. `src/lib/embeddings.ts` vervangen: OpenAI → Cohere embed-v4 (1024-dim, inputType parameter)
8. `cohere-ai` SDK installeren, `openai` verwijderen (alleen voor embeddings gebruikt)

## Taken

- [x] Migratie 8: HNSW vector indexes (1024-dim)
- [x] Migratie 9: GIN + B-tree indexes
- [x] Migratie 10: search_all_content() (hybrid), match_people(), match_projects(), search_meetings_by_participant() — allemaal 1024-dim
- [x] Migratie 11: pg_cron schedule
- [x] Maak seed script `supabase/seed/seed.sql`
- [x] Vervang `src/lib/embeddings.ts`: OpenAI → Cohere embed-v4
- [x] `npm install cohere-ai && npm uninstall openai` (als openai alleen voor embeddings is)
- [ ] Voeg `COHERE_API_KEY` toe aan environment variabelen

## Testbaar

- Seed data staat in organizations, people, projects
- Handmatig een meeting met embedding INSERT → vindbaar via `search_all_content()`
- `match_projects()` matcht op embedding similarity (1024-dim)

## Geraakt

- `supabase/migrations/*` (4 nieuwe migraties)
- `supabase/seed/seed.sql` (nieuw)
- `src/lib/embeddings.ts` (vervangen: OpenAI → Cohere)
- `package.json` (cohere-ai toevoegen, openai mogelijk verwijderen)
