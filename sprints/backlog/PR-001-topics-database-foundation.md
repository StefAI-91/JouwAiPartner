# Micro Sprint PR-001: Topics Database Foundation

## Doel

Het pure datalagen-fundament leggen voor de drie-lagen-architectuur (issues → topics → reports): de tabel `topics`, junction-tabel `topic_issues`, RLS-policies, indexes, en de centrale constants in `packages/database/src/constants/topics.ts`. Géén UI, géén queries, géén mutations — alleen schema, RLS en types. Na deze sprint is het bouwfundament klaar voor PR-002 (queries/mutations/Zod) en kunnen PR-003 (DevHub) en PR-004 (Portal) parallel verder.

## Requirements

| ID          | Beschrijving                                                                                                                                                                                                                                                |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-DATA-001 | Tabel `topics` met velden: `id`, `project_id`, `title`, `client_title`, `description`, `client_description`, `type`, `status`, `priority`, `target_sprint_id`, `status_overridden`, `wont_do_reason`, `closed_at`, `created_at`, `created_by`, `updated_at` |
| PR-DATA-002 | Tabel `topic_issues` als junction met `topic_id`, `issue_id` (UNIQUE), `linked_at`, `linked_by`, `linked_via` (CHECK IN `manual`/`agent`/`migration`)                                                                                                       |
| PR-DATA-003 | CHECK constraint: `topics.type IN ('bug', 'feature')`                                                                                                                                                                                                       |
| PR-DATA-004 | CHECK constraint: `topics.status IN (...)` met de 8 lifecycle-statuses uit §11.7                                                                                                                                                                            |
| PR-DATA-005 | CHECK constraint: `topics.priority IN ('P0','P1','P2','P3')` als gevuld                                                                                                                                                                                     |
| PR-DATA-006 | CHECK constraint: `closed_at IS NOT NULL` als `status IN ('done', 'wont_do')` — fase 1 zacht, fase 3 hard                                                                                                                                                   |
| PR-DATA-007 | UNIQUE constraint: een issue kan aan max één topic gekoppeld zijn (`topic_issues.issue_id` UNIQUE)                                                                                                                                                          |
| PR-DATA-008 | Indexes: `(project_id, status)`, `(target_sprint_id)`, `(closed_at)`, `(type, status)`                                                                                                                                                                      |
| PR-SEC-001  | RLS op `topics`: SELECT via `has_portal_access` AND `status NOT IN ('clustering')`; geen INSERT/UPDATE/DELETE voor clients                                                                                                                                  |
| PR-SEC-002  | RLS op `topic_issues`: SELECT via `has_portal_access` op `topic.project_id`; geen mutaties voor clients                                                                                                                                                     |
| PR-DATA-009 | `packages/database/src/constants/topics.ts` exporteert `TOPIC_LIFECYCLE_STATUSES`, `TOPIC_TYPES`, `PORTAL_BUCKETS`, en mapping van status → bucket                                                                                                          |
| PR-DATA-010 | `npm run types:generate` regenereert `database.types.ts` met de nieuwe tabellen                                                                                                                                                                             |
| PR-RULE-001 | Hard-regel: een issue kan aan max één topic gekoppeld zijn (junction met UNIQUE issue_id, niet directe FK)                                                                                                                                                  |
| PR-RULE-002 | Hard-regel: `target_sprint_id` is een tekstveld in v1 (geen FK naar `sprints`-tabel) tenzij die tabel al bestaat — zie I-5 in §13.3                                                                                                                         |

## Afhankelijkheden

- Bestaand: `issues`-tabel met PK `id`, `projects`-tabel met PK `id`, `profiles`-tabel met PK `id`
- Bestaand: helper `has_portal_access(profile_id, project_id)` (gebruikt door bestaande Portal-RLS in `20260418110000_issues_rls_client_hardening.sql`)

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- **I-3** (junction vs directe FK op issues): aanbeveling junction met `topic_issues`, deze sprint volgt die aanbeveling. Stef bevestigen vóór migratie-write.
- **I-5** (sprint-tabel of text-veld voor `target_sprint_id`): grep DevHub-codebase naar bestaande `sprints`-tabel; zo niet → tekstveld in v1. Bevestigen vóór migratie-write.

## Taken

### 1. Migratie 1 — `topics`-tabel

