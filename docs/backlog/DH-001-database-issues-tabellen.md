# Micro Sprint DH-001: Database — Issues tabellen, indexes en RLS

## Doel

Alle database-tabellen aanmaken die DevHub nodig heeft: `issues`, `issue_comments`, `issue_activity`, en `devhub_project_access`. Inclusief alle indexes en RLS policies. Daarnaast worden twee kolommen toegevoegd aan de bestaande `projects` tabel: `userback_project_id` en `project_key`. Na deze sprint kan de database issues opslaan en zijn alle security policies actief.

## Requirements

| ID            | Beschrijving                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| DATA-101..162 | Alle kolommen, constraints, indexes voor issues, issue_comments, issue_activity, devhub_project_access tabellen + projects extensie |
| SEC-101..114  | RLS policies op alle vier tabellen                                                                                                  |
| AUTH-103      | Guest role voorbereid in datamodel (devhub_project_access tabel met role kolom)                                                     |

## Bronverwijzingen

- PRD: `docs/specs/prd-devhub.md` -> sectie "5.2 Data Model" (regels 212-318)
- PRD: `docs/specs/prd-devhub.md` -> sectie "RLS Policies (fase 1)" (regels 320-354)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Issue Nummering" (regels 789-798)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Configuratie per project" (regels 675-681)

## Context

### Datamodel

**Tabel `issues`** — hoofdtabel voor alle bugs, feature requests en vragen:

```sql
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'bug',           -- 'bug' | 'feature_request' | 'question'
  status TEXT NOT NULL DEFAULT 'triage',        -- 'triage' | 'backlog' | 'todo' | 'in_progress' | 'done' | 'cancelled'
  priority TEXT NOT NULL DEFAULT 'medium',     -- 'urgent' | 'high' | 'medium' | 'low'
  component TEXT,                              -- 'frontend' | 'backend' | 'api' | 'database' | 'prompt_ai' | 'unknown'
  severity TEXT,                               -- 'critical' | 'high' | 'medium' | 'low'
  labels TEXT[] DEFAULT '{}',
  assigned_to UUID REFERENCES profiles(id),
  reporter_name TEXT,
  reporter_email TEXT,
  source TEXT NOT NULL DEFAULT 'manual',       -- 'userback' | 'widget' | 'manual' | 'email'
  userback_id TEXT UNIQUE,
  source_url TEXT,
  source_metadata JSONB DEFAULT '{}',
  ai_classification JSONB DEFAULT '{}',
  ai_classified_at TIMESTAMPTZ,
  embedding vector(1024),                      -- Cohere embed-v4 voor duplicate detection
  duplicate_of_id UUID REFERENCES issues(id),  -- origineel issue als dit een duplicaat is
  similarity_score REAL,                       -- cosine similarity bij duplicate match
  issue_number INTEGER NOT NULL,                -- auto-increment per project (via issue_number_seq tabel)
  execution_type TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'ai_assisted' | 'ai_autonomous'
  ai_context JSONB DEFAULT '{}',
  ai_result JSONB DEFAULT '{}',
  ai_executable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);
```

**Indexes op `issues`:**

- `idx_issues_project_id` op (project_id)
- `idx_issues_status` op (status)
- `idx_issues_assigned_to` op (assigned_to)
- `idx_issues_priority` op (priority)
- `idx_issues_type` op (type)
- `idx_issues_userback_id` op (userback_id)
- `idx_issues_created_at` op (created_at DESC)

**Tabel `issue_comments`:**

```sql
CREATE TABLE issue_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_issue_comments_issue_id ON issue_comments(issue_id);
```

**Tabel `issue_activity`:**

```sql
CREATE TABLE issue_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,  -- 'created' | 'status_changed' | 'assigned' | 'priority_changed' | 'classified' | 'commented' | 'label_added' | 'label_removed'
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_issue_activity_issue_id ON issue_activity(issue_id);
CREATE INDEX idx_issue_activity_created_at ON issue_activity(created_at DESC);
```

**Tabel `devhub_project_access`:**

```sql
CREATE TABLE devhub_project_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',  -- 'admin' | 'member' | 'guest'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, project_id)
);
CREATE INDEX idx_devhub_project_access_profile_id ON devhub_project_access(profile_id);
CREATE INDEX idx_devhub_project_access_project_id ON devhub_project_access(project_id);
```

**Tabel `issue_number_seq`** — sequence tabel voor race-condition-vrije issue nummering per project:

