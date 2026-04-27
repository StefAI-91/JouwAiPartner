# 13. Validatie & Open Vragen

## 13.1 Validatie-momenten — samenvatting

Volledige spec in sectie 5.4. Hier de samenvatting per gate met de minimale eisen om door te mogen.

| Gate          | Wanneer                      | Belangrijkste metric                                | Drempel            |
| ------------- | ---------------------------- | --------------------------------------------------- | ------------------ |
| Fase 1 → 2    | Week 4-6 na fase 1 go-live   | Klant-interview: "vervangt dit ad-hoc rapportages?" | Ja, met voorbeeld  |
| Fase 2 → 3    | Week 8-10 na fase 2 go-live  | % topics met klant-signaal                          | ≥30%               |
| Fase 3 → 4    | Week 12-14 na fase 3 go-live | Curatielast per klant per week                      | ≤2 uur             |
| Fase 4 → 5    | Week 16+ na fase 4 go-live   | Klant haalt rapport actief op                       | ≥50% klanten       |
| Fase 5 review | Week 8 na fase 5 go-live     | Agent-acceptance                                    | ≥70% topic-curator |

**Als een gate rood is**: niet doordrukken. Drie scenario's in sectie 5.7.

## 13.2 Open vragen — vóór fase 1

### O-1: Welk model voor klant-prioritering?

**Status**: provisioneel keuze C (klant signaleert, team beslist) gemaakt in sectie 4.5.

**Te beantwoorden door**: gesprek met CAI in week 1 vóór fase 2 begint.

**Mogelijke uitkomsten**:

- Bevestig C → ga door zoals gepland
- Klant wil expliciete P1-toekenning (optie A) → groter herontwerp van fase 2
- Klant wil quotum (optie B) → kleine aanpassing van fase 2 UI

### O-2: Bugs ook door klant-loop?

**Status**: provisioneel "alleen features" (sectie 4.6).

**Te beantwoorden door**: ervaring in fase 1 + 2.

**Mogelijke uitkomsten**:

- Bugs blijven team-only → geen wijziging
- Specifieke bug-types via klant-loop → uitbreiden status-machine met extra path

### O-3: Multi-stakeholder per klantorganisatie?

**Status**: v1 = per-org één signaal (sectie 4.8).

**Te beantwoorden door**: aantal stakeholders per pilot-klant. CAI heeft 1-2; kan een grote klant 5+ hebben?

**Migratie**: per-user signalen toevoegen is non-breaking — `topic_client_signals.set_by_profile_id` blijft, semantiek verschuift.

### O-4: Snapshots erbij of alleen live-view?

**Status**: snapshots in fase 4, expliciet overslaan tot fase 4 (sectie 9).

**Te beantwoorden door**: na fase 1-3, meet of klanten narratief missen.

**Risico**: als klanten al in fase 1 om snapshots vragen, niet weerstaan tot fase 4 — eerder bouwen.

## 13.3 Open vragen — vóór implementatie

### I-1: Auto-rollup via Postgres-trigger of server-side?

**Status**: aanbeveling server-side in mutation (sectie 8.3.1).

**Te beslissen**: vóór fase 3-implementatie. Alternatief is Postgres-trigger.

**Trade-offs**:

- **Server-side**: testbaar, debuggebaar, transactioneel met issue-update
- **Trigger**: garandeert consistentie ook bij directe DB-writes, lastiger te debuggen

**Aanbeveling**: server-side. Pas trigger als tweede laag toevoegen als je merkt dat directe DB-writes plaatsvinden.

### I-2: `topic_client_signals` model — optie A of B?

**Status**: aanbeveling optie A (één rij per (topic, org), audit apart) in sectie 11.4.

**Te beslissen**: vóór fase 2-implementatie.

### I-3: Junction-tabel of directe `topic_id` op issues?

**Status**: junction in sectie 11.3, met opmerking over performance.

