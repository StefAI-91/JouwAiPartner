# Micro Sprint PR-011: Status-Rapport Entiteit + Draft/Publish Flow

## Doel

De data-laag voor fase 4 (narratieve snapshots): tabel `topic_status_reports` met content_snapshot (jsonb), narrative_note (markdown), patterns_section (jsonb), draft/published/archived-status. Plus de queries + mutations om een rapport te creëren (draft), te bewerken, en te publiceren. **Geen UI** (komt in PR-012/PR-013). Snapshots zijn écht bevroren — als topic-status morgen verandert, het oude rapport blijft hetzelfde.

## Requirements

| ID          | Beschrijving                                                                                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-DATA-060 | Tabel `topic_status_reports` met velden uit §11.8: `id`, `project_id`, `template`, `compiled_at`, `compiled_by`, `narrative_note`, `content_snapshot`, `patterns_section`, `published_at`, `status`, `created_at`, `updated_at` |
| PR-DATA-061 | CHECK constraint: `status IN ('draft','published','archived')`                                                                                                                                                                  |
| PR-DATA-062 | CHECK constraint: `template = 'weekly'` in v1 (uitbreiden later voor sprint-einde/maand/ad-hoc)                                                                                                                                 |
| PR-DATA-063 | Indexes: `(project_id, status)`, `(published_at DESC)` voor archief-listing                                                                                                                                                     |
| PR-SEC-030  | RLS: SELECT voor clients via `has_portal_access` AND `status = 'published'`; admin/member: alle statuses; INSERT/UPDATE/DELETE alleen admin/member                                                                              |
| PR-REQ-110  | `buildContentSnapshot(projectId, timeWindow, client?)` — utility die huidige topic-state samenstelt voor draft (zonder `live`-binding)                                                                                          |
| PR-REQ-111  | `listReports({ projectId, status?, includeUnpublished? }, client?)` retourneert lijst                                                                                                                                           |
| PR-REQ-112  | `listPublishedReports(projectId, client?)` voor Portal-archief                                                                                                                                                                  |
| PR-REQ-113  | `getReportById(reportId, client?)` met RLS — clients krijgen alleen published                                                                                                                                                   |
| PR-REQ-114  | `insertReport({ projectId, template, compiled_by, content_snapshot, narrative_note?, patterns_section? }, client?)` — creates draft                                                                                             |
| PR-REQ-115  | `updateReport(reportId, { narrative_note?, patterns_section?, content_snapshot? }, client?)` — alleen op `status='draft'` toegestaan                                                                                            |
| PR-REQ-116  | `publishReport(reportId, client?)` — set `published_at = now()`, `status = 'published'`; eenmalig (kan niet terug naar draft)                                                                                                   |
| PR-REQ-117  | `archiveReport(reportId, client?)` — alleen vanaf `published`; set `status = 'archived'`                                                                                                                                        |
| PR-REQ-118  | Zod-schemas: `createReportDraftSchema`, `updateReportSchema`, `publishReportSchema`                                                                                                                                             |
| PR-RULE-040 | Hard-regel: gepubliceerd rapport is bevroren — `content_snapshot` wijzigt nooit na publish                                                                                                                                      |

## Afhankelijkheden

- **PR-001** (topics) + **PR-002** (queries) — voor `buildContentSnapshot`
- **PR-005** (signals) — snapshot bevat klant-signaal per topic
- **PR-009** (events) — snapshot kan events_in_period meenemen

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- Geen — datamodel is in §11.8 vastgelegd

## Taken

### 1. Migratie

- `supabase/migrations/<datum>_topic_status_reports.sql`:

  ```sql
  CREATE TABLE IF NOT EXISTS topic_status_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    template text NOT NULL DEFAULT 'weekly' CHECK (template IN ('weekly','sprint_end','monthly','ad_hoc')),
    compiled_at timestamptz NOT NULL,
    compiled_by uuid NOT NULL REFERENCES profiles(id),
    narrative_note text,
    content_snapshot jsonb NOT NULL,
    patterns_section jsonb NOT NULL DEFAULT '[]',
    published_at timestamptz,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TRIGGER reports_set_updated_at
    BEFORE UPDATE ON topic_status_reports
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

  CREATE INDEX IF NOT EXISTS idx_reports_project_status ON topic_status_reports(project_id, status);
  CREATE INDEX IF NOT EXISTS idx_reports_published ON topic_status_reports(published_at DESC) WHERE published_at IS NOT NULL;
  ```

### 2. RLS

- `supabase/migrations/<datum>_topic_status_reports_rls.sql`:

  ```sql
  ALTER TABLE topic_status_reports ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "reports_select_client_published" ON topic_status_reports FOR SELECT
    USING (
      status = 'published'
      AND EXISTS (
        SELECT 1 FROM portal_project_access ppa
        WHERE ppa.profile_id = auth.uid()
          AND ppa.project_id = topic_status_reports.project_id
      )
    );

  CREATE POLICY "reports_select_internal" ON topic_status_reports FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','member')));

  CREATE POLICY "reports_write_internal" ON topic_status_reports FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','member')));
  ```

### 3. `buildContentSnapshot`-utility

