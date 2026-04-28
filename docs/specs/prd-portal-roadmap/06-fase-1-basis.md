# 6. Fase 1 — Basis: Topics + 4-Bucket Portal (read-only)

## 6.1 Doel

Klant ziet een leesbaar overzicht van wat er speelt, gegroepeerd in vier buckets, op topic-niveau (niet issue-niveau). Geen klant-interactie — alleen lezen. Team beheert topics handmatig in DevHub.

**Ná deze fase weet de klant**: "Wat is recent gefixt? Wat komt deze of volgende week? Wat heeft hoge prio? Wat is nog open?"

**Ná deze fase weet het team**: "Werkt het topic-model in de praktijk? Hoeveel tijd kost handmatige curatie?"

## 6.2 Wat we lenen, van wie

| Bron                        | Wat we kopen                                                      |
| --------------------------- | ----------------------------------------------------------------- |
| **Linear Projects**         | Topic-laag bovenop issues, project = topic abstractie             |
| **Stripe weekly changelog** | Digest-stijl voor "Recent gefixt"-bucket, editorial keuze         |
| **CAI Studio Notion-doc**   | Klanttaal in `client_description`, korte 1-3 zin uitleg per topic |
| **Bestaande Portal v1**     | 4-bucket layout, source-switch (Onze meldingen / JAIP)            |

## 6.3 Functionele scope

### 6.3.1 DevHub: Topic CRUD

Nieuwe sectie in `apps/devhub/src/features/topics/` (volgt feature-folder-conventie uit CLAUDE.md). Functionaliteit:

- **List view**: alle topics per project, gefilterd op type (bug / feature)
- **Create**: nieuw topic met velden (zie data model in sectie 11)
- **Edit**: alle topic-velden mutable behalve `id` en `created_at`
- **Delete**: alleen mogelijk als `linked_issues = 0` (anders: cascade-prompt)
- **Link issue**: koppel een bestaand DevHub-issue aan dit topic
- **Unlink issue**: verwijder koppeling (issue blijft bestaan)

### 6.3.2 DevHub: handmatige status-knop

Topic heeft een **dropdown-status** die het team handmatig zet:

- `clustering` — net gemaakt, nog niet zichtbaar voor klant
- `awaiting_client_input` — gepubliceerd in Portal, klant kan zien
- `prioritized` — team heeft besloten dit doen, geen sprint
- `scheduled` — toegewezen aan sprint
- `in_progress` — wordt aan gewerkt
- `done` — klaar
- `wont_do` — afgewezen (reden verplicht — fase 3, in fase 1 nog optioneel)

> In fase 1 is deze status **handmatig**. Auto-rollup vanuit issue-status komt in fase 3. Reden: eerst leren of de mapping logisch is voordat we hem automatiseren.

### 6.3.3 Portal: 4-bucket view op topic-niveau

Nieuwe pagina `apps/portal/src/app/(app)/projects/[id]/roadmap/page.tsx` (naast bestaande `/issues`-pagina, niet vervangend).

| Bucket               | Conditie                                                        | Telling getoond |
| -------------------- | --------------------------------------------------------------- | --------------- |
| Recent gefixt        | `status = done` AND `closed_at >= now() - 14 days`              | Ja              |
| Komende week         | `status IN (in_progress, scheduled)` AND in current/next sprint | Ja              |
| Hoge prio daarna     | `status = prioritized`                                          | Ja              |
| Niet geprioritiseerd | `status = awaiting_client_input`                                | Ja              |

Topics in `clustering` of `wont_do` zijn niet zichtbaar in fase 1.

### 6.3.4 Portal: topic-card

> **Visueel referentie**: zie [§ 14 Design-keuzes](./14-design-keuzes.md) en de live preview op `/design-preview/roadmap`. De topic-card-stijl, badges, hairline borders en bucket-hues zijn daar vastgelegd.

Per topic in de bucket toon:

| Veld                | Format                       | Bron                                                        |
| ------------------- | ---------------------------- | ----------------------------------------------------------- |
| Title               | Heading                      | `topics.title` (of `client_title` als gevuld)               |
| Description         | 1-2 zinnen                   | `topics.client_description` (fallback: `description`)       |
| Type-badge          | Bug / Feature                | `topics.type`                                               |
| Priority-badge      | P1 / P2 / P3                 | `topics.priority` (alleen tonen als niet null)              |
| Linked issues count | "(3 onderwerpen)"            | `count(topic_issues)`                                       |
| Sprint-label        | "Sprint 23"                  | `topics.target_sprint_id` (alleen in "Komende week" bucket) |
| Updated_at          | "Bijgewerkt 2 dagen geleden" | `topics.updated_at`                                         |

