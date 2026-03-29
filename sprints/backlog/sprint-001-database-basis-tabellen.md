# Micro Sprint 001: Database — Alle tabellen, indexes, search functions, cron

## Doel

Het volledige schema wordt from scratch opgebouwd in één sprint. 8 tabellen, vector indexes, search functions en cron scheduling. Na deze sprint is de database klaar voor de pipeline.

## Requirements

| ID       | Beschrijving                                                                      |
| -------- | --------------------------------------------------------------------------------- |
| DATA-001 | Tabel profiles: id UUID PK REFERENCES auth.users(id) ON DELETE CASCADE            |
| DATA-002 | Tabel profiles: full_name TEXT, email TEXT NOT NULL, avatar_url TEXT              |
| DATA-003 | Tabel profiles: role TEXT DEFAULT 'member'                                        |
| DATA-004 | Trigger: profiel automatisch aanmaken bij auth.users registratie                  |
| DATA-005 | Tabel organizations: id UUID PK, name TEXT NOT NULL UNIQUE                        |
| DATA-006 | Tabel organizations: aliases TEXT[] DEFAULT '{}'                                  |
| DATA-007 | Tabel organizations: type TEXT NOT NULL ('client','partner','supplier','other')   |
| DATA-008 | Tabel organizations: contact_person TEXT, email TEXT                              |
| DATA-009 | Tabel organizations: status TEXT DEFAULT 'prospect'                               |
| DATA-010 | Tabel organizations: created_at, updated_at TIMESTAMPTZ                           |
| DATA-011 | Tabel people: id UUID PK, name TEXT NOT NULL, email TEXT UNIQUE                   |
| DATA-012 | Tabel people: team TEXT, role TEXT                                                |
| DATA-013 | Tabel people: embedding VECTOR(1024), embedding_stale BOOLEAN DEFAULT TRUE        |
| DATA-014 | Tabel people: created_at, updated_at TIMESTAMPTZ                                  |
| DATA-015 | Tabel projects: id UUID PK, name TEXT NOT NULL UNIQUE                             |
| DATA-016 | Tabel projects: aliases TEXT[] DEFAULT '{}'                                       |
| DATA-017 | Tabel projects: organization_id UUID FK -> organizations                          |
| DATA-018 | Tabel projects: status TEXT DEFAULT 'lead'                                        |
| DATA-019 | Tabel projects: embedding VECTOR(1024), embedding_stale BOOLEAN DEFAULT TRUE      |
| DATA-020 | Tabel projects: created_at, updated_at TIMESTAMPTZ                                |
| DATA-021 | Tabel meetings: id UUID PK, fireflies_id TEXT UNIQUE, title TEXT NOT NULL         |
| DATA-022 | Tabel meetings: date, participants, summary, transcript                           |
| DATA-023 | Tabel meetings: meeting_type TEXT (7 types)                                       |
| DATA-024 | Tabel meetings: party_type TEXT                                                   |
| DATA-025 | Tabel meetings: organization_id UUID FK -> organizations                          |
| DATA-026 | Tabel meetings: unmatched_organization_name TEXT                                  |
| DATA-027 | Tabel meetings: raw_fireflies JSONB                                               |
| DATA-028 | Tabel meetings: relevance_score FLOAT                                             |
| DATA-029 | Tabel meetings: embedding VECTOR(1024), embedding_stale BOOLEAN DEFAULT TRUE      |
| DATA-030 | Tabel meetings: created_at, updated_at TIMESTAMPTZ                                |
| DATA-031 | Tabel meeting_projects: composite PK, FKs met ON DELETE CASCADE                   |
| DATA-032 | Tabel meeting_participants: composite PK, FKs met ON DELETE CASCADE               |
| DATA-033 | Tabel extractions: id UUID PK, meeting_id UUID FK -> meetings ON DELETE CASCADE   |
| DATA-034 | Tabel extractions: type TEXT NOT NULL ('decision','action_item','need','insight') |
| DATA-035 | Tabel extractions: content TEXT NOT NULL                                          |
| DATA-036 | Tabel extractions: confidence FLOAT                                               |
| DATA-037 | Tabel extractions: metadata JSONB DEFAULT '{}'                                    |
| DATA-038 | Tabel extractions: transcript_ref TEXT                                            |
| DATA-039 | Tabel extractions: organization_id FK, project_id FK                              |
| DATA-040 | Tabel extractions: embedding VECTOR(1024), embedding_stale BOOLEAN DEFAULT TRUE   |
| DATA-041 | Tabel extractions: created_at TIMESTAMPTZ                                         |
| DATA-050 | Tabel extractions: corrected_by UUID FK -> profiles, corrected_at TIMESTAMPTZ     |
| DATA-051 | Tabel meetings: search_vector TSVECTOR met auto-update trigger (dutch config)     |
| DATA-052 | Tabel extractions: search_vector TSVECTOR met auto-update trigger (dutch config)  |
| DATA-053 | GIN indexes op search_vector kolommen voor full-text search                        |
| DATA-042 | HNSW vector indexes op alle embedding-kolommen                                    |
| DATA-043 | B-tree indexes op FK-kolommen en veelgebruikte filters                            |
| DATA-044 | search_all_content() als hybrid search (vector + full-text via RRF)               |
| DATA-045 | match_people() voor entity resolution                                             |
| DATA-046 | match_projects() voor entity resolution                                           |
| DATA-047 | search_meetings_by_participant()                                                  |
| DATA-048 | pg_cron + pg_net extensions                                                       |
| DATA-049 | Re-embed worker schedule elke 5 minuten                                           |

