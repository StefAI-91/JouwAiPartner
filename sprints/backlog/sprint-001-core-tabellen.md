# Sprint 001: Core tabellen + triggers

**Fase:** 0 — Walking Skeleton
**Doel:** Alle tabellen staan, triggers werken, types zijn gegenereerd.

## Requirements

DATA-001..041, DATA-050..052

## Scope

1. Extensions: vector, pg_cron, pg_net
2. `profiles` met auth trigger (auto-create bij registratie)
3. `organizations` (name UNIQUE, aliases, type, status)
4. `people` (email UNIQUE, embedding VECTOR(1024))
5. `projects` (name UNIQUE, aliases, organization_id FK, embedding VECTOR(1024))
6. `meetings` (fireflies_id UNIQUE, meeting_type, party_type, organization_id FK, search_vector TSVECTOR met trigger)
7. `meeting_projects` (composite PK, CASCADE deletes)
8. `meeting_participants` (composite PK, CASCADE deletes)
9. `extractions` (meeting_id FK CASCADE, type, confidence, transcript_ref, metadata JSONB, corrected_by/corrected_at, search_vector TSVECTOR met trigger)
10. Supabase TypeScript types regenereren

## Taken

- [ ] Verwijder alle bestaande bestanden in `supabase/migrations/`
- [ ] Migratie 1: extensions (vector, pg_cron, pg_net)
- [ ] Migratie 2: profiles + auth trigger
- [ ] Migratie 3: organizations, people, projects
- [ ] Migratie 4: meetings + search_vector trigger
- [ ] Migratie 5: meeting_projects, meeting_participants
- [ ] Migratie 6: extractions + search_vector trigger
- [ ] Voer migraties uit op Supabase en verifieer
- [ ] Regenereer TypeScript types (`supabase gen types typescript`)

## Testbaar

- Alle migraties draaien zonder fouten
- Handmatig een meeting INSERT werkt
- Auth trigger maakt profiel aan bij nieuwe user
- search_vector wordt automatisch gevuld bij INSERT op meetings

## Geraakt

- `supabase/migrations/*` (bestaande verwijderd, 6 nieuwe)
- `src/lib/types/database.ts` (geregenereerd)
