# Portal Roadmap — Traceability Matrix

PRD: [`docs/specs/prd-portal-roadmap/`](../../docs/specs/prd-portal-roadmap/) (versie 1.0, 2026-04-27)
Sprints: PR-000 t/m PR-018 (19 sprints, ~224 requirements)

> Deze matrix borgt dat elke PRD-requirement minstens één keer in een sprint terugkomt en dat elke sprint-requirement traceerbaar is naar een PRD-sectie. Update bij elke PRD-wijziging of sprint-revisie.
>
> **Chunk 1** dekt sprint-overzicht, fase-mapping, dependencies en vision-alignment. Chunk 2 (sectie 5–7) volgt apart en dekt per-sprint requirement-bron mapping en open-vragen-tracking.

## 1. Sprint-overzicht

| Sprint | Naam                                       | Fase  | Doel-laag           | Bouwt voort op           |
| ------ | ------------------------------------------ | ----- | ------------------- | ------------------------ |
| PR-000 | Portal mobile drawer                       | Pre-1 | Portal chrome       | Portal v1 (CP-006/8/9)   |
| PR-001 | Topics database foundation                 | 1     | Database + types    | CP-006 (issues schema)   |
| PR-002 | Topics queries + mutations + Zod           | 1     | Data-API            | PR-001                   |
| PR-003 | DevHub topics feature                      | 1     | DevHub UI           | PR-002                   |
| PR-004 | Portal roadmap-page (4 buckets, read-only) | 1     | Portal UI           | PR-002 (PR-003 parallel) |
| PR-005 | Klant-signalen DB + data-API               | 2     | Database + data-API | PR-001/2                 |
| PR-006 | Klant-signalen Portal + DevHub UI          | 2     | UI                  | PR-005, PR-004           |
| PR-007 | Auto-rollup status                         | 3     | Mutation-laag       | PR-002                   |
| PR-008 | DevHub triage-queue                        | 3     | DevHub UI           | PR-002, PR-007           |
| PR-009 | Audit-events + timelines                   | 3     | Database + UI       | PR-002, PR-007           |
| PR-010 | wont_do met verplichte reden               | 3     | Database + UI       | PR-009                   |
| PR-011 | Status reports DB + data-API               | 4     | Database + data-API | PR-009                   |
| PR-012 | DevHub report editor                       | 4     | DevHub UI           | PR-011                   |
| PR-013 | Portal reports archief + detail            | 4     | Portal UI           | PR-011 (PR-012 parallel) |
| PR-014 | Topic-curator agent                        | 5     | AI + UI             | PR-008, PR-013           |
| PR-015 | Topic-narrator agent                       | 5     | AI + UI             | PR-012, PR-014           |
| PR-016 | Pattern-detector agent                     | 5     | AI + UI             | PR-012, PR-014           |
| PR-017 | Topic merge/split UI                       | 5     | DevHub UI           | PR-008                   |
| PR-018 | agent_suggestions + acceptance-tracking    | 5     | Database + UI       | PR-014/15/16             |

**Aanname**: nummering is implementatie-volgorde, niet hardgekoppelde dependency. Zie sectie 3 voor parallelle paden.

## 2. PRD-fase → sprint-mapping

| PRD-fase                                                                                                     | Sprint(s)                              | Validatie-gate                                    |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------- | ------------------------------------------------- |
| **Pre-fase 1** — Portal mobile drawer (uit §14.10 open design-vraag)                                         | PR-000                                 | Geen — ontblokt fase 1 mobiel                     |
| **Fase 1** — Basis: Topics + 4-bucket Portal ([§6](../../docs/specs/prd-portal-roadmap/06-fase-1-basis.md))  | PR-001, PR-002, PR-003, PR-004         | Klant-interview week 4-6 (§5.4)                   |
| **Fase 2** — Klant-signalen ([§7](../../docs/specs/prd-portal-roadmap/07-fase-2-klant-signalen.md))          | PR-005, PR-006                         | Signaal-clicks ≥30%, week 8-10 (§5.4)             |
| **Fase 3** — Lifecycle automation + audit ([§8](../../docs/specs/prd-portal-roadmap/08-fase-3-lifecycle.md)) | PR-007, PR-008, PR-009, PR-010         | Curatielast ≤2u/klant/week, week 12-14 (§5.4)     |
| **Fase 4** — Narratieve snapshots ([§9](../../docs/specs/prd-portal-roadmap/09-fase-4-narratief.md))         | PR-011, PR-012, PR-013                 | Klant haalt rapport op ≥50%, week 16+ (§5.4)      |
| **Fase 5** — AI-acceleratie ([§10](../../docs/specs/prd-portal-roadmap/10-fase-5-ai-acceleratie.md))         | PR-014, PR-015, PR-016, PR-017, PR-018 | Curator-acceptance ≥70%, week 8 na go-live (§5.4) |