### 6.3.5 Portal: topic detail-pagina

Route: `apps/portal/src/app/(app)/projects/[id]/roadmap/[topicId]/page.tsx`

Toont:

- Title + `client_description`
- Status (uit lifecycle-status mapping naar klant-label)
- Priority + type-badge
- Linked issues lijst — alleen titel + datum, niet volledig issue-detail (issues blijven primair via `/issues` route)
- "Aangevraagd in [oudste linked issue's created_at]"
- "Laatst bijgewerkt [updated_at]"
- Geen knoppen (read-only in fase 1)

### 6.3.6 Geen klant-interactie in fase 1

Geen 🔥👍👎 knoppen. Geen comments. Geen sign-off. Geen filter-knoppen voorbij de 4 buckets.

> Bewuste keuze: minimaliseer wat we testen in fase 1. Eerst meten of de 4-bucket-view überhaupt waarde heeft, dan klant-interactie toevoegen in fase 2.

## 6.4 Out of scope (expliciet)

- ❌ Klant-signalen (knoppen) → fase 2
- ❌ Auto status-rollup van issue → topic → fase 3
- ❌ Triage-queue voor ungrouped issues → fase 3
- ❌ Audit-events log zichtbaar in UI → fase 3
- ❌ `wont_do` met verplichte reden → fase 3 (in fase 1 is `wont_do_reason` optioneel; topics in `wont_do` zijn onzichtbaar voor klant)
- ❌ Status-rapporten / snapshots → fase 4
- ❌ AI-clustering / agent-suggesties → fase 5
- ❌ Topic-merge en topic-split UI → fase 5
- ❌ Multi-stakeholder voting → v2
- ❌ Comments → v2
- ❌ Notificaties (email/push) → v2

## 6.5 Database-veranderingen (overzicht)

Volledige spec in sectie 11. Hier alleen de migratie-volgorde:

1. **Migratie 1**: tabel `topics` met velden uit data model sectie
2. **Migratie 2**: junction-tabel `topic_issues` (topic_id, issue_id, created_at)
3. **Migratie 3**: RLS policies analoog aan bestaande `issues_rls_client_hardening`
4. **Migratie 4**: indexes op (project_id, status), (target_sprint_id), (closed_at)
5. **Migratie 5**: regenereer types via `npm run types:generate`

## 6.6 Code-organisatie

Volgt strict de feature-folder-structuur uit CLAUDE.md:

```
packages/database/src/
├── queries/topics/                 ← cluster, want >2 sub-domeinen
│   ├── index.ts                    ← exports
│   ├── list.ts                     ← listTopics, listTopicsByBucket
│   ├── detail.ts                   ← getTopicById, getTopicWithIssues
│   ├── linked-issues.ts            ← getIssuesForTopic, countIssuesPerTopic
│   └── README.md
├── mutations/topics/
│   ├── index.ts
│   ├── crud.ts                     ← insertTopic, updateTopic, deleteTopic
│   ├── status.ts                   ← updateTopicStatus
│   ├── linking.ts                  ← linkIssueToTopic, unlinkIssueFromTopic
│   └── README.md
└── constants/
    └── topics.ts                   ← TOPIC_LIFECYCLE_STATUSES, PORTAL_BUCKETS

apps/devhub/src/features/topics/
├── README.md                       ← per CLAUDE.md vereist
├── actions/
│   ├── topics.ts                   ← create/update/delete server actions
│   └── linking.ts                  ← link/unlink issues
├── components/
│   ├── topic-list.tsx
│   ├── topic-card.tsx
│   ├── topic-form.tsx
│   ├── topic-detail.tsx
│   └── linked-issues-panel.tsx
├── validations/
│   └── topic.ts                    ← Zod schemas
└── hooks/                          ← (leeg in fase 1, mogelijk fase 2-3)

apps/portal/src/components/roadmap/   ← compositiepagina, geen feature
├── bucket-view.tsx
├── topic-card.tsx                  ← read-only versie
├── topic-detail-view.tsx
└── empty-states.tsx
```

