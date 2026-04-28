# 11. Data Model — Cross-fase

## 11.1 Overzicht

```
                ┌─────────────────────┐
                │   organizations     │ (bestaand)
                └──────────┬──────────┘
                           │ 1:N
                ┌──────────▼──────────┐
                │      projects       │ (bestaand)
                └──────────┬──────────┘
                           │ 1:N
              ┌────────────┴────────────┐
              │                         │
   ┌──────────▼─────────┐   ┌──────────▼──────────┐
   │      issues        │   │       topics        │  (NIEUW)
   │  (bestaand)        │   │  (NIEUW)            │
   │                    │   └──────────┬──────────┘
   └──────────┬─────────┘              │
              │                        │
              │ N:1 via                │ 1:N
              │ topic_issues           │
              │                        │
              └────────►◄──────────────┘
                        │
                        │
              ┌─────────┴──────────────┬──────────────────┐
              │                        │                  │
    ┌─────────▼────────┐    ┌─────────▼────────┐  ┌─────▼─────────────┐
    │  topic_events    │    │ topic_client_    │  │ topic_status_     │
    │  (fase 3)        │    │ signals (fase 2) │  │ reports (fase 4)  │
    └──────────────────┘    └──────────────────┘  └───────────────────┘
```

## 11.2 Tabel: `topics` (fase 1)

| Kolom              | Type        | Nullable | Default           | Toelichting                                                        |
| ------------------ | ----------- | -------- | ----------------- | ------------------------------------------------------------------ |
| id                 | uuid        | nee      | gen_random_uuid() | PK                                                                 |
| project_id         | uuid        | nee      | —                 | FK → projects(id), CASCADE delete                                  |
| title              | text        | nee      | —                 | Intern team-titel (kan technisch zijn)                             |
| client_title       | text        | ja       | null              | Klant-vriendelijke titel; fallback naar `title`                    |
| description        | text        | ja       | null              | Intern team-beschrijving                                           |
| client_description | text        | ja       | null              | Klant-vriendelijke beschrijving (markdown)                         |
| type               | text        | nee      | —                 | CHECK IN ('bug', 'feature')                                        |
| status             | text        | nee      | 'clustering'      | CHECK IN (zie §11.7)                                               |
| priority           | text        | ja       | null              | CHECK IN ('P0','P1','P2','P3') als gevuld                          |
| target_sprint_id   | uuid        | ja       | null              | FK → sprints(id) als jullie sprints-tabel hebben; anders text-veld |
| status_overridden  | boolean     | nee      | false             | Fase 3: schakelt auto-rollup uit                                   |
| wont_do_reason     | text        | ja       | null              | Fase 3: verplicht als status='wont_do'                             |
| closed_at          | timestamptz | ja       | null              | Gezet wanneer status='done' of 'wont_do'                           |
| created_at         | timestamptz | nee      | now()             |                                                                    |
| created_by         | uuid        | nee      | —                 | FK → profiles(id)                                                  |
| updated_at         | timestamptz | nee      | now()             | Auto via trigger                                                   |

**Indexes**:

- `(project_id, status)` — voor bucket-queries
- `(target_sprint_id)` waar not null — voor "Komende week"-bucket
- `(closed_at)` waar not null — voor "Recent gefixt" 14d-window
- `(type, status)` — voor type-filtering

**Check-constraints**:

- `wont_do_reason IS NOT NULL AND length(wont_do_reason) >= 10` als `status = 'wont_do'` (fase 3)
- `closed_at IS NOT NULL` als `status IN ('done', 'wont_do')`

## 11.3 Tabel: `topic_issues` (fase 1)

Junction-tabel voor M:N tussen topics en issues. **Beslissing**: een issue kan aan **max één topic** gekoppeld zijn (afgesproken in sectie 6.3.1). Dit lijkt N:N maar is feitelijk N:1 — uitgevoerd als junction voor query-flexibiliteit en historische unlinks.

| Kolom      | Type        | Nullable | Default  | Toelichting                                      |
| ---------- | ----------- | -------- | -------- | ------------------------------------------------ |
| topic_id   | uuid        | nee      | —        | FK → topics(id)                                  |
| issue_id   | uuid        | nee      | —        | FK → issues(id), UNIQUE                          |
| linked_at  | timestamptz | nee      | now()    |                                                  |
| linked_by  | uuid        | nee      | —        | FK → profiles(id)                                |
| linked_via | text        | nee      | 'manual' | CHECK IN ('manual','agent','migration') — fase 5 |

**PK**: `(topic_id, issue_id)`