## 3. Implementatie-volgorde + parallelle paden

```
PR-000 (kan los, zelfs vóór alles)
   │
   ▼
PR-001 ─► PR-002 ─┬─► PR-003 (DevHub UI)
                  ├─► PR-004 (Portal UI)              ← Fase 1 gate
                  │
                  ├─► PR-005 ─► PR-006                ← Fase 2 gate
                  │
                  └─► PR-007 ─┬─► PR-008
                              ├─► PR-009 ─► PR-010    ← Fase 3 gate
                              │
                              ▼
                              PR-011 ─┬─► PR-012
                                      └─► PR-013      ← Fase 4 gate
                                          │
                                          ▼
                                          PR-014, PR-015, PR-016 (kunnen parallel)
                                          PR-017 (los, vereist alleen PR-008)
                                          PR-018 (sluit fase 5 af)  ← Fase 5 gate
```

**Cruciale parallellisaties:**

- **PR-003 ‖ PR-004** — DevHub UI en Portal UI delen alleen de query-laag (PR-002). Devhub-team kan parallel met portal-team.
- **PR-005 ‖ PR-007/8/9/10** — fase 2 (signalen) en fase 3 (lifecycle) hangen niet aan elkaar; vallen onder verschillende validatie-gates.
- **PR-014, PR-015, PR-016** — drie agents zijn onafhankelijk; eerst de meest gestructureerde (curator) om prompt-iteratie te leren.
- **PR-017** — merge/split UI vereist alleen PR-008 (triage); kan parallel aan agents gebouwd worden.

## 4. Validatie-gates en blockers per sprint

Validatie-gates uit PRD §5.4 zijn verplicht: tussen elke fase een leermoment vóór doorgang. Sprint-implementatie blokkeert nooit een gate, maar gate-rood-uitkomst kan latere sprints schrappen.

| Gate          | Wanneer (na go-live) | Blokkeert      | Bron     |
| ------------- | -------------------- | -------------- | -------- |
| Fase 1 → 2    | Week 4-6             | PR-005, PR-006 | PRD §5.4 |
| Fase 2 → 3    | Week 8-10            | PR-007 t/m 10  | PRD §5.4 |
| Fase 3 → 4    | Week 12-14           | PR-011 t/m 13  | PRD §5.4 |
| Fase 4 → 5    | Week 16+             | PR-014 t/m 18  | PRD §5.4 |
| Fase 5 review | Week 8 na go-live    | v2-werk        | PRD §5.4 |

**Rule (CLAUDE.md + PRD §5.7)**: gate rood → niet doordrukken. Fase-progressie hervat alleen na bewuste herziening, geen sunk-cost-doordrukken.

## 5. Vision-alignment check

Mapping tegen [`docs/specs/vision-ai-native-architecture.md`](../../docs/specs/vision-ai-native-architecture.md) §2.4 (Portal als trust layer) en kern-principes:

| Vision-kernpunt                                | Sprint(s)                              | Status |
| ---------------------------------------------- | -------------------------------------- | ------ |
| Trust layer / transparency                     | PR-001 t/m PR-013 (alle Portal-views)  | ✅     |
| View status of reported issues                 | PR-004, PR-009 (auto-rollup zichtbaar) | ✅     |
| Submit feedback flows into DevHub              | Bestaand (CP-005); raakt PR-005 niet   | ✅     |
| Verification before truth (gatekeeper-pattern) | PR-014/15/16 (mens reviewt AI)         | ✅     |
| Database als communication bus                 | PR-009 (events), PR-018 (suggestions)  | ✅     |
| AI als account manager                         | PR-014, PR-015 (curator + narrator)    | ✅     |
| Progress / milestones / timeline               | Niet in deze PRD; v2 of aparte track   | ❌     |
| Meeting history / summaries                    | Niet in deze PRD; v2 of aparte track   | ❌     |