**Te beslissen**: vóór fase 1-implementatie (DB-migratie).

**Aanbeveling**: junction in v1, herzie als performance bottleneck (>10k issues per project).

### I-4: Status-transitie-regels — check-constraint of trigger?

**Status**: open in sectie 11.7.

**Te beslissen**: vóór fase 3-implementatie.

**Aanbeveling**: server-side validatie in mutations + database CHECK constraint op enum als safety-net. Geen trigger.

### I-5: Sprint-tabel of text-veld voor `target_sprint_id`?

**Status**: open in sectie 11.2.

**Te beslissen**: check of er al een `sprints`-tabel is in DevHub. Zo niet: text-veld in v1, migreren als sprints formele entiteit worden.

**Actie**: grep DevHub-codebase voor "sprint" — zit er al data? (zie [`docs/dependency-graph.md`](../../dependency-graph.md))

### I-6: Hoe presenteren we topic-detail vs issue-detail in DevHub?

**Status**: twee aparte pagina's (sectie 12.3).

**Te beslissen**: tijdens fase 1-implementatie kan blijken dat één gecombineerde pagina logischer is.

**Trade-off**: twee pagina's = duidelijke scheiding. Eén = minder kliks. Aanbevolen: twee, link tussen via breadcrumb.

## 13.4 Open vragen — strategisch

### S-1: Bouwen of kopen?

**Status**: bouwen, met argumenten in sectie 3.9.

**Te beantwoorden**: na fase 1, evalueer ervaringskosten.

**Trigger voor heroverweging**: als curatielast >4 uur/klant/week en AI niet helpt, overweeg Canny+Linear-koppeling alsnog.

### S-2: Wie is verantwoordelijk voor topic-curatie?

**Status**: account manager per project (sectie 12.8).

**Te beslissen**: rolverdeling expliciet maken vóór fase 1 go-live.

**Risico**: zonder eigenaar verlopen topics. Verantwoordelijke + back-up opnemen in onboarding-doc.

### S-3: Hoe communiceren we de wijziging aan bestaande klanten?

**Status**: niet gedefinieerd in deze PRD.

**Te beantwoorden vóór fase 1 go-live**:

- Email naar bestaande Portal-gebruikers ("we hebben de roadmap-view toegevoegd")
- In-app banner ("Nieuw: roadmap met 4 buckets")
- Eventueel demo-call met CAI

### S-4: Welke metrics meten we structureel?

**Status**: per-fase gates in sectie 5.4. Geen continu dashboard.

**Te beantwoorden**: bouwen we een internal metrics-dashboard?

**Aanbeveling**: minimaal Mixpanel/PostHog tracking voor:

- Topic-creates per week per project
- Klant-signaal-clicks
- Portal-rapport-views
- Triage-queue-doorlooptijd

### S-5: Hoe verhouden topics zich tot meeting-extracties / tasks?

**Status**: niet gedekt in PRD.

**Context**: Cockpit heeft `tasks` en `meeting-extractions` (zie `docs/dependency-graph.md`). Als een meeting een actie-item oplevert, wordt het een task. Als een task naar DevHub gaat, kan het een issue worden. Wordt het ook een topic?

**Te beantwoorden vóór fase 3**:

- Gaat task → issue → topic-pad bestaan?
- Of blijven tasks Cockpit-only en topics DevHub-only?

**Aanbeveling**: in fase 1-2 handmatig (account manager beslist). Fase 5 AI kan deze koppeling automatiseren.

## 13.5 Acceptatiecriteria — overall PRD-niveau

Deze PRD is "klaar voor sprint-planning" als:

- [x] Sectie 1-12 geschreven met klare reasoning per fase
- [ ] Open vragen O-1 t/m O-4 beantwoord (voor fase 1)
- [ ] Open vragen I-1 t/m I-6 beantwoord (vóór elke fase de relevante)
- [ ] Verantwoordelijke voor topic-curatie aangewezen
- [ ] CAI ingelicht over topic-concept en bevestigd dat ze het waardevol vinden
- [ ] Sprint-spec voor fase 1 geschreven (zie sectie 13.6)

