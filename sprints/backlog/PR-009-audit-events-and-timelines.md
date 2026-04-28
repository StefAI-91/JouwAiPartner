# Micro Sprint PR-009: Audit-events Tabel + Logging + UI-Timelines

## Doel

De `topic_events`-tabel uit §11.6 implementeren, alle relevante mutaties (status-change, link/unlink, override, signal-set, publish) gaan events schrijven, en de timeline tonen in DevHub (full version met team-actor-namen) en Portal (simplified version zonder actor-namen). Dit is dé bron van waarheid voor "hoe is dit topic in deze status beland?" en het fundament voor pattern-detection in fase 5.

## Requirements

| ID            | Beschrijving                                                                                                                                                                                                                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-DATA-040   | Tabel `topic_events` met `id`, `topic_id`, `event_type`, `actor_profile_id`, `agent_id`, `confidence`, `accepted_by`, `payload jsonb`, `created_at`                                                                                                                                                                                       |
| PR-DATA-041   | CHECK constraint of expliciete enum-set voor `event_type` met 18 waarden uit §11.6.1                                                                                                                                                                                                                                                      |
| PR-DATA-042   | Indexes: `(topic_id, created_at DESC)`, `(event_type)`, `(agent_id) WHERE NOT NULL`                                                                                                                                                                                                                                                       |
| PR-SEC-020    | RLS op `topic_events`: SELECT voor clients via `has_portal_access` (gefilterde subset); INSERT/UPDATE/DELETE alleen admin/member                                                                                                                                                                                                          |
| PR-REQ-090    | Mutations loggen events automatisch: `topic_created` op insertTopic, `status_changed` op updateTopicStatus, `issue_linked`/`unlinked` op link/unlink, `priority_changed`, `target_sprint_changed`, `client_title_changed`, `client_description_changed`, `published_to_portal`, `client_signal_set`, `status_override_enabled`/`disabled` |
| PR-REQ-091    | `payload` bevat event-specifieke data (zie §11.6.2) — bv. `{ from, to, trigger }` voor status_changed                                                                                                                                                                                                                                     |
| PR-REQ-092    | `getEventsForTopic(topicId, limit?, client?)` retourneert events oudste/nieuwste eerst (param)                                                                                                                                                                                                                                            |
| PR-REQ-093    | DevHub topic-detail toont volledige timeline met datum, actor-naam, event-tekst                                                                                                                                                                                                                                                           |
| PR-REQ-094    | Portal topic-detail toont simplified timeline zonder team-actor-namen ("opgepakt" i.p.v. "Stef heeft topic aangemaakt")                                                                                                                                                                                                                   |
| PR-REQ-095    | Pagination: timeline toont laatste 50 events, "Toon meer"-knop laadt volgende 50                                                                                                                                                                                                                                                          |
| PR-REQ-096    | `logTopicEvent` is intern (geen Server Action) — wordt automatisch aangeroepen vanuit mutations                                                                                                                                                                                                                                           |
| PR-DESIGN-030 | DevHub: verticale rule met dots, datum in mono uppercase, tekst in body. Laatste event = brand-groen + soft-glow ring (§14.4 editorial details)                                                                                                                                                                                           |
| PR-DESIGN-031 | Portal: subtieler, geen actor-namen, geen brand-glow — alleen datum + actie                                                                                                                                                                                                                                                               |

## Afhankelijkheden

