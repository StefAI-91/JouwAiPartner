# Sprint 020: Database migratie - Segmented Summaries

## Doel

De database uitbreiden met de tabellen en indexes die nodig zijn voor project-gesegmenteerde samenvattingen. Na deze sprint kan het systeem per meeting meerdere project-segmenten opslaan (elk met eigen kernpunten, vervolgstappen en embedding), onbekende entity-namen negeren via een ignored_entities tabel, en de herkomst van meeting-project koppelingen tracken via een source kolom. Dit is de fundatie voor de hele segmentering-feature.

## Requirements

| ID       | Beschrijving                                                                                                |
| -------- | ----------------------------------------------------------------------------------------------------------- |
| DATA-070 | Tabel meeting_project_summaries: id UUID PK                                                                 |
| DATA-071 | Tabel meeting_project_summaries: meeting_id UUID FK -> meetings ON DELETE CASCADE                           |
| DATA-072 | Tabel meeting_project_summaries: project_id UUID nullable FK -> projects ON DELETE SET NULL                 |
| DATA-073 | Tabel meeting_project_summaries: project_name_raw TEXT (originele AI string)                                |
| DATA-074 | Tabel meeting_project_summaries: is_general BOOLEAN GENERATED ALWAYS AS (project_id IS NULL) STORED         |
| DATA-075 | Tabel meeting_project_summaries: kernpunten TEXT[] (array van kernpunt-strings)                             |
| DATA-076 | Tabel meeting_project_summaries: vervolgstappen TEXT[] (array van vervolgstap-strings)                      |
| DATA-077 | Tabel meeting_project_summaries: summary_text TEXT (geformateerde tekst voor embedding)                     |
| DATA-078 | Tabel meeting_project_summaries: embedding VECTOR(1024) (Cohere embed-v4)                                   |
| DATA-079 | Tabel meeting_project_summaries: embedding_stale BOOLEAN DEFAULT true                                       |
| DATA-080 | Tabel meeting_project_summaries: search_vector TSVECTOR (full-text search)                                  |
| DATA-081 | Tabel meeting_project_summaries: created_at TIMESTAMPTZ DEFAULT now()                                       |
| DATA-082 | meeting_projects: source kolom TEXT ('ai', 'manual', 'review')                                              |
| DATA-083 | Tabel ignored_entities: id UUID PK, organization_id UUID FK, entity_name TEXT, entity_type TEXT, created_at |
| DATA-084 | ignored_entities: UNIQUE constraint op (organization_id, entity_name, entity_type)                          |
| DATA-085 | ignored_entities: ON DELETE CASCADE op organization FK                                                      |
| DATA-086 | HNSW vector index op meeting_project_summaries.embedding                                                    |
| DATA-087 | GIN index op meeting_project_summaries.search_vector                                                        |
| DATA-088 | Trigger voor search_vector auto-update op summary_text (dutch config)                                       |
| SEC-006  | RLS policies op meeting_project_summaries (authenticated users, zelfde patroon als v2)                      |
| SEC-007  | RLS policies op ignored_entities (authenticated users, zelfde patroon als v2)                               |

## Bronverwijzingen

- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "3.3 Opslag: meeting_project_summaries" (regels 162-194)
- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "3.5 Foutcorrectie" -> ignored_entities tabel (regels 255-266)
- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "3.4 Embeddings" (regels 196-205)

## Context

### Datamodel

**Nieuwe tabel `meeting_project_summaries`:**

```sql
CREATE TABLE meeting_project_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  project_name_raw TEXT,
  is_general BOOLEAN GENERATED ALWAYS AS (project_id IS NULL) STORED,
  kernpunten TEXT[] DEFAULT '{}',
  vervolgstappen TEXT[] DEFAULT '{}',
  summary_text TEXT NOT NULL,
  embedding VECTOR(1024),
  embedding_stale BOOLEAN NOT NULL DEFAULT true,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Kolom toevoegen aan `meeting_projects`:**

```sql
ALTER TABLE meeting_projects
  ADD COLUMN source TEXT NOT NULL DEFAULT 'ai'
  CHECK (source IN ('ai', 'manual', 'review'));
