# Sprint 001: Clean slate database — drop oud, bouw nieuw

**Fase:** 0 — Walking Skeleton
**Doel:** Oude tabellen weg, nieuwe tabellen staan, types gegenereerd.

## Requirements

DATA-001..041, DATA-050..052

## Wat wordt opgeruimd

De huidige database bevat 12 tabellen uit de oude architectuur die niet meer passen:

**Droppen (v2 scope — niet nodig in v1):**
- `documents` (Google Docs — v2)
- `slack_messages` (Slack — v2)
- `emails` (Gmail — v2)
- `people_skills` (skills graph — v2)
- `people_projects` (vervangen door meeting_participants)

**Droppen (vervangen door unified `extractions` tabel):**
- `decisions`
- `action_items`
- `content_reviews`
- `insights`

**Droppen en opnieuw aanmaken (vector dimensie 1536→1024, schema wijzigingen):**
- `meetings` (nieuwe kolommen: meeting_type, party_type, organization_id, raw_fireflies, search_vector)
- `people` (embedding_stale default TRUE i.p.v. FALSE)
- `projects` (organization_id FK toegevoegd, client field weg)

**Bestaande search functions droppen:**
- `match_documents()`, `search_all_content()`, `match_people()`, `search_meetings_by_participant()` (allemaal 1536-dim)

**Bestaande cron job verwijderen:**
- `re-embed-stale` (wordt opnieuw aangemaakt met correcte URL)

## Wat wordt aangemaakt

**Nieuwe tabellen:**
1. `profiles` met auth trigger (auto-create bij registratie)
2. `organizations` (name UNIQUE, aliases, type, status)

**Opnieuw aangemaakt (nieuw schema, 1024-dim):**
3. `people` (email UNIQUE, embedding VECTOR(1024), embedding_stale DEFAULT TRUE)
4. `projects` (name UNIQUE, aliases, organization_id FK, embedding VECTOR(1024))
5. `meetings` (fireflies_id UNIQUE, meeting_type, party_type, organization_id FK, search_vector TSVECTOR + trigger)

**Nieuwe koppeltabellen:**
6. `meeting_projects` (composite PK, CASCADE deletes)
7. `meeting_participants` (composite PK, CASCADE deletes)

**Nieuwe unified extractie-tabel:**
8. `extractions` (meeting_id FK CASCADE, type, confidence, transcript_ref, metadata JSONB, corrected_by/corrected_at, search_vector TSVECTOR + trigger)

**Types:**
9. Supabase TypeScript types regenereren

## Taken

- [ ] Verwijder alle bestaande bestanden in `supabase/migrations/`
- [ ] Migratie 1: drop alle oude tabellen + functions + cron jobs
- [ ] Migratie 2: extensions (vector, pg_cron, pg_net)
- [ ] Migratie 3: profiles + auth trigger
- [ ] Migratie 4: organizations, people, projects
- [ ] Migratie 5: meetings + search_vector trigger
- [ ] Migratie 6: meeting_projects, meeting_participants
- [ ] Migratie 7: extractions + search_vector trigger
- [ ] Voer migraties uit op Supabase en verifieer
- [ ] Regenereer TypeScript types

## Testbaar

- Oude tabellen bestaan niet meer
- Alle nieuwe migraties draaien zonder fouten
- Handmatig een meeting INSERT werkt
- Auth trigger maakt profiel aan bij nieuwe user
- search_vector wordt automatisch gevuld bij INSERT op meetings

## Geraakt

- `supabase/migrations/*` (alle 7 bestaande verwijderd, 7 nieuwe aangemaakt)
- `src/lib/types/database.ts` (geregenereerd)