De roadmap-PRD dekt het topic + signaal + rapport-stuk; project-fases en meeting-summaries blijven expliciet buiten scope (zie PRD §6.4 / §13.7 R-1).

## 6. Open punten — verwijzing naar chunk 2

> Chunk 2 hieronder vult sectie 5–7 in. Update bij sprint-revisie of PRD-wijziging.

## 5. Sprint → PRD-bron-mapping

Per sprint: range van requirement-IDs + bron-secties in de PRD + welke open vragen blokkerend zijn. Voor de individuele requirements zelf: zie het sprint-bestand.

| Sprint | Requirement-ID-prefixen       | PRD-secties                                                                                    | Open vragen die geblokkeerd zijn                        |
| ------ | ----------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| PR-000 | REQ-001..007, DESIGN-001..002 | §14.6 (mobile-strategie), §14.7 (valkuilen), bestaand `apps/portal/src/components/layout/`     | —                                                       |
| PR-001 | DATA-001..010, RULE-001..002  | §11.1–11.3 (data-model), §11.7 (lifecycle-status), §11.10–11.11 (RLS + migratie-volgorde)      | I-3 (junction), I-5 (sprint-FK)                         |
| PR-002 | REQ-010..022                  | §6.6 (code-organisatie), §11.2 (topics-velden), CLAUDE.md "Database & Queries"                 | —                                                       |
| PR-003 | REQ-030..039, DESIGN-005..006 | §6.3.1–6.3.2 (DevHub topic-CRUD + status), §12.3.2–12.3.3 (board + detail)                     | I-6 (detail vs issue-detail)                            |
| PR-004 | REQ-040..051, DESIGN-007..009 | §6.3.3–6.3.5 (4-bucket portal), §14 (volledige visuele spec)                                   | —                                                       |
| PR-005 | DATA-020..024, REQ-050..055   | §7.5 (data-model signalen), §11.4–11.5 (signaal-tabellen), §4.8 (per-org keuze)                | I-2 (model A/B), O-3 (multi-stakeholder)                |
| PR-006 | REQ-060..068, DESIGN-010..011 | §7.3.1–7.3.5 (UI-flows), §14.4 (signal-pills + undo-toast)                                     | O-1 (klant-prio-model), O-2 (bugs in loop)              |
| PR-007 | REQ-070..080, RULE-010        | §8.3.1 (rollup-regel), §8.3.2 (override-flag), §12.5 (rollup-regels)                           | I-1 (trigger vs server-side), I-4 (transitie-validatie) |
| PR-008 | REQ-080..089, DESIGN-012      | §8.3.3 (triage-queue), §12.3.1 (triage UX)                                                     | —                                                       |
| PR-009 | DATA-030..035, REQ-090..099   | §8.3.4–8.3.5 (audit-events + timelines), §11.6 (topic_events tabel)                            | I-4 (transitie-validatie)                               |
| PR-010 | RULE-020..022, REQ-100..109   | §4.7 (`wont_do` verplicht expliciet), §8.3.6–8.3.7 (`wont_do` flow + klant-`wont_do_proposed`) | —                                                       |
| PR-011 | DATA-040..047, REQ-110..115   | §9.5 (rapport-tabel), §11.8 (`topic_status_reports`)                                           | O-4 (snapshots vs live)                                 |
| PR-012 | REQ-120..130                  | §9.3.1–9.3.3 (rapport-creatie + templates), §9.3.7 (patterns-sectie handmatig)                 | —                                                       |
| PR-013 | REQ-130..145, DESIGN-020..025 | §9.3.4–9.3.6 (archief + detail + nav-CTA), §14.4 editorial details                             | —                                                       |
| PR-014 | AI-001..010, REQ-150..158     | §10.3.1 (`topic-curator` agent), §10.5 (`agent_suggestions`-velden)                            | —                                                       |
| PR-015 | AI-011..018, REQ-160..165     | §10.3.2 (`topic-narrator` agent), §10.7 acceptance-criteria narrator                           | —                                                       |
| PR-016 | AI-019..025, REQ-170..175     | §10.3.3 (`pattern-detector` agent)                                                             | —                                                       |
| PR-017 | REQ-180..189, DESIGN-030      | §10.3.4 (merge/split UI), §3.9 (re-clustering harder dan eerste clustering)                    | —                                                       |
| PR-018 | DATA-050..055, REQ-190..195   | §10.5 (`agent_suggestions` tabel + acceptance-tracking), §10.10 risico-mitigatie               | —                                                       |

