# 8. Fase 3 — Lifecycle Automation + Audit

## 8.1 Doel

Topic-status volgt automatisch uit linked-issue-statussen (rollup). Triage-queue maakt zichtbaar welke issues nog niet aan een topic gekoppeld zijn. Audit-events log alle transities. `wont_do` krijgt verplichte reden, zichtbaar voor klant.

**Ná deze fase weet de klant**: "Mijn afgewezen wens is niet zomaar verdwenen — er is een uitleg."

**Ná deze fase weet het team**: "Welke issues zijn nog ungrouped? Wat is de geschiedenis van dit topic? Loopt status auto-updaten goed?"

## 8.2 Wat we lenen, van wie

| Bron                                              | Wat we kopen                                        |
| ------------------------------------------------- | --------------------------------------------------- |
| **Linear's audit-events**                         | Audit-log per topic-record, transities zichtbaar    |
| **GitHub OSS transparantie**                      | Niemand verdwijnt in zwart gat; `wont_do` met reden |
| **Eigen vision (database als communication bus)** | Events als bron-van-waarheid, niet als bijproduct   |
| **Eigen gatekeeper-pipeline**                     | Lifecycle-status als formal state-machine           |

## 8.3 Functionele scope

### 8.3.1 Auto status-rollup van issue → topic

**Regel** (één-richting, geen sync-conflicten):

```
Voor elk topic met linked issues:
  als alle issues IN ('done', 'cancelled')   → topic.status = done
  anders als ≥1 issue = 'in_progress'        → topic.status = in_progress
  anders als alle issues IN ('todo','backlog') → topic.status = scheduled
                                                (mits target_sprint gezet)
  anders                                     → topic.status = prioritized
                                                (als priority gezet)
                                              → anders awaiting_client_input
```

**Implementatie**:

- Trigger: Postgres trigger op `issues.status` UPDATE
- Trigger berekent nieuwe topic-status, vergelijkt met huidige, schrijft event als verschilt
- Alternatief: server-side berekening in `updateIssue` mutation (eenvoudiger debugging, scope-bewuster)

> **Aanbeveling**: server-side in mutation, niet DB-trigger. Triggers zijn moeilijk te debuggen, breken vaak in tests, en jullie hebben geen migration-strategie voor trigger-failures. Mutation-pad is expliciet en testbaar.

### 8.3.2 Override-mogelijkheid

Topic-status kan handmatig overschreven worden door team:

- Bijv. issues nog "in_progress" maar topic moet `done` zijn omdat resterende issues naar nieuw topic gaan
- Override zet vlag `status_overridden = true` op topic
- Auto-rollup wordt **uitgeschakeld** zolang vlag `true` is
- Manuele "Resume auto-rollup"-knop schakelt terug aan
- Override-actie wordt gelogd in `topic_events`

### 8.3.3 Triage-queue

Nieuwe pagina in DevHub: `apps/devhub/src/components/triage/page.tsx` (compositiepagina, niet feature).

Toont alle issues waar `topic_id IS NULL`, gesorteerd oudste eerst. Per issue:

- Issue title + type + created_at + submitter
- Knop: "Koppel aan topic" (searchable picker over bestaande topics, gefilterd op project)
- Knop: "Maak nieuw topic"
- Knop: "Markeer als 'geen topic nodig'" (bv. duplicate of trivial)

**Counter in DevHub-nav**: badge met aantal ungrouped issues. Klikbaar.

> Voorkomt dat issues onzichtbaar voor klant blijven hangen. Zonder triage-queue groeit de "donkere materie" van losse issues stilletjes.

### 8.3.4 Audit-events log

Nieuwe tabel `topic_events` (zie sectie 11). Elke transitie wordt gelogd:

| Event-type                 | Wanneer                                                 |
| -------------------------- | ------------------------------------------------------- |
| `topic_created`            | Nieuwe topic aangemaakt                                 |
| `issue_linked`             | Issue gekoppeld aan topic                               |
| `issue_unlinked`           | Issue ontkoppeld                                        |
| `status_changed`           | Status-transitie (auto of handmatig)                    |
| `status_override_enabled`  | Manueel override aan                                    |
| `status_override_disabled` | Manueel override uit                                    |
| `priority_changed`         | Priority gewijzigd                                      |
| `target_sprint_changed`    | Sprint-toewijzing gewijzigd                             |
| `client_signal_set`        | Klant-signaal gegeven (fase 2 retroactief)              |
| `published_to_portal`      | Topic-status van `clustering` → `awaiting_client_input` |
| `wont_do_set`              | Topic naar `wont_do` met reden                          |