- Maak `supabase/migrations/<datum>_topics.sql`:

  ```sql
  CREATE TABLE IF NOT EXISTS topics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title text NOT NULL,
    client_title text,
    description text,
    client_description text,
    type text NOT NULL CHECK (type IN ('bug','feature')),
    status text NOT NULL DEFAULT 'clustering'
      CHECK (status IN (
        'clustering','awaiting_client_input','prioritized','scheduled',
        'in_progress','done','wont_do','wont_do_proposed_by_client'
      )),
    priority text CHECK (priority IS NULL OR priority IN ('P0','P1','P2','P3')),
    target_sprint_id text, -- v1: text-veld; later FK als sprints-tabel komt (I-5)
    status_overridden boolean NOT NULL DEFAULT false,
    wont_do_reason text,
    closed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid NOT NULL REFERENCES profiles(id),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  -- Auto-update updated_at via trigger (zelfde patroon als andere tabellen)
  CREATE TRIGGER topics_set_updated_at
    BEFORE UPDATE ON topics
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  ```

- **Let op**: in fase 1 is `wont_do_reason` optioneel; in PR-009 (fase 3) komt CHECK voor min 10 chars. Hier alleen kolom toevoegen.

### 2. Migratie 2 — `topic_issues` junction

- Maak `supabase/migrations/<datum>_topic_issues.sql`:

  ```sql
  CREATE TABLE IF NOT EXISTS topic_issues (
    topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    issue_id uuid NOT NULL UNIQUE REFERENCES issues(id) ON DELETE CASCADE,
    linked_at timestamptz NOT NULL DEFAULT now(),
    linked_by uuid NOT NULL REFERENCES profiles(id),
    linked_via text NOT NULL DEFAULT 'manual'
      CHECK (linked_via IN ('manual','agent','migration')),
    PRIMARY KEY (topic_id, issue_id)
  );
  ```

- UNIQUE op `issue_id` borgt de "max één topic per issue"-regel.

### 3. Migratie 3 — RLS-policies

- Maak `supabase/migrations/<datum>_topics_rls.sql`:

  ```sql
  ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
  ALTER TABLE topic_issues ENABLE ROW LEVEL SECURITY;

  -- topics: SELECT voor clients via has_portal_access (excl. clustering)
  CREATE POLICY "topics_select_client_via_portal_access"
    ON topics FOR SELECT
    USING (
      status <> 'clustering'
      AND EXISTS (
        SELECT 1 FROM portal_project_access ppa
        WHERE ppa.profile_id = auth.uid()
          AND ppa.project_id = topics.project_id
      )
    );

  -- topics: SELECT voor admin/member (zonder client-restrictie)
  CREATE POLICY "topics_select_internal"
    ON topics FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin','member')
      )
    );

  -- topics: INSERT/UPDATE/DELETE alleen admin/member
  CREATE POLICY "topics_write_internal_only"
    ON topics FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin','member')
      )
    );

  -- topic_issues: SELECT via has_portal_access op topic.project_id
  CREATE POLICY "topic_issues_select_client"
    ON topic_issues FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM topics t
        JOIN portal_project_access ppa ON ppa.project_id = t.project_id
        WHERE t.id = topic_issues.topic_id
          AND ppa.profile_id = auth.uid()
          AND t.status <> 'clustering'
      )
    );

  CREATE POLICY "topic_issues_write_internal_only"
    ON topic_issues FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin','member')
      )
    );
  ```

- Patroon analoog aan `20260418110000_issues_rls_client_hardening.sql`. Verifieer dat `portal_project_access` en `has_portal_access` bestaan; zo niet, vraag bevestiging vóór schrijven.

### 4. Migratie 4 — indexes

- Maak `supabase/migrations/<datum>_topics_indexes.sql`:

  ```sql
  CREATE INDEX IF NOT EXISTS idx_topics_project_status ON topics(project_id, status);
  CREATE INDEX IF NOT EXISTS idx_topics_target_sprint ON topics(target_sprint_id) WHERE target_sprint_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_topics_closed_at ON topics(closed_at) WHERE closed_at IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_topics_type_status ON topics(type, status);
  CREATE INDEX IF NOT EXISTS idx_topic_issues_topic ON topic_issues(topic_id);
  CREATE INDEX IF NOT EXISTS idx_topic_issues_issue ON topic_issues(issue_id);
  ```

### 5. Constants-bestand