> Exacte requirement-IDs en hun één-zin-omschrijvingen: zie de Requirements-tabel in het betreffende sprint-bestand. Deze mapping is op id-prefix-niveau om de matrix leesbaar te houden bij ~224 individuele requirements.

## 6. PRD-§ → sprint inverse-mapping

Voor reviewers die vanuit een PRD-sectie willen zien welke sprint hem implementeert:

| PRD-sectie                          | Onderwerp                                | Sprint(s)                                                              |
| ----------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------- |
| §1 Samenvatting                     | Scope-overzicht                          | — (geen sprint nodig)                                                  |
| §2 Probleem & Context               | Rationale                                | — (geen sprint nodig)                                                  |
| §3 Marktonderzoek                   | Build-vs-buy + lessen                    | — (geen sprint nodig)                                                  |
| §4 Conceptueel Model                | Drie lagen + lifecycle                   | PR-001, PR-007, PR-009                                                 |
| §4.5 Klant signaleert, team beslist | Optie C — pill-knoppen + tooltip         | PR-006                                                                 |
| §4.6 Bug vs Feature defaults        | Lifecycle-startpunten                    | PR-005, PR-007                                                         |
| §4.7 `wont_do` verplicht expliciet  | Reden + klant-zichtbaarheid              | PR-010                                                                 |
| §4.8 Multi-stakeholder per klantorg | Per-org model in v1                      | PR-005                                                                 |
| §4.9 Snapshot vs live-view          | Beide (fase 4)                           | PR-011, PR-013                                                         |
| §4.10 Audit als waarheid            | `topic_events` log                       | PR-009                                                                 |
| §5 Fase-strategie                   | Validatie-gates                          | Zie matrix §4                                                          |
| §6 Fase 1 — Basis                   | Topics + 4-bucket + read-only            | PR-001..PR-004                                                         |
| §7 Fase 2 — Klant-signalen          | Pills + undo + tooltip + DevHub-zicht    | PR-005, PR-006                                                         |
| §8 Fase 3 — Lifecycle automation    | Auto-rollup + triage + audit + `wont_do` | PR-007..PR-010                                                         |
| §9 Fase 4 — Narratieve snapshots    | Reports DB + editor + archief + detail   | PR-011..PR-013                                                         |
| §10 Fase 5 — AI-acceleratie         | Drie agents + merge/split + suggestions  | PR-014..PR-018                                                         |
| §11 Data-model                      | Tabellen + RLS + migratie-volgorde       | PR-001, PR-005, PR-009, PR-011, PR-018                                 |
| §12 DevHub Workflow                 | Triage + topic-board + breadcrumb        | PR-003, PR-008, PR-017                                                 |
| §13 Validatie & Open Vragen         | Gates + blockers                         | Zie matrix §4 + §7                                                     |
| §14 Design-keuzes                   | Visuele spec — referentie voor alle UI   | PR-000, PR-003, PR-004, PR-006, PR-008, PR-010, PR-012, PR-013, PR-017 |
| §14.7 Valkuilen                     | use-client + portal-fix                  | PR-000 (primaire), elke client-component                               |

## 7. Open vragen — tracking en blocker-status

Open vragen uit PRD §13. Status is "open" tenzij anders aangegeven.

### 7.1 Pre-fase 1 vragen

| ID  | Vraag                                   | Status | Blokkeert sprint(s) | Voorlopige aanname in PRD              |
| --- | --------------------------------------- | ------ | ------------------- | -------------------------------------- |
| O-1 | Welk model voor klant-prioritering?     | Open   | PR-006              | Optie C (signaal, team beslist) — §4.5 |
| O-2 | Bugs ook door klant-loop?               | Open   | PR-006              | Alleen features — §4.6                 |
| O-3 | Multi-stakeholder per klantorganisatie? | Open   | PR-005              | Per-org één signaal — §4.8             |
| O-4 | Snapshots erbij of alleen live-view?    | Open   | PR-011..PR-013      | Beide (fase 4) — §4.9                  |