- **PR-001** (topics)
- **PR-002** (basis-mutations) — alle die nu events moeten loggen
- **PR-005** (signals) — voor `client_signal_set`-events
- **PR-007** (auto-rollup) — voor `status_changed` met `trigger=auto_rollup`
- **PR-003** + **PR-004** (UI-pagina's voor timelines)

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- Geen — datamodel is in §11.6 vastgelegd

## Visuele referentie

- Live preview: `/design-preview/roadmap` § 06 (audit-timeline.tsx)
- Design-spec: §14.4 "Editorial details" — verticale rule, dots, brand-groen + glow voor laatste event

## Migreren vanuit preview

| Preview-bestand                                                 | Productie-doel                                                 | Wat doen                                                                                                                                               |
| --------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/portal/src/components/roadmap-preview/audit-timeline.tsx` | `apps/portal/src/components/roadmap/audit-timeline-simple.tsx` | Migreren as portal-versie (zonder actor-namen); maak DevHub-variant met meer detail in `apps/devhub/src/features/topics/components/audit-timeline.tsx` |

## Taken

### 1. Migratie — `topic_events`

- `supabase/migrations/<datum>_topic_events.sql`:

  ```sql
  CREATE TABLE IF NOT EXISTS topic_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    event_type text NOT NULL CHECK (event_type IN (
      'topic_created','topic_deleted',
      'issue_linked','issue_unlinked',
      'status_changed','status_override_enabled','status_override_disabled',
      'priority_changed','target_sprint_changed',
      'client_title_changed','client_description_changed',
      'wont_do_set','published_to_portal',
      'client_signal_set',
      'agent_suggestion_proposed','agent_suggestion_accepted','agent_suggestion_rejected',
      'topics_merged','topic_split'
    )),
    actor_profile_id uuid REFERENCES profiles(id),
    agent_id text,
    confidence real,
    accepted_by uuid REFERENCES profiles(id),
    payload jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_topic_events_topic_time ON topic_events(topic_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_topic_events_type ON topic_events(event_type);
  CREATE INDEX IF NOT EXISTS idx_topic_events_agent ON topic_events(agent_id) WHERE agent_id IS NOT NULL;
  ```

- **Note**: `agent_id`/`confidence`/`accepted_by` worden in PR-018 toegevoegd; in deze sprint voegen we ze al toe als nullable kolommen — geen extra migratie later nodig.

### 2. RLS-policy

- `supabase/migrations/<datum>_topic_events_rls.sql`:

  ```sql
  ALTER TABLE topic_events ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "events_select_client" ON topic_events FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM topics t
        JOIN portal_project_access ppa ON ppa.project_id = t.project_id
        WHERE t.id = topic_events.topic_id
          AND ppa.profile_id = auth.uid()
          AND t.status <> 'clustering'
      )
    );

  CREATE POLICY "events_select_internal" ON topic_events FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','member')));

  CREATE POLICY "events_write_internal" ON topic_events FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','member')));
  ```

### 3. `logTopicEvent` helper

- `packages/database/src/mutations/topics/events.ts`:

  ```typescript
  export type LogTopicEventInput = {
    topic_id: string;
    event_type: TopicEventType;
    actor_profile_id?: string | null;
    agent_id?: string | null;
    confidence?: number | null;
    accepted_by?: string | null;
    payload?: Record<string, unknown>;
  };
  export async function logTopicEvent(input: LogTopicEventInput, client: SupabaseClient) {
    return await client.from("topic_events").insert({ ...input, payload: input.payload ?? {} });
  }
  ```

### 4. Hook in bestaande mutations

- Update mutations uit PR-002, PR-005, PR-007 om event te loggen:
  - `insertTopic` → `topic_created` met `payload: { type, project_id }`
  - `updateTopicStatus` → `status_changed` met `payload: { from, to, trigger }` (trigger: `manual` of `auto_rollup`)
  - `updateTopic` → bij wijziging van `priority` → `priority_changed`; `target_sprint_id` → `target_sprint_changed`; `client_title` → `client_title_changed`; etc. — diff vóór UPDATE en log per gewijzigd veld
  - `deleteTopic` → `topic_deleted` (op een aparte audit-tabel? Topic is dan weg — mogelijk events ook cascade-deleten; bewust niet loggen want topic bestaat niet meer)
  - `linkIssueToTopic` / `unlinkIssueFromTopic` → `issue_linked` / `issue_unlinked` met `payload: { issue_id, via }`
  - `setClientSignal` → `client_signal_set` met `payload: { signal, previous }`
  - `recomputeTopicStatus` → `status_changed` met `trigger=auto_rollup`
  - `toggleStatusOverride` (PR-007) → `status_override_enabled` of `_disabled`

- **Pattern**: in elke mutation, na success, roep `logTopicEvent` met dezelfde client-instance. Geen aparte transactie — best-effort.

### 5. Query

- `packages/database/src/queries/topics/events.ts`:

  ```typescript
  export async function getEventsForTopic(
    topicId: string,
    opts?: { limit?: number; offset?: number },
    client?: SupabaseClient,
  ) {
    return await (client ?? getAdminClient())
      .from("topic_events")
      .select(
        "id, event_type, actor_profile_id, agent_id, payload, created_at, profiles:actor_profile_id(name)",
      )
      .eq("topic_id", topicId)
      .order("created_at", { ascending: false })
      .range(opts?.offset ?? 0, (opts?.offset ?? 0) + (opts?.limit ?? 50) - 1);
  }
  ```

### 6. DevHub timeline UI

- `apps/devhub/src/features/topics/components/audit-timeline.tsx`:
  - Server Component
  - Props: `topicId`
  - Fetch `getEventsForTopic(topicId)`
  - Render verticale rule met dots; per event: datum (mono uppercase), event-tekst (humanized — "topic created (Stef)"), payload-detail
  - Laatste event krijgt brand-groen dot + soft-glow ring (§14.4)
  - "Toon meer"-knop voor pagination

### 7. Portal simplified timeline

- `apps/portal/src/components/roadmap/audit-timeline-simple.tsx`:
  - Server Component
  - Filter events op klant-relevante types (status_changed, client_signal_set, published_to_portal, wont_do_set, scheduled)
  - Vertaal naar klanttaal: "14 april — opgepakt", "16 april — door jullie als must-have gemarkeerd", "23 april — afgerond"
  - Geen team-actor-namen

### 8. Event-vertaler

- `packages/database/src/queries/topics/event-translator.ts` (utility):
  - `humanizeEventForTeam(event): string` — voor DevHub
  - `humanizeEventForClient(event): string | null` — voor Portal (null = filter weg)

## Acceptatiecriteria

- [ ] PR-DATA-040 t/m PR-DATA-042: migratie idempotent, indexes aanwezig
- [ ] PR-SEC-020: RLS getoetst met andere-org-account
- [ ] PR-REQ-090: alle relevante mutations schrijven events (test: maak topic, update status, link issue, check `topic_events` rijen)
- [ ] PR-REQ-091: payloads kloppen volgens §11.6.2 voorbeelden
- [ ] PR-REQ-092: query retourneert correct, met pagination
- [ ] PR-REQ-093/094: DevHub volledig, Portal simplified
- [ ] PR-REQ-095: pagination werkt
- [ ] PR-REQ-096: `logTopicEvent` is intern (niet exposed als Server Action)
- [ ] PR-DESIGN-030/031: visueel komt overeen met §14 + preview
- [ ] Type-check + lint + check:queries slagen
- [ ] Vitest: humanizers testen voor alle event-types

## Risico's

| Risico                                                               | Mitigatie                                                                           |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Audit-events explodeert in volume (1000+ per topic)                  | Index op (topic_id, created_at), pagination 50 events; event-pruning na 6 mnd in v2 |
| Portal toont verkeerde events (lekt team-acties)                     | `humanizeEventForClient` filter op whitelist van event-types; default: null         |
| Mutation-event-write faalt halverwege                                | Best-effort logging; DB-transactie niet vereist; in v2 evt. message-queue           |
| Diff-detection in `updateTopic` schrijft event voor onveranderd veld | Vergelijk old vs new; alleen log als verschilt                                      |
| `topic_deleted` heeft geen topic meer om FK te respecteren           | ON DELETE CASCADE op topic_id; events verdwijnen mee. Bewust geen orphan-log.       |

## Bronverwijzingen

- PRD: `docs/specs/prd-portal-roadmap/08-fase-3-lifecycle.md` §8.3.4, §8.3.5 (audit + timelines)
- PRD: `docs/specs/prd-portal-roadmap/11-data-model.md` §11.6 (events tabel + types + payloads)
- PRD: `docs/specs/prd-portal-roadmap/14-design-keuzes.md` §14.4 (editorial details)
- PRD: `docs/specs/prd-portal-roadmap/12-devhub-workflow.md` §12.6 (audit-trail)

## Vision-alignment

Vision-kernprincipe "Database als communication bus, all agent coordination via DB rows" — events zijn dé manifestatie hiervan. Klant kan zien dat status niet stilletjes is gewijzigd; team kan reconstrueren waarom; agents in fase 5 leveren patterns op deze data.
