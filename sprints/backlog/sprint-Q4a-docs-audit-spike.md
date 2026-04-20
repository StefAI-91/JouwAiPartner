# Sprint Q4a — Docs Audit (Spike)

**Type:** Spike — alleen onderzoek, geen doc-wijzigingen
**Duur:** 1-2 uur
**Area:** `docs/`, `sprints/`, `packages/*/README*`, `.claude/`, `.husky/`, `package.json`
**Priority:** Blokkeert Q4b
**Aanleiding:** Review van het eerste Q4-voorstel toonde dat de sprint-telling (59 → eigenlijk 65), de agent-count (11 vs 12), de locatie van PW-QC sprints (`/docs/backlog/` niet `/sprints/backlog/`), de status van `email-extractor` (bewust uitgesloten, niet orphaned), en de dep-graph-automation-status (al in Husky) allemaal niet klopten. Drift over drift.

## Doel

Produceer `docs/specs/docs-inventory.md`: compleet overzicht van alle docs, sprints, registers en automatisering, met status en aanbeveling per item. Basis voor Q4b die alleen uitvoert.

## Taken

### Q4a-1: Werkelijke sprint-telling

- [ ] `ls sprints/done/` en `ls sprints/backlog/` — lijst alle bestanden
- [ ] Categoriseer per prefix (`sprint-NNN-`, `CP-`, `DH-`, `FND-`, `T-`, `R-`, `Q-`)
- [ ] Totaal per prefix + globaal
- [ ] Check hoe CLAUDE.md "39 sprints" bedoeld was (inclusief tests? CP-sprints?) en bepaal de juiste weergave

### Q4a-2: Docs-structuur-inventaris

- [ ] `ls -la docs/` op alle niveaus
- [ ] Onderscheid: `docs/specs/`, `docs/backlog/`, `docs/security/`, `docs/archive/`, root docs
- [ ] Per file: doel, leeftijd (git log -1), status (actueel/verouderd/archiveren)
- [ ] Ontdek: PW-QC sprints bestaan volgens reviewer in `docs/backlog/`, niet in `sprints/backlog/` — verifieer en documenteer waarom twee locaties bestaan

### Q4a-3: Agent-registry-analyse

- [ ] Lees `packages/ai/src/agents/registry.ts` — lijst alle geregistreerde agents
- [ ] Lees de registry-comment over "planned / mock agents NIET in dit register"
- [ ] Lijst álle files in `packages/ai/src/agents/` — wie is geregistreerd, wie niet
- [ ] `email-extractor` specifiek: wordt hij aangeroepen? Zo niet, is hij planned, experiment, of dood?
- [ ] Bepaal template voor `docs/specs/agents.md`: kolommen (naam, model, quadrant, status, bestand, doel)

### Q4a-4: Vision-doc vs registry

- [ ] Lees `docs/specs/vision-ai-native-architecture.md`, sectie agents
- [ ] Vergelijk "Built agents (N)" met registry — exacte getallen
- [ ] Vergelijk "Planned agents" met wat écht gepland is
- [ ] Documenteer exacte wijzigingen die Q4b moet aanbrengen

### Q4a-5: Requirements-docs scope-meting

- [ ] `wc -l docs/specs/requirements.md docs/specs/requirements-devhub.md`
- [ ] Telling van requirement-IDs (FUNC-_, DATA-_, AI-_, MCP-_, RULE-\*)
- [ ] Doe een steekproef van 5 requirements uit elk doc: zijn ze nog accuraat?
- [ ] Tijdschatting voor volledige review in Q4b (realistisch, geen onderbudget)

### Q4a-6: Package README-gaten

- [ ] Check per package `packages/{ai,auth,database,mcp,ui}` of README bestaat
- [ ] Voor packages zonder README: welke publieke exports / modules moeten gedocumenteerd?
- [ ] Schrijf template-skeleton die Q4b per package invult

### Q4a-7: Husky / dep-graph-status

- [ ] Lees `.husky/pre-commit`, `.husky/pre-push`, etc.
- [ ] Check `package.json` scripts voor `dep-graph`
- [ ] Bepaal: wat werkt al, wat moet Q4b eventueel toevoegen?
- [ ] Conclusie: Q4-7 oorspronkelijk voorstel overbodig of nog geldig?

### Q4a-8: `.claude/` framework

- [ ] `ls .claude/agents/` — welke agent-definities staan er?
- [ ] Lees `.claude/settings.json` — welke hooks zijn er?
- [ ] Bepaal: hoe moet Q4b-8 "sync-ritme" rekening houden met dit framework?
- [ ] Concreet: is er al een `agent-sync.md` die periodiek specs checkt?

### Q4a-9: Backlog-README-drift

- [ ] Vergelijk `sprints/backlog/README.md` tabel met daadwerkelijke inhoud van `sprints/backlog/` en `sprints/done/`
- [ ] Lijst entries die foutief als "Backlog" gelabeld zijn terwijl de sprint done is
- [ ] Lijst entries die ontbreken

### Q4a-10: Aanbevelingen per Q4b-taak

Voor elk ontwerp-idee uit het originele Q4:

- [ ] Q4-1 sprint-telling → concrete juiste cijfers + waar in CLAUDE.md
- [ ] Q4-2 agents.md → goedgekeurde template + bronscript?
- [ ] Q4-3 requirements → scope + prioriteit + wie doet het
- [ ] Q4-4 vision → exacte regels die wijzigen
- [ ] Q4-5 READMEs → skeletons klaar
- [ ] Q4-6 backlog README → diff-lijst
- [ ] Q4-7 dep-graph → schrap of vereenvoudig (blijkt al auto)
- [ ] Q4-8 sync-ritme → afstemmen met `.claude/agents/`

## Output

**Bestand:** `docs/specs/docs-inventory.md` met:

1. Sprint-telling (definitief)
2. Docs-structuur + statussen
3. Agent-registry-analyse
4. Vision-diff
5. Requirements-scope
6. README-templates
7. Husky/dep-graph-status
8. `.claude/`-overzicht
9. Backlog-README-diff
10. Q4b-takenlijst met vaste scope

## Afronding

- [ ] Rapport gecommit
- [ ] Q4b kan uitvoeren zonder eigen aannames
