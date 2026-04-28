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

Sectie 5 (per-sprint requirement-bron mapping), sectie 6 (PRD §-sectie → sprint mapping inverse) en sectie 7 (open-vragen tracking) volgen in een vervolg-edit. Tot die tijd geldt:

- Per-sprint requirement-IDs en rationale: zie de individuele sprint-bestanden (bv. `PR-001-topics-database-foundation.md` § Requirements)
- Open vragen O-1 t/m O-4 en I-1 t/m I-6: gemarkeerd in elke sprint onder § Afhankelijkheden / § Risico's

## 7. Onderhouds-instructies

- **Sprint-revisie** → update sectie 1 + 4 én de per-sprint regels in sectie 5 (chunk 2)
- **Nieuwe sprint** → voeg toe aan sectie 1, 2, 3 (in de juiste fase-tabel) en een vermelding in sectie 5
- **PRD-wijziging** → check of sectie 2 (fase-mapping) nog klopt; voeg requirement-IDs toe aan de relevante sprint
- **Gate-rood** → noteer in sectie 4 met datum en uitkomst; latere sprints krijgen status `Blocked` of `Cancelled`