### 7.2 Implementatie-vragen (technisch)

| ID  | Vraag                                                  | Status | Blokkeert sprint(s) | Voorlopige aanname in PRD                   |
| --- | ------------------------------------------------------ | ------ | ------------------- | ------------------------------------------- |
| I-1 | Auto-rollup via Postgres-trigger of server-side?       | Open   | PR-007              | Server-side mutation — §8.3.1               |
| I-2 | `topic_client_signals` model — optie A of B?           | Open   | PR-005              | Optie A (één rij + history-tabel) — §11.4   |
| I-3 | Junction-tabel of directe `topic_id` op issues?        | Open   | PR-001              | Junction in v1 — §11.3                      |
| I-4 | Status-transitie-regels — check-constraint of trigger? | Open   | PR-001, PR-009      | Server-side + DB CHECK enum — §11.7         |
| I-5 | Sprint-tabel of text-veld voor `target_sprint_id`?     | Open   | PR-001              | Text-veld tot sprints-tabel bestaat — §11.2 |
| I-6 | DevHub topic-detail vs issue-detail — apart of merge?  | Open   | PR-003              | Twee aparte pagina's — §12.3                |

### 7.3 Strategische vragen

| ID  | Vraag                                                     | Status | Eigenaar |
| --- | --------------------------------------------------------- | ------ | -------- |
| S-1 | Bouwen of kopen?                                          | Open   | Stef     |
| S-2 | Wie is verantwoordelijk voor topic-curatie?               | Open   | Stef     |
| S-3 | Hoe communiceren we de wijziging aan bestaande klanten?   | Open   | Stef     |
| S-4 | Welke metrics meten we structureel?                       | Open   | Stef     |
| S-5 | Hoe verhouden topics zich tot meeting-extracties / tasks? | Open   | Team     |

### 7.4 Aanvullende risico's (PRD §13.7)

| ID  | Risico                                            | Sprint waar het opduikt | Mitigatie in sprint                                                  |
| --- | ------------------------------------------------- | ----------------------- | -------------------------------------------------------------------- |
| R-1 | Klanten met meerdere projecten                    | PR-001                  | Niet ondersteunen in v1 — aparte topics per project                  |
| R-2 | GDPR / data-export                                | Buiten scope            | Toevoegen aan bestaande GDPR-flow (apart traject)                    |
| R-3 | Klant verlaat platform                            | Buiten scope            | Archiveer-flow analoog aan bestaande project-archive                 |
| R-4 | Wijziging in DevHub-issue-statussen breekt rollup | PR-007                  | Rollup-regels documenteren als constants, type-error forceert update |
| R-5 | AI-budget overschrijding fase 5                   | PR-014, PR-015, PR-016  | Budget-cap per project per maand in `packages/ai/src/agents/`        |

### 7.5 Beslis-volgorde — chronologisch

Adviesvolgorde om vragen te beantwoorden, op basis van welke sprints ze blokkeren:

1. **Vóór PR-001 begint**: I-3, I-4, I-5 (alle DB-fundamenten)
2. **Vóór PR-003 begint**: I-6
3. **Vóór PR-005 begint**: I-2, O-3
4. **Vóór PR-006 begint**: O-1, O-2
5. **Vóór PR-007 begint**: I-1
6. **Vóór PR-011 begint**: O-4 (kan ook later — pas relevant in fase 4)
7. **Vóór go-live van fase 1 (na PR-004)**: S-2 (curatie-eigenaar), S-3 (klantcommunicatie)

> Strategische vragen S-1 (bouwen/kopen) en S-4 (metrics) zijn niet sprint-blokkerend maar bepalen of de hele roadmap doorgaat. Beantwoord vóór PR-001 start.

## 7. Onderhouds-instructies

- **Sprint-revisie** → update sectie 1 + 4 én de per-sprint regels in sectie 5 (chunk 2)
- **Nieuwe sprint** → voeg toe aan sectie 1, 2, 3 (in de juiste fase-tabel) en een vermelding in sectie 5
- **PRD-wijziging** → check of sectie 2 (fase-mapping) nog klopt; voeg requirement-IDs toe aan de relevante sprint
- **Gate-rood** → noteer in sectie 4 met datum en uitkomst; latere sprints krijgen status `Blocked` of `Cancelled`
