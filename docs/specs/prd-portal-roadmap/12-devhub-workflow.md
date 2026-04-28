# 12. DevHub Workflow — Hoe Devs Topics Volgen

## 12.1 Doel

Een nieuwe abstractielaag (topics bovenop issues) is alleen waardevol als devs hem **kunnen zien, traceren en uitleggen**. Anders krijg je een schaduw-systeem dat het team niet vertrouwt. Dit document beschrijft hoe DevHub aanvoelt voor een ontwikkelaar of account manager na alle 5 fases.

## 12.2 Het kernprincipe — één canonieke view per workflow-stap

| Dev doet             | DevHub-view        | Werkt op niveau               |
| -------------------- | ------------------ | ----------------------------- |
| Triage nieuwe issues | **Triage queue**   | issues → topics               |
| Sprint plannen       | **Topic board**    | topics                        |
| Aan ticket werken    | **Issue detail**   | issues (met topic-breadcrumb) |
| Topic afronden       | **Topic detail**   | topics                        |
| Status-check         | **Dashboard**      | topics                        |
| Rapport schrijven    | **Reports**-pagina | topic-snapshot                |

Geen verborgen state. Geen dubbele werelden. Voor elke workflow-stap één pagina.

## 12.3 Vijf concrete schermen

### 12.3.1 Triage queue (fase 3)

**Pad**: `apps/devhub/src/components/triage/page.tsx`

**Wat je ziet**:

- Lijst van issues zonder `topic_id`, oudste eerst
- Per issue: title + type + created_at + submitter
- Counter in DevHub-nav: **"12 ungrouped"** — altijd zichtbaar

**Wat je doet**:

- ✅ Accept AI-suggestie ("Lijkt op topic _Publicatie-flow_, 78% match") — fase 5
- 🔀 Kies ander topic via searchable picker
- ➕ Maak nieuw topic — pre-fills met issue-data
- ✋ Bulk-select voor "groepeer deze 4 in nieuw topic"

**Wat je voorkomt**:

- Issues blijven niet onzichtbaar voor klant — counter dwingt aandacht
- Geen handmatige database-queries om "wat is ungrouped" te vinden

### 12.3.2 Topic board (fase 1, uitgebreid in fase 3)

**Pad**: `apps/devhub/src/features/topics/` → list view

**Wat je ziet**:

- Kanban-kolommen = lifecycle-statussen
- Topic-kaart toont: titel, # linked issues, klant-signaal (🔥👍👎), priority
- Filter op project / bug / feature / klant-signaal

**Wat je doet**:

- Drag tussen kolommen = status-update (handmatig in fase 1, override-pad in fase 3)
- Klik op topic → naar detail
- "Maak nieuw topic" voor topics zonder issues (zeldzaam, mag)

### 12.3.3 Topic detail (fase 1, audit-timeline in fase 3)

**Pad**: `apps/devhub/src/features/topics/[topicId]/`

**Wat je ziet**:

- Title + `client_description` (klanttaal, editable)
- Status-timeline (fase 3): `clustered 14 apr → awaiting_input 15 apr → prioritized 18 apr → scheduled sprint-23`
- Linked raw issues (collapsible lijst, met submitter + datum)
- Klant-signalen (fase 2): huidig signaal + historie
- Intern comment-thread (v2)
- Sprint-assignment + priority-edit
- "Mark done"-knop → triggert Portal-update + optionele release-notitie

**Wat je doet**:

- Wijzig `client_title` of `client_description` (klant ziet wijziging)
- Verander priority of target_sprint
- Mark als `wont_do` met verplichte reden (fase 3)
- Override status (fase 3) — wijst auto-rollup uit
- Resume auto-rollup als override niet meer nodig

### 12.3.4 Issue detail (bestaand, één veld erbij)

**Pad**: `apps/devhub/src/features/issues/[issueId]/`

**Wat verandert**:

- Breadcrumb bovenaan: **"Onderdeel van topic: [Publicatie-flow]"** (klikbaar)
- Indien geen topic: "**Niet gekoppeld** — Triage queue" (link)

**Wat blijft**:

- Issue-status verandert? → topic-status auto-rollup (fase 3)
- Verder identiek aan bestaande detail-pagina

### 12.3.5 Sprint planning (bestaand, ander niveau)

**Wat verandert**:

- Plan op **topic-niveau**, niet issue-niveau
- Topic toont aggregaat: "3 linked issues, klant 🔥, ~5 dagen werk"
- Drag topic naar sprint = alle linked issues volgen mee

**Wat blijft**:

- Sprint-board, capacity-overzicht, etc. — bestaande UI uitbreiden

> Sprint-issues blijven bestaan voor team-werk; sprint-topics voor klant-zicht en planning. Een issue kan wel/niet aan sprint toegewezen zijn, los van topic-sprint. Maar default = topic.target_sprint zet de issues automatisch op die sprint (mits niet handmatig override).

## 12.4 Mentale model voor devs in één zin

> "Issues zijn mijn werk. Topics zijn hoe de klant het werk ziet. Triage koppelt ze. Sprint plant op topic-niveau. Status volgt vanzelf."

## 12.5 Status-rollup regels (één-richting, geen dubbele waarheid)

Issue-status is **leading**. Topic-status wordt **afgeleid**:

```
alle issues done                    → topic = done
≥1 issue in_progress                → topic = in_progress
alle issues scheduled, geen actief  → topic = scheduled
geen issues, alleen topic-record    → topic = clustering / awaiting_input
```

Topic heeft wel **eigen velden** die níét uit issues komen:

- `client_description` (handgeschreven)
- `priority` (handmatig)
- `target_sprint` (handmatig)
- `client_signals` (uit Portal)
- `wont_do_reason` (handgeschreven)

Dus: **issue-data rolt op naar topic-status, topic-data leeft naast issues**. Eén richting, geen sync-conflicten.

### 12.5.1 De override-uitzondering (fase 3)

Soms wil een dev expliciet zeggen: "dit topic is done, ondanks dat sommige issues nog open zijn". Bijvoorbeeld:

- Resterende issues zijn naar nieuw topic gemigreerd
- Topic is gefixt door een ander mechanisme (workaround)
- Issues zijn obsolete maar niet formal gesloten

In dat geval: zet `status_overridden = true`, kies handmatig de status. Auto-rollup is uit tot `Resume`-knop. Dit wordt gelogd in `topic_events`.

## 12.6 Audit-trail — alles traceerbaar

Elke topic heeft een event-log (tabel `topic_events`). Voor een dev betekent dit:

- "Hoe is dit topic in `done` gekomen?" → check event-timeline
- "Wie heeft client_description gewijzigd?" → event `client_description_changed` met `actor_profile_id`
- "Heeft de klant überhaupt iets gezegd?" → event `client_signal_set`

Past op platform-vision principe — _"Database als communication bus, all agent coordination via DB rows"_. Elke transitie staat in de DB, geen verborgen state.

## 12.7 Wat we beschermen tegen — vier failure modes

| Failure                            | Bescherming                                            |
| ---------------------------------- | ------------------------------------------------------ |
| Issue zonder topic verdwijnt       | Triage-counter altijd zichtbaar in nav                 |
| Topic-status klopt niet met issues | Eén-richting rollup, expliciete override-flag          |
| Dev werkt aan issue zonder context | Breadcrumb naar topic op elke issue-page               |
| Klant ziet iets dat dev niet kent  | Topic-detail toont exact wat klant ziet (preview-mode) |

## 12.8 Wekelijkse curatie-ritueel

**Wie**: account manager per project (1 verantwoordelijke per klant)

**Wanneer**: vrijdag, 30 min per klant (target — sectie 5.4 gate)

**Wat**:

1. Open Triage-queue → koppel ungrouped issues aan topics (fase 1-3) of accepteer AI-suggesties (fase 5)
2. Open Topic-board → check `awaiting_client_input`-kolom: zijn er topics ≥ 14 dagen oud zonder klant-signaal? Stuur reminder.
3. Check `wont_do_proposed_by_client`-kolom (fase 3): bevestig of bestrijd klant-👎-signalen
4. Schrijf wekelijks rapport (fase 4) → publiceer