```sql
CREATE TABLE issue_number_seq (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  last_number INTEGER NOT NULL DEFAULT 0
);
```

Bij het aanmaken van een issue wordt het volgende nummer opgehaald via een transactie:

```sql
INSERT INTO issue_number_seq (project_id, last_number)
  VALUES ($1, 1)
  ON CONFLICT (project_id)
  DO UPDATE SET last_number = issue_number_seq.last_number + 1
  RETURNING last_number;
```

**Extensie bestaande `projects` tabel:**

```sql
ALTER TABLE projects ADD COLUMN userback_project_id TEXT;
ALTER TABLE projects ADD COLUMN project_key TEXT UNIQUE;
```

### RLS Policies

Fase 1 is permissive: alle authenticated users hebben volledige toegang. Guest role filtering komt in fase 2.

**Issues:**

- SELECT: `auth.role() = 'authenticated'`
- INSERT: `auth.role() = 'authenticated'`
- UPDATE: `auth.role() = 'authenticated'`

**Comments:**

- SELECT: `auth.role() = 'authenticated'`
- INSERT: `auth.role() = 'authenticated'`
- UPDATE: `auth.uid() = author_id` (alleen eigen comments)

**Activity:**

- SELECT: `auth.role() = 'authenticated'`
- INSERT: `auth.role() = 'authenticated'`

**Project access:**

- SELECT: `auth.role() = 'authenticated'`
- ALL: `auth.role() = 'authenticated'`

## Prerequisites

- Geen. Dit is de eerste sprint. De bestaande `projects`, `people`, en `profiles` tabellen moeten bestaan (ze bestaan al in de huidige database).

## Taken

- [ ] Maak migratie `supabase/migrations/YYYYMMDDHHMMSS_devhub_issues.sql` met `issues` tabel + `issue_number_seq` tabel + alle indexes
- [ ] Maak migratie `supabase/migrations/YYYYMMDDHHMMSS_devhub_comments_activity.sql` met `issue_comments` en `issue_activity` tabellen + indexes
- [ ] Maak migratie `supabase/migrations/YYYYMMDDHHMMSS_devhub_project_access.sql` met `devhub_project_access` tabel + indexes
- [ ] Maak migratie `supabase/migrations/YYYYMMDDHHMMSS_devhub_rls_policies.sql` met alle RLS policies
- [ ] Maak migratie `supabase/migrations/YYYYMMDDHHMMSS_projects_devhub_columns.sql` die `userback_project_id` en `project_key` toevoegt aan `projects`
- [ ] Regenereer TypeScript types (`npx supabase gen types typescript`)

## Acceptatiecriteria

- [ ] [DATA-101..127] Tabel `issues` bestaat met alle kolommen, types en constraints zoals gespecificeerd (assigned_to verwijst naar profiles(id))
- [ ] Tabel `issue_number_seq` bestaat met project_id PK en last_number kolom
- [ ] [DATA-128..134] Alle 7 indexes op `issues` bestaan
- [ ] [DATA-135..141] Tabel `issue_comments` bestaat met correcte FK's en index
- [ ] [DATA-142..152] Tabel `issue_activity` bestaat met correcte FK's en 2 indexes
- [ ] [DATA-153..160] Tabel `devhub_project_access` bestaat met UNIQUE constraint en 2 indexes
- [ ] [DATA-161] `projects.userback_project_id` kolom bestaat
- [ ] [DATA-162] `projects.project_key` kolom bestaat met UNIQUE constraint
- [ ] [SEC-101..114] RLS is enabled op alle 4 tabellen en alle policies zijn actief
- [ ] [SEC-108] Comments UPDATE policy filtert op `auth.uid() = author_id`
- [ ] Handmatig INSERT in `issues` werkt voor authenticated user
- [ ] TypeScript types zijn geregenereerd en bevatten de nieuwe tabellen

## Geraakt door deze sprint

- `supabase/migrations/YYYYMMDDHHMMSS_devhub_issues.sql` (nieuw)
- `supabase/migrations/YYYYMMDDHHMMSS_devhub_comments_activity.sql` (nieuw)
- `supabase/migrations/YYYYMMDDHHMMSS_devhub_project_access.sql` (nieuw)
- `supabase/migrations/YYYYMMDDHHMMSS_devhub_rls_policies.sql` (nieuw)
- `supabase/migrations/YYYYMMDDHHMMSS_projects_devhub_columns.sql` (nieuw)
- `packages/database/src/types/database.ts` (geregenereerd)
