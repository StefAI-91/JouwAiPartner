# SRP Refactor → Sprint Matrix

Bron: codebase-scan 2026-04-29 — files die de SRP-drempels uit `CLAUDE.md` overschrijden.
Drempels:

- Componenten (`*.tsx`): ~150 regels (CLAUDE.md §Architectuur)
- Queries / Mutations / Pipeline-modules: >300 regels of >15 exports = cluster-trigger (CLAUDE.md §Database & Queries)
- Functies: >2× zo lang als nodig = signaal voor opsplitsing

> **SRP-001 vervallen (2026-04-29):** `shift/page.tsx` (828 r) was een ongelinkte mockup-pagina ("vertrekpunt voor het gesprek", commit `c1d798f`, 18 april). Geen refactor uitgevoerd — de file is **verwijderd** omdat hij geen functie had en niet in navigatie / hrefs zat. Inhoud blijft beschikbaar via git history.

## Sprints

| Sprint  | File                                                           | Regels | Type             | Categorie | Sub-domeinen / Concerns                                     |
| ------- | -------------------------------------------------------------- | ------ | ---------------- | --------- | ----------------------------------------------------------- |
| SRP-002 | `packages/database/src/queries/meetings/core.ts`               | 892    | Query-cluster    | Kritiek   | Base, lookup, pipeline-fetch, regenerate, metadata, mapping |
| SRP-003 | `packages/ai/src/agents/action-item-specialist.ts`             | 851    | Agent            | Kritiek   | Single-stage, two-stage, validator, shared helpers          |
| SRP-004 | `apps/cockpit/.../dev/action-items/run/client.tsx`             | 597    | Component (dev)  | Serieus   | 5 inline subcomponenten                                     |
| SRP-005 | `packages/ai/src/pipeline/summary/core.ts`                     | 516    | Pipeline-cluster | Serieus   | Project, org, triggers (meeting + email)                    |
| SRP-006 | `packages/ai/src/pipeline/tagger.ts`                           | 504    | Pipeline-module  | Serieus   | Themes, projects, tagging-orchestratie                      |
| SRP-007 | `apps/cockpit/.../dev/speaker-mapping/client.tsx`              | 499    | Component (dev)  | Serieus   | Backfill, result, grouped-by-person                         |
| SRP-008 | `apps/devhub/src/features/issues/components/issue-filters.tsx` | 494    | Component        | Serieus   | FilterDropdown, SortDropdown, main filters                  |
| SRP-009 | `packages/ai/src/pipeline/steps/link-themes.ts`                | 484    | Pipeline-step    | Serieus   | Megafunctie 310 r — opbreken in 5 fases                     |
| SRP-010 | `packages/database/src/queries/projects/core.ts`               | 460    | Query-cluster    | Serieus   | List/detail, lookup, AI-context, embedding                  |
| SRP-011 | `packages/ai/src/pipeline/gatekeeper-pipeline.ts`              | 426    | Pipeline-module  | Serieus   | Megafunctie 330 r — classify, identify, detect, orchestrate |
| SRP-012 | `packages/database/src/queries/issues/core.ts`                 | 418    | Query-cluster    | Serieus   | Core/list, counts                                           |

## Categorieën

**Kritiek (2 sprints, ~1.743 regels):** SRP-002, SRP-003. De twee grootste resterende overtreders — beide veelgebruikt en in productie. Refactor levert direct veel waarde op (meeting-queries worden door bijna elke pipeline aangeraakt; action-item-specialist is drie pipelines in één file).

**Serieus (9 sprints):** SRP-004 t/m SRP-012. Twee zinvolle clusterings:

- **AI-pipeline cluster:** SRP-005, SRP-006, SRP-009, SRP-011 — vier pipeline-modules met overlappende patronen. Eén focus-sprint waarin je dezelfde fase-decompositie-aanpak vier keer toepast levert mogelijk meer dan vier losse sprints.
- **Dev-tool cluster:** SRP-004 + SRP-007 — beide cockpit dev-tools met inline subcomponenten. Lage prioriteit (intern), maar zelfde werk-patroon.

**Borderline (niet in deze matrix, vermelden voor latere prioritering):**