- Maak `packages/database/src/constants/topics.ts`:

  ```typescript
  export const TOPIC_LIFECYCLE_STATUSES = [
    "clustering",
    "awaiting_client_input",
    "prioritized",
    "scheduled",
    "in_progress",
    "done",
    "wont_do",
    "wont_do_proposed_by_client",
  ] as const;
  export type TopicLifecycleStatus = (typeof TOPIC_LIFECYCLE_STATUSES)[number];

  export const TOPIC_TYPES = ["bug", "feature"] as const;
  export type TopicType = (typeof TOPIC_TYPES)[number];

  export const PORTAL_BUCKETS = [
    { key: "recent_done", label: "Recent gefixt" },
    { key: "upcoming", label: "Komende week" },
    { key: "high_prio", label: "Hoge prio daarna" },
    { key: "awaiting_input", label: "Niet geprioritiseerd" },
  ] as const;
  export type PortalBucketKey = (typeof PORTAL_BUCKETS)[number]["key"];

  // Mapping topic-status → portal-bucket. clustering en wont_do (en _proposed_by_client) zijn niet zichtbaar voor klant.
  export function topicStatusToBucket(
    status: TopicLifecycleStatus,
    closedAt: string | null,
  ): PortalBucketKey | null {
    if (status === "done") {
      if (!closedAt) return null;
      const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
      return new Date(closedAt).getTime() >= cutoff ? "recent_done" : null;
    }
    if (status === "in_progress" || status === "scheduled") return "upcoming";
    if (status === "prioritized") return "high_prio";
    if (status === "awaiting_client_input") return "awaiting_input";
    return null; // clustering, wont_do, wont_do_proposed_by_client zijn verborgen in fase 1
  }
  ```

- **Belangrijk**: voor "Komende week" geldt ook nog "in current/next sprint" — die check kan níét in deze pure functie omdat we het sprint-context niet hier weten. Voeg een TODO-comment toe en laat het sprint-filter in PR-002 (queries) live, niet hier.

### 6. Type-regeneratie

- Run `npm run types:generate` (zie `packages/database/README.md` voor exact commando)
- Verifieer dat `database.types.ts` de nieuwe tabellen heeft
- Commit gegenereerd bestand mee

## Acceptatiecriteria

- [ ] PR-DATA-001 t/m PR-DATA-008: migraties 1+2 draaien idempotent (tweede keer geen errors)
- [ ] PR-SEC-001/002: RLS-policies aanwezig — verifieer met SQL: `SELECT polname FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('topics','topic_issues');`
- [ ] PR-DATA-009: `packages/database/src/constants/topics.ts` bestaat met de juiste exports
- [ ] PR-DATA-010: `database.types.ts` bevat `topics` en `topic_issues` types
- [ ] PR-RULE-001: probeer 2 keer hetzelfde issue aan 2 verschillende topics te koppelen → krijgt UNIQUE-constraint-error
- [ ] `npm run type-check` slaagt zonder errors
- [ ] `npm run lint` slaagt
- [ ] `npm run check:queries` slaagt (geen directe `.from('topics')` in apps — er bestaan nog geen queries)
- [ ] Idempotency-test: migraties 2x draaien zonder error

## Risico's

| Risico                                                                    | Mitigatie                                                                             |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `has_portal_access` of `portal_project_access` heet anders in de codebase | Verifieer naam vóór migratie-write; pas aan naar werkelijke helper-naam               |
| `set_updated_at`-trigger-functie bestaat nog niet                         | Check andere migraties (bv. issues); zo niet, voeg trigger-functie als migratie 0 toe |
| `gen_random_uuid()` werkt niet zonder `pgcrypto`                          | Bestaande migraties gebruiken het al; verifieer dat pgcrypto extension actief is      |
| Sprint-tabel bestaat tóch in DevHub (I-5)                                 | Stop, vraag bevestiging, maak target_sprint_id FK in plaats van text                  |

## Bronverwijzingen

- PRD: `docs/specs/prd-portal-roadmap/06-fase-1-basis.md` §6.5, §6.6 (DB-laag)
- PRD: `docs/specs/prd-portal-roadmap/11-data-model.md` §11.2 (topics), §11.3 (topic_issues), §11.7 (statuses), §11.10 (RLS), §11.11 (migratie-volgorde)
- PRD: `docs/specs/prd-portal-roadmap/13-validatie-en-open-vragen.md` §13.3 I-3, I-5
- Bestaand patroon: `supabase/migrations/20260418110000_issues_rls_client_hardening.sql` (RLS-template)
- CLAUDE.md: Database & Queries (cluster-criteria)

## Vision-alignment

Past direct in vision §2.4 (Portal als trust layer): topics zijn de curatielaag die klant-zicht en team-werk in één auditeerbare bron verbindt. Database-first communicatie is het kernprincipe — geen state buiten de DB.