> Topics in DevHub = **feature** (eigen CRUD + flows). Topics in Portal = **compositiepagina** (alleen lezen). Past in feature-structuur registry uit CLAUDE.md.

## 6.7 Acceptatiecriteria

### DevHub

- [ ] Team kan een nieuw topic aanmaken via een form (titel, type, priority optioneel)
- [ ] Team kan 1+ DevHub-issues koppelen aan een topic via een searchable picker
- [ ] Topic-list toont alle topics van een project, gefilterd op type
- [ ] Topic-status dropdown bevat alle 7 statussen, default `clustering`
- [ ] Topic-detail toont linked issues met links naar issue-detail
- [ ] Een issue kan aan max één topic gekoppeld zijn (DB constraint)
- [ ] Verwijderen van topic met linked issues toont waarschuwing (geen silent cascade)

### Portal

- [ ] `/projects/[id]/roadmap` toont 4 buckets met juiste tellingen
- [ ] Topics in `clustering` of `wont_do` zijn níét zichtbaar
- [ ] Topics in `awaiting_client_input` verschijnen in "Niet geprioritiseerd"
- [ ] "Recent gefixt" toont alleen topics met `closed_at >= now() - 14d`
- [ ] "Komende week" toont alleen topics in current of next sprint
- [ ] Topic-card toont count van linked issues
- [ ] Topic-detail rendert `client_description` als markdown
- [ ] Klant van CAI ziet alleen CAI-topics (RLS-test met testaccount andere klant)
- [ ] Mobiele weergave is leesbaar zonder horizontaal scrollen

### Cross-cutting

- [ ] Type checks: `npm run type-check` slaagt
- [ ] Lint: `npm run lint` slaagt
- [ ] RLS-tests: client-account kan niet topics van andere org lezen
- [ ] `npm run check:queries` slaagt (geen directe `.from('topics')` in apps)

## 6.8 Verificatie-momenten in deze fase

### Tijdens implementatie

- Na DB-migratie: één test-topic in productie (CAI's `Publicatie-flow`) met 4 linked issues, handmatig gemaakt
- Na DevHub-deploy: team-member zonder spec-kennis kan een nieuw topic maken zonder hulp
- Na Portal-deploy: CAI-stakeholder kan zonder uitleg de 4 buckets begrijpen

### Vier weken na go-live (gate naar fase 2)

Zie sectie 5.4 — klant-interview + metrics. Concrete go/no-go-vraag:

> "Heeft de roadmap-view in de afgelopen 4 weken een Slack-bericht of ad-hoc rapportage vervangen? Geef een voorbeeld."

Als antwoord "ja, X keer" → door naar fase 2. Als "niet echt" → fase 1.5 (UX-iteratie of model-herziening).

## 6.9 Geschatte sprint-omvang

**1 sprint** (5-7 werkdagen voor 1 dev). Verdeling:

- DB migraties + types-regeneratie: ~0.5 dag
- Queries + mutations + Zod-schemas: ~1 dag
- DevHub feature (`features/topics/`): ~2 dagen
- Portal compositiepagina (`components/roadmap/`): ~1.5 dagen
- RLS-tests + type-checks + lint: ~0.5 dag
- Buffer / PR review: ~0.5-1 dag

> Indicatie, niet contract. Als omvang naar 2 sprints loopt: stop, herzie scope (drop topic-detail-pagina? drop priority-veld? meer minimaal?).

## 6.10 Risico's in fase 1

| Risico                                                    | Mitigatie                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------- |
| Klant snapt "topic"-concept niet                          | Klant-interview na 2 weken (niet wachten op gate)                         |
| Team vergeet topics te onderhouden                        | Wekelijkse curatie expliciet beleggen bij 1 persoon (account manager)     |
| Te veel topics worden te klein (1 issue per topic)        | Richtlijn: topic = 3+ issues OF 1 issue dat ≥5 dagen werk is              |
| Topics botsen met bestaande "issue"-concepten in DevHub   | Naamgeving consistent (`topic` overal in code, niet "cluster" of "group") |
| 4-bucket-view conflicteert met bestaande `/issues`-pagina | Beide bestaan naast elkaar; nav-link maakt onderscheid duidelijk          |