| File                                                      | Regels | Reden niet-prio                           |
| --------------------------------------------------------- | ------ | ----------------------------------------- |
| `pipeline/email/core.ts`                                  | 387    | 1.3× drempel, mogelijk wel splitsen later |
| `mcp/src/tools/issues.ts`                                 | 374    | MCP-tools, eigen splits-patroon           |
| `cockpit/.../meetings/components/edit-metadata-modal.tsx` | 381    | 2.5× drempel maar functioneel cohesief    |
| `cockpit/components/weekly/weekly-summary-view.tsx`       | 374    | Idem                                      |
| `database/src/queries/portal/core.ts`                     | 356    | 1.2× drempel                              |
| `database/src/mutations/meetings/core.ts`                 | 343    | 1.1× drempel                              |
| `cockpit/.../navigatie-test/navigatie-playground.tsx`     | 364    | Dev-playground, niet productie            |
| `cockpit/.../dev/detector/client.tsx`                     | 360    | Dev-tool                                  |

## Volgorde-aanbeveling

Geen harde dependencies tussen de sprints — kunnen in elke volgorde. Wel pragmatische volgorde:

```
1. SRP-002 (queries/meetings)        ← veel callers, refactor-effect breed
2. SRP-003 (action-item-specialist)  ← isolated, makkelijk te valideren
3. SRP-006 (tagger)                  ← prerequisite-feel voor SRP-009/SRP-011
4. SRP-009 (link-themes step)
5. SRP-011 (gatekeeper-pipeline)     ← orchestreert tagger + link-themes
6. SRP-005 (summary pipeline)        ← onafhankelijk
7. SRP-010 (queries/projects)        ← onafhankelijk
8. SRP-012 (queries/issues)          ← onafhankelijk
9. SRP-008 (issue-filters)           ← devhub UI
10. SRP-004 (dev/action-items/run)   ← lage prio, dev-tool
11. SRP-007 (dev/speaker-mapping)    ← lage prio, dev-tool
```

**Kritisch pad voor AI-pipeline:** SRP-006 → SRP-009 → SRP-011 (in die volgorde). Tagger wordt door beide andere geconsumeerd.

## Sprint-sizes inschatting

Ruwe schatting op basis van bestaande TH/sprint-NNN sprints:

| Sprint  | Inschatting | Reden                                            |
| ------- | ----------- | ------------------------------------------------ |
| SRP-002 | M (2 dagen) | Veel callers, re-export discipline nodig         |
| SRP-003 | M (2 dagen) | 3 pipelines, voorzichtig met test-mocks          |
| SRP-004 | S (0.5 dag) | Dev-tool, beperkte test-druk                     |
| SRP-005 | S (1 dag)   | 4 onafhankelijke functies                        |
| SRP-006 | M (1.5 dag) | Concern-isolation, mogelijke import-aanpassingen |
| SRP-007 | S (0.5 dag) | Dev-tool                                         |
| SRP-008 | S (1 dag)   | Devhub UI, URL-state validatie                   |
| SRP-009 | M (2 dagen) | Megafunctie opbreken, fases isoleren             |
| SRP-010 | S (1 dag)   | Standaard cluster-split                          |
| SRP-011 | M (2 dagen) | Megafunctie + pipeline-orchestratie              |
| SRP-012 | S (1 dag)   | Standaard cluster-split                          |

**Totaal:** ~14.5 dagen. Met cluster-aanpak (AI-pipeline + dev-tools) mogelijk te comprimeren naar ~11 dagen.

## Acceptance globaal

- Geen file > 300 regels behalve auto-generated (`packages/database/src/types/database.ts`)
- Geen component > 200 regels
- `npm run check:queries`, lint, type-check, test groen na elke sprint
- Tests groen zonder assertion-versoepeling (CLAUDE.md anti-laundering, §Tests)
- Externe imports onveranderd waar mogelijk (re-export via `index.ts`)

## Bekende risico's

1. **Test-mock-paden breken.** Tests die internals mocken (anti-laundering verbod, maar legacy tests bestaan) kunnen falen. Niet versoepelen — repareren.
2. **Circular imports.** Sub-files mogen niet uit `index.ts` importeren. `index.ts` is alleen re-export, niet entry voor interne resolution.
3. **CLAUDE.md "geen drive-by-fixes".** Tijdens splits niet adjacent code aanraken (formatting, naamgeving). Alleen orphans (imports die door split unused worden) opruimen.
4. **Behavior-tests zijn leidend.** Deze sprints zijn pure structuur-refactors — gedrag mag NIET wijzigen. Als een test rood wordt, is de refactor stuk, niet de test.