## Bronverwijzingen

- PRD: `docs/specs/meeting-processing-review.md` -> sectie 3 "Datamodel"
- PRD: `docs/specs/meeting-processing-review.md` -> sectie 6 "Embedding Strategie"
- PRD: `docs/specs/meeting-processing-review.md` -> sectie 8 "Fases & Milestones", sprint 001

## Context

### Voorbereiding (clean slate)

1. Verwijder alle bestaande migratie-bestanden uit `supabase/migrations/`
2. Alle bestaande tabellen droppen in Supabase (via dashboard of SQL)
3. `supabase_migrations` tabel resetten zodat Supabase de nieuwe migraties accepteert

### Datamodel

**profiles** -- Gekoppeld aan Supabase Auth. Auto-create via trigger.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**organizations** -- Klanten, partners en leveranciers.

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  aliases TEXT[] DEFAULT '{}',
  type TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  status TEXT DEFAULT 'prospect',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**people** -- Personen uit het team en externe contacten.

```sql
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  team TEXT,
  role TEXT,
  embedding VECTOR(1024),
  embedding_stale BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**projects** -- Projecten met organisatie-koppeling.

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  aliases TEXT[] DEFAULT '{}',
  organization_id UUID REFERENCES organizations(id),
  status TEXT DEFAULT 'lead',
  embedding VECTOR(1024),
  embedding_stale BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**meetings** -- Fireflies transcripts met classificatie.

```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fireflies_id TEXT UNIQUE,
  title TEXT NOT NULL,
  date TIMESTAMPTZ,
  participants TEXT[],
  summary TEXT,
  transcript TEXT,
  meeting_type TEXT,
  party_type TEXT,
  organization_id UUID REFERENCES organizations(id),
  unmatched_organization_name TEXT,
  raw_fireflies JSONB,
  relevance_score FLOAT,
  search_vector TSVECTOR,
  embedding VECTOR(1024),
  embedding_stale BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-update search_vector bij INSERT/UPDATE