**UNIQUE**: `issue_id` (een issue kan niet aan 2 topics tegelijk hangen)

> **Alternatief overwogen**: directe `topic_id` op `issues`-tabel. Verworpen omdat history van eerdere koppelingen nuttig is voor audit (issue verplaatst van topic A naar topic B). Junction maakt dit mogelijk.
>
> **Trade-off**: junction vereist extra join. Voor lijsten met tienduizenden issues per project zou direct kolom efficiënter zijn. v1: junction; herzien als performance-probleem.

## 11.4 Tabel: `topic_client_signals` (fase 2)

| Kolom             | Type        | Nullable | Default           | Toelichting                                          |
| ----------------- | ----------- | -------- | ----------------- | ---------------------------------------------------- |
| id                | uuid        | nee      | gen_random_uuid() | PK                                                   |
| topic_id          | uuid        | nee      | —                 | FK → topics(id)                                      |
| organization_id   | uuid        | nee      | —                 | FK → organizations(id) — per-org model               |
| signal            | text        | nee      | —                 | CHECK IN ('must_have','nice_to_have','not_relevant') |
| set_by_profile_id | uuid        | nee      | —                 | FK → profiles(id)                                    |
| set_at            | timestamptz | nee      | now()             |                                                      |
| previous_signal   | text        | ja       | null              | Vorige signaal van dezelfde org, voor diff-tracking  |

**Indexes**:

- `(topic_id, organization_id)` — laatste signaal per (topic, org)
- `(set_at)` — voor recente activiteit-feeds

**UNIQUE constraint**: per (topic_id, organization_id) is er één huidig signaal. Implementatie-keuze:

- **Optie A**: één rij per (topic, org), UPDATE bij wijziging. Audit via `topic_signal_history`-tabel.
- **Optie B**: meerdere rijen, huidig signaal = `LATEST(set_at)`. Geen aparte history.

**Aanbeveling**: optie A. Eenvoudiger queries, history apart wanneer nodig. Voorkomt N+1 in "huidig signaal per topic"-views.

## 11.5 Tabel: `topic_signal_history` (fase 2, optioneel bij optie A)

Append-only log van signaal-wijzigingen.

| Kolom                 | Type        | Toelichting           |
| --------------------- | ----------- | --------------------- |
| id                    | uuid PK     |                       |
| topic_id              | uuid FK     |                       |
| organization_id       | uuid FK     |                       |
| from_signal           | text NULL   | NULL = eerste signaal |
| to_signal             | text        |                       |
| changed_by_profile_id | uuid FK     |                       |
| changed_at            | timestamptz |                       |

## 11.6 Tabel: `topic_events` (fase 3)

Audit-log van alle topic-state-transities en relevante acties.

| Kolom            | Type        | Nullable | Default           | Toelichting                                  |
| ---------------- | ----------- | -------- | ----------------- | -------------------------------------------- |
| id               | uuid        | nee      | gen_random_uuid() | PK                                           |
| topic_id         | uuid        | nee      | —                 | FK → topics(id)                              |
| event_type       | text        | nee      | —                 | Zie §11.6.1 voor lijst                       |
| actor_profile_id | uuid        | ja       | null              | NULL = system/agent                          |
| agent_id         | text        | ja       | null              | Fase 5: welke agent (NULL = mens/system)     |
| confidence       | real        | ja       | null              | Fase 5: agent-suggestie confidence           |
| accepted_by      | uuid        | ja       | null              | Fase 5: mens die agent-suggestie accepteerde |
| payload          | jsonb       | nee      | '{}'              | Event-specifiek data (zie §11.6.2)           |
| created_at       | timestamptz | nee      | now()             |                                              |

**Indexes**:

- `(topic_id, created_at DESC)` — voor timeline-query
- `(event_type)` — voor filteren
- `(agent_id)` waar not null — voor agent-quality-tracking

### 11.6.1 Lijst van event_types