- `packages/database/src/queries/reports/snapshot.ts`:

  ```typescript
  export type ContentSnapshot = {
    compiled_at: string;
    topics_by_bucket: Record<PortalBucketKey, SnapshotTopic[]>;
    metadata: { total_topics: number; total_events_in_window: number };
  };
  export type SnapshotTopic = {
    topic_id: string;
    title: string;
    client_title: string | null;
    client_description: string | null;
    type: TopicType;
    status_at_compile: TopicLifecycleStatus;
    priority: string | null;
    linked_issues_count: number;
    client_signal: string | null;
    bucket: PortalBucketKey;
    events_in_period: Array<{ event_type: string; from?: string; to?: string; at: string }>;
  };

  export async function buildContentSnapshot(
    projectId: string,
    timeWindow: { from: string; to: string },
    client?: SupabaseClient,
  ): Promise<ContentSnapshot> {
    // Roep listTopicsByBucket, voor elk topic: getEventsForTopic gefilterd op time window
    // Map naar SnapshotTopic
    // Return als jsonb-serialiseerbaar
  }
  ```

### 4. Queries cluster

- Maak `packages/database/src/queries/reports/`:

  ```
  packages/database/src/queries/reports/
  ├── index.ts
  ├── list.ts        # listReports, listPublishedReports
  ├── detail.ts      # getReportById
  ├── snapshot.ts    # buildContentSnapshot (utility, geen DB-write)
  └── README.md
  ```

- **Cluster-rationale**: report-domein heeft eigen sub-domeinen (list/detail/snapshot-build) en compositiepagina's in beide apps — cluster.

### 5. Mutations cluster

- Maak `packages/database/src/mutations/reports/`:

  ```
  packages/database/src/mutations/reports/
  ├── index.ts
  ├── crud.ts        # insertReport (draft), updateReport, archiveReport
  ├── publish.ts     # publishReport
  └── README.md
  ```

- `publish.ts`:

  ```typescript
  export async function publishReport(reportId: string, client: SupabaseClient) {
    const report = await getReportById(reportId, client);
    if (!report) throw new Error("Report not found");
    if (report.status !== "draft") throw new Error("Only drafts can be published");
    return await client
      .from("topic_status_reports")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", reportId)
      .select()
      .single();
  }
  ```

- `updateReport`: faalt met error als `report.status !== 'draft'` (PR-RULE-040 — bevroren na publish)

### 6. Zod-schemas

- `packages/database/src/validations/reports.ts`:

  ```typescript
  export const createReportDraftSchema = z.object({
    project_id: z.string().uuid(),
    template: z.enum(["weekly", "sprint_end", "monthly", "ad_hoc"]).default("weekly"),
    time_window: z.object({ from: z.string().datetime(), to: z.string().datetime() }),
    narrative_note: z.string().max(5000).optional(),
    patterns_section: z.array(z.object({ title: z.string(), description: z.string() })).optional(),
  });

  export const updateReportSchema = z.object({
    narrative_note: z.string().max(5000).optional(),
    patterns_section: z.array(z.object({ title: z.string(), description: z.string() })).optional(),
  });
  ```

### 7. Tests

- Vitest integration: maak draft, update, publish → check `published_at` gezet, status `published`
- Test bevroren-eigenschap: maak rapport, wijzig topic-status, fetch rapport → `content_snapshot` ongewijzigd
- Test `updateReport` op published faalt met error
- RLS-test: client ziet alleen published; draft niet

## Acceptatiecriteria

- [ ] PR-DATA-060 t/m PR-DATA-063: migratie idempotent, indexes
- [ ] PR-SEC-030: RLS getoetst — client-account ziet alleen published
- [ ] PR-REQ-110: snapshot-utility geeft alle 4 buckets met topics
- [ ] PR-REQ-111 t/m PR-REQ-117: queries en mutations werken
- [ ] PR-REQ-118: Zod-schemas exporteren
- [ ] PR-RULE-040: bevroren-test slaagt
- [ ] Type-check + lint + check:queries slagen

## Risico's

| Risico                                                    | Mitigatie                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------- |
| Snapshot wordt te groot (jsonb >1MB) bij veel topics      | Cap op 100 topics per snapshot; events_in_period limit op 20 per topic    |
| Bevroren-eigenschap geschonden door indirect derived data | Render gebruikt alleen `content_snapshot`, nooit live-query naar `topics` |
| `publishReport` race-condition (2 users tegelijk)         | UPDATE met `WHERE status = 'draft'`; zien dat 1 row wordt geüpdatet       |
| Storage groei                                             | Archive-flow voor rapporten ouder dan 6 mnd in v2                         |

## Bronverwijzingen

- PRD: `docs/specs/prd-portal-roadmap/09-fase-4-narratief.md` §9.3.1, §9.5 (entiteit + DB)
- PRD: `docs/specs/prd-portal-roadmap/11-data-model.md` §11.8 (data-model)

## Vision-alignment

Vision §2.4 — narratief is dé toplaag van klant-zicht. Bevroren snapshots zijn auditeerbare artefacten die "verification before truth" letterlijk maken: een rapport is een verifieerde versie van werkelijkheid op tijdstip X.