CREATE OR REPLACE FUNCTION meetings_search_vector_trigger() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('dutch',
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.summary, '') || ' ' ||
    COALESCE(array_to_string(NEW.participants, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meetings_search_vector_update
  BEFORE INSERT OR UPDATE OF title, summary, participants ON meetings
  FOR EACH ROW EXECUTE FUNCTION meetings_search_vector_trigger();
```

**meeting_projects** -- Many-to-many: meetings <-> projects.

```sql
CREATE TABLE meeting_projects (
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (meeting_id, project_id)
);
```

**meeting_participants** -- Many-to-many: meetings <-> people.

```sql
CREATE TABLE meeting_participants (
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  PRIMARY KEY (meeting_id, person_id)
);
```

**extractions** -- Uniforme tabel voor alle AI-extracties.

```sql
CREATE TABLE extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence FLOAT,
  metadata JSONB DEFAULT '{}',
  transcript_ref TEXT,
  organization_id UUID REFERENCES organizations(id),
  project_id UUID REFERENCES projects(id),
  corrected_by UUID REFERENCES profiles(id),
  corrected_at TIMESTAMPTZ,
  search_vector TSVECTOR,
  embedding VECTOR(1024),
  embedding_stale BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-update search_vector bij INSERT/UPDATE
CREATE OR REPLACE FUNCTION extractions_search_vector_trigger() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('dutch',
    COALESCE(NEW.content, '') || ' ' ||
    COALESCE(NEW.transcript_ref, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER extractions_search_vector_update
  BEFORE INSERT OR UPDATE OF content, transcript_ref ON extractions
  FOR EACH ROW EXECUTE FUNCTION extractions_search_vector_trigger();
```

### Indexes

**Vector indexes (HNSW):**

- `people.embedding`
- `projects.embedding`
- `meetings.embedding`
- `extractions.embedding`

**GIN indexes (full-text search):**

- `meetings.search_vector`
- `extractions.search_vector`

**B-tree indexes:**

- `meetings.organization_id`
- `meetings.meeting_type`
- `meetings.fireflies_id` (already UNIQUE)
- `extractions.meeting_id`
- `extractions.type`
- `extractions.organization_id`
- `extractions.project_id`
- `projects.organization_id`

### Search Functions

- `search_all_content(query_embedding, search_text, match_threshold, match_count)` — **hybrid search**: combineert vector similarity + full-text search via RRF (Reciprocal Rank Fusion). Accepteert optioneel een `search_text` parameter voor keyword matching naast de embedding.
- `match_people(query_embedding, match_threshold, match_count)` — entity resolution voor deelnemers
- `match_projects(query_embedding, match_threshold, match_count)` — entity resolution voor projecten
- `search_meetings_by_participant(query_embedding, participant_name, match_threshold, match_count)` — meetings filteren op deelnemer

### Cron

- pg_cron + pg_net extensions
- Schedule: `*/5 * * * *` — re-embed worker elke 5 minuten via HTTP POST

## Prerequisites

- Geen — dit is de eerste sprint.

## Taken

- [ ] Verwijder alle bestaande bestanden in `supabase/migrations/`
- [ ] Maak migratie 1: extensions + profiles + organizations + people + projects
- [ ] Maak migratie 2: meetings + meeting_projects + meeting_participants + extractions
- [ ] Maak migratie 3: HNSW vector indexes + GIN full-text indexes + B-tree indexes
- [ ] Maak migratie 4: search_all_content() als hybrid search (vector + full-text via RRF), match_people(), match_projects(), search_meetings_by_participant()
- [ ] Maak migratie 5: pg_cron + pg_net + re-embed worker schedule
- [ ] Voer alle migraties uit op Supabase en verifieer
- [ ] Regenereer Supabase TypeScript types (`supabase gen types typescript`)
- [ ] Maak seed script `supabase/seed/seed.sql` met initiële organizations, people en projects (idempotent met ON CONFLICT DO UPDATE)
- [ ] Installeer `cohere-ai` SDK (`npm install cohere-ai`) en verwijder `openai` als het alleen voor embeddings gebruikt wordt
- [ ] Maak embedding utility `src/lib/utils/embed.ts` met Cohere embed-v4 wrapper (model `embed-v4.0`, 1024 dimensies, `inputType` parameter voor document vs query)

## Acceptatiecriteria

- [ ] [DATA-001..004] Profiles tabel met auth trigger werkt
- [ ] [DATA-005..010] Organizations tabel met alle kolommen en correcte types/defaults
- [ ] [DATA-011..014] People tabel met UNIQUE email, VECTOR embedding
- [ ] [DATA-015..020] Projects tabel met FK naar organizations, VECTOR embedding
- [ ] [DATA-021..030] Meetings tabel met alle kolommen, geen requires_review
- [ ] [DATA-031..032] Koppeltabellen met composite PKs en CASCADE deletes
- [ ] [DATA-033..041,050] Extractions tabel met confidence, transcript_ref, metadata JSONB, corrected_by/corrected_at
- [ ] [DATA-051..053] search_vector kolommen bestaan op meetings en extractions, GIN indexes aanwezig, triggers werken
- [ ] [DATA-042..043] Vector en B-tree indexes bestaan
- [ ] [DATA-044..047] Search functions retourneren correcte resultaten
- [ ] Hybrid search test: insert een meeting met specifiek keyword, zoek via embedding (semantisch) én via keyword (full-text), verifieer dat beide resultaten opleveren
- [ ] [DATA-048..049] Cron job is gescheduled
- [ ] Handmatig een meeting + extractie inserten en via search_all_content() terugvinden werkt
- [ ] TypeScript types zijn geregenereerd en compileren zonder fouten
- [ ] Seed data staat in organizations, people en projects tabellen

## Geraakt door deze sprint

- `supabase/migrations/*` (alle bestaande verwijderd, 5 nieuwe aangemaakt)
- `supabase/seed/seed.sql` (nieuw)
- `src/lib/types/database.ts` (geregenereerd)
- `src/lib/utils/embed.ts` (nieuw — Cohere embed-v4 wrapper)
- `package.json` (`cohere-ai` toevoegen)