| Event                        | Wanneer                                                  |
| ---------------------------- | -------------------------------------------------------- |
| `topic_created`              | INSERT op topics                                         |
| `topic_deleted`              | DELETE op topics                                         |
| `issue_linked`               | INSERT op topic_issues                                   |
| `issue_unlinked`             | DELETE op topic_issues                                   |
| `status_changed`             | UPDATE topics.status                                     |
| `status_override_enabled`    | UPDATE topics.status_overridden = true                   |
| `status_override_disabled`   | UPDATE topics.status_overridden = false                  |
| `priority_changed`           | UPDATE topics.priority                                   |
| `target_sprint_changed`      | UPDATE topics.target_sprint_id                           |
| `client_title_changed`       | UPDATE topics.client_title                               |
| `client_description_changed` | UPDATE topics.client_description                         |
| `wont_do_set`                | UPDATE topics.status = 'wont_do'                         |
| `published_to_portal`        | UPDATE topics.status: clustering → awaiting_client_input |
| `client_signal_set`          | INSERT op topic_client_signals (fase 2)                  |
| `agent_suggestion_proposed`  | Fase 5: agent stelt voor                                 |
| `agent_suggestion_accepted`  | Fase 5: mens accepteert                                  |
| `agent_suggestion_rejected`  | Fase 5: mens negeert/wijzigt                             |
| `topics_merged`              | Fase 5: topic merge actie                                |
| `topic_split`                | Fase 5: topic split actie                                |

### 11.6.2 Voorbeeld payloads

```json
// status_changed
{ "from": "scheduled", "to": "in_progress", "trigger": "auto_rollup" }

// issue_linked
{ "issue_id": "...", "via": "manual" }

// client_signal_set
{ "signal": "must_have", "previous": "nice_to_have" }

// agent_suggestion_accepted
{ "suggestion_id": "...", "agent_id": "topic-curator", "outcome": "accepted_unchanged" }
```

## 11.7 Lifecycle-status enum (cross-fase)

Bron-van-waarheid in `packages/database/src/constants/topics.ts`:

```typescript
export const TOPIC_LIFECYCLE_STATUSES = [
  "clustering", // fase 1: nieuw, niet zichtbaar voor klant
  "awaiting_client_input", // fase 1+2: zichtbaar in Portal "Niet geprio"
  "prioritized", // fase 1: team P1/P2 gezet, nog geen sprint
  "scheduled", // fase 1: in sprint, niet gestart
  "in_progress", // fase 1: wordt aan gewerkt
  "done", // fase 1: klaar
  "wont_do", // fase 1+3: afgewezen met reden
  "wont_do_proposed_by_client", // fase 3: klant 👎 gegeven, team-actie pending
] as const;

export type TopicLifecycleStatus = (typeof TOPIC_LIFECYCLE_STATUSES)[number];
```

### 11.7.1 Status-transitie-grafiek

```
                     ┌──────────────┐
                     │  clustering  │
                     └──────┬───────┘
                            │ team publiceert
                            ▼
              ┌──────────────────────────┐
              │ awaiting_client_input    │◄──────┐
              └────────┬────────┬────────┘       │
                       │        │                │
        team prio      │        │  klant 👎      │ team
                       │        │                │ bestrijdt
                       ▼        ▼                │
              ┌──────────────┐ ┌──────────────────────────┐
              │ prioritized  │ │ wont_do_proposed_by_client│
              └──────┬───────┘ └──────────┬───────────────┘
                     │ in sprint           │ team bevestigt
                     ▼                     ▼
              ┌──────────────┐    ┌──────────────┐
              │  scheduled   │    │   wont_do    │
              └──────┬───────┘    └──────────────┘
                     │ work starts
                     ▼
              ┌──────────────┐
              │ in_progress  │
              └──────┬───────┘
                     │ all issues done
                     ▼
              ┌──────────────┐
              │     done     │
              └──────────────┘
```

**Toegestane transities** (whitelist, alle anderen verboden):

```
clustering              → awaiting_client_input, prioritized (bug skip-path), wont_do
awaiting_client_input   → prioritized, scheduled, wont_do_proposed_by_client, wont_do
wont_do_proposed_by_client → wont_do, awaiting_client_input
prioritized             → scheduled, awaiting_client_input, wont_do
scheduled               → in_progress, prioritized, wont_do
in_progress             → done, scheduled, wont_do
done                    → in_progress (regressie)
wont_do                 → awaiting_client_input (heropenen)
```

> Implementeer als check-constraint of trigger om verboden transities te blokkeren. Past op platform-vision principe "Database als communication bus": status is gestructureerde communicatie, niet vrije keuze.

## 11.8 Tabel: `topic_status_reports` (fase 4)

Zie sectie 9.5 voor volledige spec. Hoofdpunten:

| Kolom            | Type                                           | Toelichting                      |
| ---------------- | ---------------------------------------------- | -------------------------------- |
| id               | uuid PK                                        |                                  |
| project_id       | uuid FK                                        |                                  |
| template         | text                                           | `weekly` (v1)                    |
| compiled_at      | timestamptz                                    |                                  |
| compiled_by      | uuid FK                                        |                                  |
| narrative_note   | text                                           | Markdown                         |
| content_snapshot | jsonb                                          | Bevroren topic-state             |
| patterns_section | jsonb                                          | Array van `{title, description}` |
| published_at     | timestamptz NULL                               | NULL = draft                     |
| status           | text CHECK IN ('draft','published','archived') |                                  |