Elk event heeft: `topic_id`, `event_type`, `actor_profile_id`, `payload jsonb`, `created_at`.

### 8.3.5 Audit-timeline op topic-detail

Topic-detail in DevHub toont event-timeline:

```
2026-04-15 09:12  topic created (Stef)
2026-04-15 09:14  4 issues linked (Stef)
2026-04-15 09:15  status: clustering → awaiting_client_input (Stef)
2026-04-16 11:22  client signal: must-have (CAI Studio)
2026-04-18 15:00  priority: P1 (Wouter)
2026-04-18 15:02  scheduled to sprint-23 (Wouter)
2026-04-22 09:30  status: scheduled → in_progress (auto-rollup)
2026-04-23 16:45  status: in_progress → done (auto-rollup)
```

Portal toont een vereenvoudigde versie zonder team-actor-namen:

```
14 april — opgepakt
16 april — door jullie als must-have gemarkeerd
18 april — ingepland voor deze week
23 april — afgerond
```

### 8.3.6 `wont_do` met verplichte reden

**Hard-regel**: status `wont_do` kan niet gezet worden zonder `wont_do_reason` (min 10 chars, max 500).

**Voorbeelden van geldige redenen**:

- "Buiten scope huidige contract"
- "Technisch niet haalbaar zonder major refactor (zie issue #234)"
- "Vervangen door topic 'Publicatie-flow v2' (gemerged)"
- "Klant heeft 👎 'niet relevant' aangegeven"

**Portal-zichtbaarheid**:

- Standaard verborgen in 4 buckets
- Uitklapbaar paneel onderaan: "Bekijk afgewezen wensen (12)"
- Per topic: titel + reden + datum
- Geen signaal-knoppen (klant kan niet "ongedaan maken" — moet via team-contact)

**Migratie pad**:

- In fase 1 was `wont_do_reason` optioneel; topics in `wont_do` waren onzichtbaar
- In fase 3: trigger of check-constraint dwingt reden af bij nieuwe `wont_do`
- Bestaande `wont_do`-topics zonder reden krijgen waarschuwing in DevHub: "Voeg reden toe binnen 7 dagen"

### 8.3.7 Bewust verborgen "niet-relevant"-signalen activeren

In fase 2 was 👎 (niet relevant) een verborgen UI-state, geen `wont_do`. Vanaf fase 3 wordt het een duidelijk pad:

- Klant klikt 👎 → topic krijgt status `wont_do_proposed_by_client`
- Team ziet dit in DevHub als "klant wil dit niet — bevestig?"
- Team kan: bevestigen (→ `wont_do` met reden "Klant heeft 👎 gegeven") OF bestrijden (→ retour `awaiting_client_input` met team-comment "we willen dit toch oppakken want X")

> Voorkomt dat klant een topic per ongeluk afsluit en team het kwijt is.

## 8.4 Out of scope (expliciet)

- ❌ Topic merge/split UI → fase 5 (alleen handmatig in DevHub via unlink + create-new tot dan)
- ❌ Cross-klant analytics (welke topics komen bij meerdere klanten voor) → fase 5+ of v2
- ❌ Notifications bij status-change → eerst zien of klanten zelf checken
- ❌ Email-digest van audit-events → v2
- ❌ Webhooks voor externe systemen → v2
- ❌ Public audit-log API → uitgesteld

## 8.5 Database-veranderingen

Volledige spec sectie 11. Hoofdpunten:

1. **Nieuwe tabel `topic_events`** — append-only log
2. **Nieuwe kolom `topics.status_overridden boolean DEFAULT false`**
3. **Nieuwe kolom `topics.wont_do_reason text`**
4. **Check-constraint**: `wont_do` status vereist `wont_do_reason` met min 10 chars
5. **Index** op `topic_events(topic_id, created_at DESC)` voor timeline-query

## 8.6 Code-organisatie