**Wat is geen onderdeel van curatie**:

- Bug-triage (zit elders in DevHub)
- Sprint-planning (wel topic-niveau, maar separate ritueel)
- Klant-communicatie (rapport doet dat impliciet)

> Als curatie ritueel gaat overlopen (>2u/klant/week), is dit dé indicator dat fase 5 (AI) waarde toevoegt.

## 12.9 Onboarding nieuwe dev

Voor een dev die nieuw is in DevHub na deze refactor:

**5-min uitleg**:

> "We hebben twee niveaus: issues en topics. Issues zijn jouw werk. Topics zijn klant-zicht. Eén issue hoort bij max één topic. Status van topic volgt automatisch uit issues — tenzij iemand override aanzet. Je werkt 90% in issue-niveau zoals altijd; topic-niveau is voor account managers. Klik op de breadcrumb 'Onderdeel van topic' om context te zien."

**15-min checklist**:

- [ ] Lees [`docs/specs/prd-portal-roadmap/00-index.md`](./00-index.md)
- [ ] Open één topic en de gekoppelde issues — snap je het verschil?
- [ ] Open Triage-queue — koppel één issue aan een topic
- [ ] Wijzig issue-status naar `in_progress` → check dat topic-status auto rolt naar `in_progress`
- [ ] Open Portal als test-klant — zie hoe het topic eruitziet vanaf de andere kant

## 12.10 Wat dit betekent voor jullie huidige DevHub

Niet weggooien — uitbreiden:

- `apps/devhub/src/features/issues/` blijft bestaan voor issue-detail + werk
- Nieuwe `apps/devhub/src/features/topics/` voor de curatielaag
- Nieuwe `apps/devhub/src/components/triage/` als compositiepagina
- Sprint-board krijgt een toggle: "view as topics / view as issues"

Update CLAUDE.md feature-structuur registry:

```
| DevHub | Features (`features/[naam]/`) | `issues`, `topics` (nieuw) |
| DevHub | Compositiepagina's | `dashboard`, `review`, `triage` (nieuw), `reports` (fase 4) |
```

## 12.11 Migratie-pad voor bestaande issues

Op het moment dat fase 1 in productie gaat, bestaan er al N open DevHub-issues. Drie strategieën:

### Strategie A — Lazy migratie (aanbevolen voor v1)

- Bestaande issues blijven `topic_id IS NULL`
- Triage-queue toont ze allemaal
- Team werkt door de queue heen, koppelt issues aan nieuwe topics
- Tempo: ~10-20 issues per uur, dus 100 issues = 5-10 uur eenmalig werk

### Strategie B — Bulk-migration script

- Schrijf eenmalige script die issues clusteren op label of project
- Genereert default-topics ("Meldingen rond X", "Bugs in Y")
- Mens reviewt na

**Risico**: lage kwaliteit topics; klant ziet ze direct. Liever niet.

### Strategie C — Defer tot fase 5

- Wacht met grote migratie tot AI-curator klaar is
- Run agent op bestaande issues, mens reviewt suggesties
- Schaalbaarder voor 100+ issues

**Trade-off**: tot fase 5 ziet klant in Portal alleen recent gemaakte issues onder topics. Oudere issues zitten nog in `/issues`-route.

**Aanbevolen pad**: **A in fase 1**, oude issues mogen blijven liggen in `/issues`-route. Als klant ze in Portal niet ziet, geen probleem zolang nieuwe issues wel via topic-laag verschijnen. Bij fase 5 historisch reclusteren.

## 12.12 Wat we expliciet níét doen

- ❌ Topics als vervanging van issues (issues blijven primair voor team-werk)
- ❌ Devs verplichten om in topic-niveau te werken (dat is account-manager-werk)
- ❌ Klant in DevHub laten — DevHub blijft intern
- ❌ Topics aan tickets in andere systemen koppelen (bv. GitHub issues van clients) — uitgesteld
- ❌ Topic-templates ("standaard topics" zoals 'Performance', 'Security') — eerst zien of nuttig