## 11.9 Tabel: `agent_suggestions` (fase 5)

Zie sectie 10.5. Voor agent-quality-tracking:

| Kolom              | Type             | Toelichting                            |
| ------------------ | ---------------- | -------------------------------------- |
| id                 | uuid PK          |                                        |
| agent_id           | text             | `topic-curator`, etc.                  |
| target_type        | text             | `topic`, `report_narrative`, `pattern` |
| target_id          | uuid             |                                        |
| suggestion_payload | jsonb            |                                        |
| confidence         | real             |                                        |
| created_at         | timestamptz      |                                        |
| reviewed_at        | timestamptz NULL |                                        |
| reviewed_by        | uuid FK NULL     |                                        |
| outcome            | text NULL        | `accepted`, `rejected`, `modified`     |

## 11.10 RLS-strategie (cross-fase)

**Principe**: portal-zichtbaarheid via bestaande `has_portal_access(profile_id, project_id)` helper. Geen nieuwe scoping-logica.

| Tabel                | SELECT (client)                                        | INSERT (client) | UPDATE/DELETE (client) |
| -------------------- | ------------------------------------------------------ | --------------- | ---------------------- |
| topics               | via has_portal_access AND status NOT IN ('clustering') | nee             | nee                    |
| topic_issues         | via has_portal_access op topic.project_id              | nee             | nee                    |
| topic_client_signals | via has_portal_access AND organization_id = own        | yes (eigen org) | nee (admin only)       |
| topic_signal_history | via has_portal_access AND organization_id = own        | nee             | nee                    |
| topic_events         | via has_portal_access (gefilterde subset)              | nee             | nee                    |
| topic_status_reports | via has_portal_access AND status = 'published'         | nee             | nee                    |
| agent_suggestions    | nee                                                    | nee             | nee (intern)           |

> Klant ziet `topic_events` in vereenvoudigde vorm (zonder team-actor-namen). Filtering via Portal-query, niet via RLS — RLS bepaalt zichtbaarheid, query bepaalt presentatie.

## 11.11 Migratie-volgorde

| Fase | Migratie                                                   | Bestand                            |
| ---- | ---------------------------------------------------------- | ---------------------------------- |
| 1    | Tabel `topics`                                             | `YYYYMMDDHHMMSS_topics.sql`        |
| 1    | Tabel `topic_issues`                                       | `..._topic_issues.sql`             |
| 1    | RLS policies + helpers                                     | `..._topics_rls.sql`               |
| 1    | Indexes                                                    | `..._topics_indexes.sql`           |
| 2    | Tabel `topic_client_signals`                               | `..._topic_client_signals.sql`     |
| 2    | Tabel `topic_signal_history` (optioneel)                   | `..._topic_signal_history.sql`     |
| 2    | RLS voor signals                                           | `..._signals_rls.sql`              |
| 3    | Tabel `topic_events`                                       | `..._topic_events.sql`             |
| 3    | Kolom `topics.status_overridden`                           | `..._topic_status_override.sql`    |
| 3    | Kolom `topics.wont_do_reason` + check                      | `..._wont_do_reason.sql`           |
| 3    | Status-transitie check-trigger                             | `..._topic_status_transitions.sql` |
| 4    | Tabel `topic_status_reports`                               | `..._topic_status_reports.sql`     |
| 5    | Tabel `agent_suggestions`                                  | `..._agent_suggestions.sql`        |
| 5    | Kolommen `agent_id`, `confidence`, `accepted_by` op events | `..._events_agent_metadata.sql`    |

> Idempotente seed niet nodig voor `topics` — geen referentiedata. Als jullie cluster-templates willen bij seed (bijv. demo-topics voor test-orgs), aparte seed-bestand.

## 11.12 Wat blijft buiten dit data-model

- Geen `topic_comments` (v2)
- Geen `topic_assignees` (DevHub-issues hebben al assignees, topic erft via linked issues)
- Geen `topic_milestones` (project-fases zijn bestaand of komen apart)
- Geen denormalized `linked_issues_count` op `topics` (afgeleid via query, eventueel gecached in view)

## 11.13 Type-generatie

Na elke migratie:

```bash
npm run types:generate
```

Genereert types in `packages/database/src/types/database.types.ts` voor strict TypeScript. Nooit handmatig type-shadowing in apps; altijd uit `@repo/database/types`.