```
packages/database/src/
├── queries/topics/
│   ├── events.ts                  ← getEventsForTopic, listRecentEvents
│   └── triage.ts                  ← listUngroupedIssues
└── mutations/topics/
    ├── status.ts                  ← UPDATE met auto-rollup logica
    └── events.ts                  ← logTopicEvent (intern, automatisch in mutations)

apps/devhub/src/components/triage/   ← compositiepagina
├── page.tsx
├── ungrouped-issues-list.tsx
├── topic-picker.tsx
└── empty-state.tsx

apps/devhub/src/features/topics/
└── components/
    ├── audit-timeline.tsx
    └── wont-do-form.tsx           ← reden-input bij status-change

apps/portal/src/components/roadmap/
├── audit-timeline-simple.tsx      ← klant-versie zonder actor-namen
└── rejected-topics-panel.tsx      ← uitklap "Bekijk afgewezen wensen"
```

## 8.7 Acceptatiecriteria

### Auto-rollup

- [ ] Issue van `todo` → `in_progress` zet topic-status correct
- [ ] Laatste open issue → `done` zet topic-status op `done`
- [ ] Override-knop schakelt auto-rollup uit; topic-status blijft handmatig
- [ ] Resume-knop schakelt auto-rollup weer aan en herberekent direct
- [ ] Override-actie wordt gelogd in `topic_events`

### Triage-queue

- [ ] DevHub-nav toont counter "X ungrouped" met live update
- [ ] Triage-page toont ungrouped issues oudste eerst
- [ ] "Koppel aan topic" picker doorzoekt bestaande topics in hetzelfde project
- [ ] "Maak nieuw topic" pre-fills topic-form met issue-data

### Audit-log

- [ ] Topic-detail in DevHub toont event-timeline volledig
- [ ] Portal toont vereenvoudigde timeline zonder team-actor-namen
- [ ] Elk event heeft `actor_profile_id` (auth.uid() bij user-acties, NULL bij auto-rollup)

### `wont_do`

- [ ] Status-change naar `wont_do` zonder reden wordt geblokkeerd (DB constraint + form-validatie)
- [ ] Reden moet ≥10 chars
- [ ] Portal toont "Bekijk afgewezen wensen" paneel met redenen
- [ ] Klant 👎 → status `wont_do_proposed_by_client` → team-actie verplicht (bevestigen of bestrijden)

### Cross-cutting

- [ ] RLS: klant kan eigen events zien, niet die van andere orgs
- [ ] `npm run type-check`, `npm run lint`, `npm run check:queries` slagen
- [ ] Geen N+1 in audit-timeline (events mee in initial query)

## 8.8 Verificatie-momenten in deze fase

### Tijdens implementatie

- Test scenario: 4 issues op 1 topic, sluit ze één voor één → topic-status klopt elke keer
- Test scenario: zet status-override aan, sluit issues → topic blijft op handmatige status
- Test scenario: probeer `wont_do` zonder reden → krijgt error

### Twaalf weken na go-live (gate naar fase 4)

Zie sectie 5.4. Concrete gates:

| Metric                                       | Drempel           |
| -------------------------------------------- | ----------------- |
| Curatielast (incl. triage)                   | ≤2 uur/klant/week |
| % issues binnen 7 dagen aan topic gekoppeld  | ≥80%              |
| Topic-status-correctheid (auto vs handmatig) | ≥95%              |
| `wont_do` topics met geldige reden           | 100%              |

**Als curatielast >2u**: niet door naar fase 4. Direct fase 5 (AI) prioriteren.

## 8.9 Geschatte sprint-omvang

**1-2 sprints** (10-12 werkdagen). Verdeling:

- Auto-rollup logica + tests: ~2 dagen
- `topic_events` tabel + logging in mutations: ~1.5 dagen
- Triage-queue UI: ~2 dagen
- `wont_do`-flow + UI: ~1.5 dagen
- Audit-timeline UI (DevHub + Portal versies): ~2 dagen
- Edge cases + RLS + integration: ~1-2 dagen

## 8.10 Risico's in fase 3

| Risico                                                              | Mitigatie                                                                  |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Auto-rollup-bug zet topic op verkeerde status                       | Override-knop als escape; logging maakt debugging mogelijk                 |
| Triage-queue blijft groeien (team negeert)                          | Counter altijd zichtbaar in nav; PR-template vraagt "ungrouped opgeruimd?" |
| `wont_do` redenen worden lui ingevuld ("zie ticket")                | Code review-cultuur; voorbeelden tonen in placeholder                      |
| Audit-events explodeert in volume                                   | Index op (topic_id, created_at), pagination van timeline op 50 events      |
| Klant ziet `wont_do_proposed_by_client` als afwijzing zonder uitleg | UI-tekst maakt duidelijk: "we bekijken jouw afwijzing" tot team beslist    |