```

Let op: bestaande rijen in `meeting_projects` krijgen automatisch `source = 'ai'` als default.

**Constraints op `meeting_projects`:** Bestaande composite PK `(meeting_id, project_id)` blijft, plus `ON DELETE CASCADE` op beide FK's (al aanwezig).

**Nieuwe tabel `ignored_entities`:**

```sql
CREATE TABLE ignored_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'organization', 'person')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, entity_name, entity_type)
);
```

**Indexes:**

```sql
-- HNSW vector index voor segment-level vector search
CREATE INDEX idx_meeting_project_summaries_embedding
  ON meeting_project_summaries USING hnsw (embedding vector_cosine_ops);

-- GIN index voor full-text search
CREATE INDEX idx_meeting_project_summaries_search_vector
  ON meeting_project_summaries USING gin (search_vector);

-- B-tree indexes voor veelgebruikte filters
CREATE INDEX idx_meeting_project_summaries_meeting_id
  ON meeting_project_summaries (meeting_id);
CREATE INDEX idx_meeting_project_summaries_project_id
  ON meeting_project_summaries (project_id);
```

**Trigger voor search_vector:**

```sql
CREATE FUNCTION update_meeting_project_summary_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('dutch', COALESCE(NEW.summary_text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_meeting_project_summary_search_vector
  BEFORE INSERT OR UPDATE OF summary_text
  ON meeting_project_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_project_summary_search_vector();
```

**RLS policies:**

Zelfde permissive patroon als de rest van de v2 tabellen:

- `SELECT` voor authenticated users
- `INSERT` voor authenticated users
- `UPDATE` voor authenticated users
- `DELETE` voor authenticated users

### Relevante business rules

- **RULE-001** (bestaand): "Err on keeping" — segmenten worden niet verwijderd, alleen bijgewerkt.
- De volledige samenvatting (`meeting.summary`, `meeting.ai_briefing`) blijft ongewijzigd. Segmenten zijn een afgeleide voor precisie-zoeken en project-context.
- `project_name_raw` wordt altijd bewaard, ook als `project_id` later geresolved wordt. Dit is de originele string van de AI.

## Prerequisites

- [x] Sprint 014: MCP Verification Filter (v2 complete)

## Taken

- [ ] Migratie: `meeting_project_summaries` tabel aanmaken met alle kolommen, constraints en generated column
- [ ] Migratie: `source` kolom toevoegen aan `meeting_projects` met CHECK constraint en default 'ai'
- [ ] Migratie: `ignored_entities` tabel aanmaken met UNIQUE constraint en FK
- [ ] Migratie: HNSW index op embedding, GIN index op search_vector, B-tree indexes op meeting_id en project_id
- [ ] Migratie: trigger voor search_vector auto-update op summary_text (dutch config)
- [ ] Migratie: RLS policies op `meeting_project_summaries` en `ignored_entities` (permissive voor authenticated)
- [ ] TypeScript database types regenereren na migratie

## Acceptatiecriteria

- [ ] [DATA-070..081] Tabel `meeting_project_summaries` bestaat met alle kolommen, types en constraints correct
- [ ] [DATA-074] `is_general` kolom is automatisch `true` wanneer `project_id IS NULL`, niet handmatig instelbaar
- [ ] [DATA-082] `meeting_projects.source` kolom bestaat, bestaande rijen hebben waarde 'ai'
- [ ] [DATA-083..085] Tabel `ignored_entities` bestaat met UNIQUE constraint en CASCADE delete
- [ ] [DATA-086] HNSW vector index actief op embedding kolom
- [ ] [DATA-087] GIN index actief op search_vector kolom
- [ ] [DATA-088] INSERT van een rij met summary_text vult search_vector automatisch
- [ ] [SEC-006] RLS actief op `meeting_project_summaries` — authenticated user kan CRUD uitvoeren
- [ ] [SEC-007] RLS actief op `ignored_entities` — authenticated user kan CRUD uitvoeren
- [ ] TypeScript types bevatten de nieuwe tabellen en kolommen

## Geraakt door deze sprint

- `supabase/migrations/YYYYMMDDHHMMSS_meeting_project_summaries.sql` (nieuw)
- `supabase/migrations/YYYYMMDDHHMMSS_meeting_projects_source.sql` (nieuw)
- `supabase/migrations/YYYYMMDDHHMMSS_ignored_entities.sql` (nieuw)
- `packages/database/src/types/database.ts` (gewijzigd — regenerated)
