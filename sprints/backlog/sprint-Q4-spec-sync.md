# Sprint Q4 — Spec & Documentatie Sync

**Area:** `docs/specs/`, `CLAUDE.md`, `sprints/backlog/README.md`, `packages/*/README.md`
**Priority:** Hoog — spec drift is de belangrijkste onzichtbare risico-bron voor de niet-coder maintainer
**Aanleiding:** Spec-vs-code drift onderzoek (2026-04-20): CLAUDE.md claimt "39 sprints done (28 + 4 + 7 DevHub)" maar werkelijke telling is ~59 (28 + 4 + 20 DevHub + 7 test). `requirements.md` noemt agent "Extractor (Sonnet)" die in code niet meer bestaat — is `Risk Specialist` geworden. Vision-doc claimt "11 agents operational" maar registry heeft 12. 7 beloofde agents (Planner, Executor, Curator, Analyst, Communicator, Support, Dispatcher) staan in Vision maar zijn niet gebouwd, terwijl tekst suggereert ze live zijn. Mentale-map onderzoek: 5 packages (ai, auth, database, mcp, ui) hebben geen README.

## Doel

Specs en code lopen gelijk. Iemand die CLAUDE.md, Vision of requirements.md leest krijgt een accuraat beeld van wat er werkelijk bestaat. Packages zijn zelf-documenterend via README.

## Context

**Concrete drift (onderzoeksrapport 2026-04-20):**

- Sprint-count: CLAUDE.md regel ~16 zegt "39 sprints (28 core + 4 foundation + 7 DevHub)". Werkelijk in `sprints/done/`: 28 core + 4 FND + 20 DH + 7 T = 59 bestanden.
- Agent-rename: `docs/specs/requirements.md` FUNC-005 noemt "Extractor". `packages/ai/src/agents/registry.ts` kent Risk Specialist, geen Extractor-agent.
- Vision-count: `docs/specs/vision-ai-native-architecture.md` zegt "11 agents operational". Registry telt 12.
- Planned vs live: 7 agents in Vision-tabel (Planner, Executor, Curator, Analyst, Communicator, Support, Dispatcher) niet gebouwd, maar de tabel suggereert dat niet duidelijk.
- Orphaned agent: `packages/ai/src/agents/email-extractor.ts` (Sonnet) bestaat maar wordt nergens aangeroepen — is dit dode code of geplande feature?
- README-gaten: `packages/ai/`, `packages/auth/`, `packages/database/`, `packages/mcp/`, `packages/ui/` hebben geen README.
- Backlog-README noemt sprint-031, PW-QC-01 t/m 04, T02-T07 als "Backlog" maar de files bestaan niet in de map.

## Taken

### Q4-1: Sprint-telling corrigeren

**Bestand:** `CLAUDE.md`

- [ ] Tel `sprints/done/` opnieuw, split per prefix (sprint-XXX, CP-, DH-, FND-, T-)
- [ ] Update "Current state" sectie met correcte getallen
- [ ] Update `sprints/backlog/README.md` "Completed Sprints Summary" totaal
- [ ] Overweeg per-quadrant voortgangstabel in CLAUDE.md in plaats van losse getallen

### Q4-2: Agent registry als bron van waarheid

**Bestand:** `docs/specs/agents.md` (nieuw, single source of truth)

- [ ] Lees `packages/ai/src/agents/registry.ts` en genereer agent-tabel: naam, model, quadrant, status (live/planned/deprecated), bestandspad
- [ ] Markeer `email-extractor` als "orphaned" of aansluit op email-pipeline
- [ ] Markeer `Extractor` als gerenamed naar `Risk Specialist` (historische noot)
- [ ] Update Vision doc en CLAUDE.md om naar `agents.md` te verwijzen in plaats van eigen lijsten bij te houden
- [ ] Overweeg scriptje `npm run docs:agents` dat deze tabel auto-regenereert

### Q4-3: Requirements.md opschonen

**Bestand:** `docs/specs/requirements.md`

- [ ] Hernoem FUNC-005 Extractor → Risk Specialist (of splits in meerdere FUNC's als er meer extractor-agents zijn)
- [ ] Loop alle FUNC/DATA/AI/MCP requirements langs: geïmplementeerd → ✓, gedeeltelijk → partial met uitleg, niet → backlog
- [ ] Zelfde voor `requirements-devhub.md`
- [ ] Maak traceability naar `sprints/done/` expliciet per requirement ID

### Q4-4: Vision doc actualiseren

**Bestand:** `docs/specs/vision-ai-native-architecture.md`

- [ ] Sectie "Built agents" bijwerken naar 12
- [ ] Sectie "Planned agents" duidelijk labelen als "Niet gebouwd, roadmap"
- [ ] Per geplande agent: verwacht kwartaal + welke trigger maakt hem urgent
- [ ] Update `last-reviewed: YYYY-MM-DD` veld in frontmatter

### Q4-5: Package READMEs

Minimale README per package: doel, belangrijkste exports, wanneer wel/niet gebruiken.

- [ ] `packages/ai/README.md` — agents, pipelines, embeddings, fireflies-client
- [ ] `packages/auth/README.md` — middleware factory, role-guards, helpers
- [ ] `packages/database/README.md` — Supabase clients, queries vs mutations conventie, types generatie
- [ ] `packages/mcp/README.md` — server, tools, hoe nieuwe tool toevoegen
- [ ] `packages/ui/README.md` — componenten-lijst, format helpers, styling conventies

### Q4-6: Backlog README opschonen

**Bestand:** `sprints/backlog/README.md`

- [ ] Verwijder sprints uit tabel die geen bestand hebben (sprint-031, PW-QC-\*, T02-T07 als die nog niet bestaan) óf maak de files aan
- [ ] Voeg Q1-Q4 sprints toe aan overzicht
- [ ] Houd tabel-kolommen consistent (#, Sprint, Area, Status)

### Q4-7: Dependency-graph automatiseren

- [ ] Check of `npm run dep-graph` bestaat en werkt
- [ ] Voeg hem toe aan een git pre-push hook of aan Husky setup
- [ ] Update CLAUDE.md regel over regeneratie: laat zien wanneer hij automatisch draait

### Q4-8: Onderhoudsritme vastleggen

**Bestand:** `docs/specs/sync-ritme.md`

- [ ] Maandelijkse sync-check: wie draait de `sync` agent, wat checkt hij?
- [ ] Na elke merged sprint: update requirements-status + CLAUDE.md sprint-count
- [ ] Na nieuwe agent: voeg toe aan registry én documenteer in `agents.md`

## Afronding

- [ ] Sprint-telling in CLAUDE.md matcht daadwerkelijke inhoud van `sprints/done/`
- [ ] `docs/specs/agents.md` bestaat en matcht `registry.ts`
- [ ] Alle 5 packages hebben een README
- [ ] Vision en requirements-docs hebben `last-reviewed` datum van deze sprint
- [ ] Backlog README lijst alleen bestaande sprint-bestanden
- [ ] Sync-ritme-doc verwijst naar hoe dit bij te houden