## 13.6 Volgende stap — fase 1 sprint-spec

Voor fase 1 implementatie heeft het team nodig:

1. **Concrete sprint-document** (in `sprints/backlog/`): tasks, dependencies, dev-uren-schatting
2. **DB-migraties** schrijfklaar (op basis van sectie 11)
3. **UI-mockups** of wireframes voor:
   - DevHub topic-list + topic-detail + topic-create-form
   - Portal `/projects/[id]/roadmap` page met 4 buckets
   - Portal topic-detail
4. **Beslissing op O-1 t/m O-4 en I-3** (de fase-1-vragen)

> Aanbeveling: gebruik de `prd-to-sprint` agent (zie `.claude/agents/`) om deze PRD om te zetten in micro-sprints in `sprints/backlog/`.

## 13.7 Open risico's — niet eerder genoemd

### R-1: Klanten die meerdere projecten hebben

**Probleem**: één klantorganisatie kan meerdere projecten hebben. Topic-laag is per-project. Wat als een topic relevant is voor meerdere projecten van dezelfde klant?

**Aanbeveling**: niet ondersteunen in v1 — vereist topic-duplicatie of cross-project-topics. Als probleem zich voordoet: aparte topics per project, mens beslist relatie.

### R-2: GDPR / data-export

**Probleem**: een klant vraagt om export van alle data uit Portal. Topics + signalen + reports zijn nu deel van dat verzoek.

**Aanbeveling**: voeg toe aan bestaande GDPR-export-workflow (als die bestaat). Anders out-of-scope tot expliciet verzoek.

### R-3: Klant verlaat platform

**Probleem**: contract eindigt. Wat gebeurt met topics, signals, reports?

**Aanbeveling**: archiveer-flow analoog aan bestaande project-archive. Topics blijven intern voor leereffect; signalen worden geanonimiseerd.

### R-4: Verandering in DevHub-issue-statussen breekt rollup

**Probleem**: als jullie ooit nieuwe issue-status toevoegen of bestaande wijzigen, breekt de rollup-mapping in sectie 12.5.

**Aanbeveling**: rollup-regels documenteren als constants in `packages/database/src/constants/topics.ts`, niet hardcoded in mutations. Bij issue-status-uitbreiding: refactor van constants triggert type-error → forceert update.

### R-5: AI-budget overschrijding in fase 5

**Probleem**: agent draait op elke nieuwe issue → tokens-cost groeit lineair met klant-volume.

**Aanbeveling**: budget-cap per project per maand in `packages/ai/src/agents/`. Bij overschrijding: agent fail-fast, mens neemt over.

## 13.8 Definitie "klaar"

Per fase telt deze PRD als "afgerond" als:

- [ ] Alle acceptatiecriteria uit fase-sectie groen
- [ ] Validatie-gate (sectie 5.4) is gepasseerd of bewust overgeslagen met motivatie
- [ ] CLAUDE.md feature-structuur registry is bijgewerkt
- [ ] `docs/dependency-graph.md` is opnieuw gegenereerd
- [ ] `docs/specs/docs-inventory.md` is bijgewerkt
- [ ] Sprint-folder is verplaatst naar `sprints/done/`

## 13.9 Aanvullingen op de PRD

Deze PRD is een levend document. Wijzigingen logged in:

- Top-level metadata (versie, datum) in [`00-index.md`](./00-index.md)
- Per-sectie changes via Git commits met reasoning in commit-message

> Wijzigingen aan de fase-grenzen (bijv. fase 2 wordt 2a + 2b) vereisen update van sectie 5 én alle volgende secties die ernaar verwijzen. Bij twijfel: open een GitHub-issue met label `prd-portal-roadmap` en discussieer voordat je wijzigt.
