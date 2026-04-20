# Sprint Q4b — Spec & Docs Sync (Execution)

**Type:** Uitvoeringssprint — alleen starten na Q4a
**Blokkade:** Q4a spike-rapport `docs/specs/docs-inventory.md` moet bestaan en aanbevelingen moeten goedgekeurd zijn
**Area:** `docs/`, `CLAUDE.md`, `sprints/backlog/README.md`, `packages/*/README.md`, `.claude/`
**Priority:** Hoog — voorkomt verdere drift

## Doel

Voer doc-wijzigingen uit volgens Q4a-aanbevelingen. Geen nieuwe aannames, geen scope-uitbreiding. Na deze sprint matchen docs de codebase.

## Context

Alle cijfers, locaties, templates en keuzes komen uit `docs/specs/docs-inventory.md` (Q4a).

## Taken

### Q4b-1: CLAUDE.md sprint-telling bijwerken

- [ ] Update "Current state" sectie met correcte getallen uit Q4a-1
- [ ] Voeg per-prefix breakdown toe als Q4a aanbeveelt
- [ ] Update datums / "last reviewed" veld

### Q4b-2: `docs/specs/agents.md` aanmaken

- [ ] Gebruik template uit Q4a-3
- [ ] Vul agent-per-agent in volgens registry-analyse
- [ ] Documenteer status van `email-extractor` per Q4a-bevinding (bewust excluded? orphaned? dood?)
- [ ] Noteer historische wijzigingen (Extractor → Risk Specialist) als voetnoot
- [ ] Optioneel per Q4a: scriptje `npm run docs:agents` om deze tabel te regenereren

### Q4b-3: Requirements-docs opschonen

Scope en prioriteit per Q4a-5:

- [ ] Hernoem FUNC-005 "Extractor" → correcte naam per Q4a-aanbeveling
- [ ] Voeg `last-reviewed` frontmatter toe aan beide requirements-docs
- [ ] Loop de vastgestelde scope van requirements langs en markeer status
- [ ] Traceability: verwijs per gemarkeerde requirement naar sprint(s) in `sprints/done/`

### Q4b-4: Vision-doc updaten

Per Q4a-4 diff:

- [ ] Corrigeer "Built agents (N)" getal
- [ ] Label planned agents duidelijk als "Roadmap — niet gebouwd"
- [ ] Voeg per geplande agent een verwacht kwartaal + trigger toe
- [ ] Update `last-reviewed` frontmatter

### Q4b-5: Package READMEs

Per skeleton uit Q4a-6, één README per package:

- [ ] `packages/ai/README.md`
- [ ] `packages/auth/README.md`
- [ ] `packages/database/README.md` (inclusief client-scope beleid uit Q2a-5, indien beschikbaar)
- [ ] `packages/mcp/README.md`
- [ ] `packages/ui/README.md`

### Q4b-6: Backlog-README opschonen

Per Q4a-9 diff:

- [ ] Verplaats entries die al done zijn naar "Completed Sprints Summary"
- [ ] Voeg Q1a/Q1b/Q2a/Q2b/Q3a/Q3b/Q4a/Q4b toe als open items
- [ ] Harmoniseer kolommen

### Q4b-7: Dep-graph-status documenteren

Per Q4a-7: alleen documentatie, geen nieuwe automatisering (tenzij Q4a iets concreets vindt):

- [ ] CLAUDE.md sectie "Read at Session Start" bijwerken: beschrijf dat dep-graph al via Husky pre-commit regenereert
- [ ] Dode verwijzing in CLAUDE.md naar handmatige `npm run dep-graph` alleen voor als trigger hem niet raakt

### Q4b-8: Sync-ritme + `.claude/` afstemming

Per Q4a-8:

- [ ] Maak `docs/specs/sync-ritme.md` met: wat gebeurt automatisch, wat maandelijks handmatig, wie verantwoordelijk
- [ ] Verwijs naar bestaande `.claude/agents/agent-sync.md` (of update hem als die niet klopt)
- [ ] Voeg checklist toe die maintainer na elke merged sprint doorloopt (1 regel: sprint-count + requirements-status updaten)

## Afronding

- [ ] Sprint-telling in CLAUDE.md matcht `sprints/done/`
- [ ] `docs/specs/agents.md` bestaat en matcht registry.ts
- [ ] 5 package READMEs bestaan
- [ ] Requirements-docs hebben `last-reviewed` datum
- [ ] Vision-doc agent-count is correct
- [ ] Backlog-README matcht bestandssysteem
- [ ] Sync-ritme-doc bestaat en verwijst naar `.claude/agents/`
- [ ] `docs/specs/docs-inventory.md` markeer "executed"
