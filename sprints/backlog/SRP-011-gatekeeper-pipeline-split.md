# Micro Sprint SRP-011: gatekeeper-pipeline.ts opbreken in fases

## Doel

`packages/ai/src/pipeline/gatekeeper-pipeline.ts` is **426 regels** met één export (`processMeeting`) die alle pipeline-fases sequentieel uitvoert. Vergelijkbaar patroon als SRP-009 (link-themes): één megafunctie die niet per fase getest kan worden. Na deze sprint: orchestrator + per-fase-modules.

## Probleem

- 426 regels, waarvan `processMeeting` ~330 regels (regel 89-426)
- Eén functie doet: gatekeeper-LLM-call → project-identification → tagger → theme-detection → entity-resolution → segment-build → orchestratie naar `pipeline/steps/*` modules
- Constanten staan losliggend (`THEME_DETECTOR_MIN_RELEVANCE`)
- Mocking voor tests is moeilijk omdat de fases binnen één functie hangen

## Voorgestelde structuur

```
packages/ai/src/pipeline/gatekeeper/
├── index.ts                       ← processMeeting orchestrator (≤ 120 regels)
├── types.ts                       ← MeetingInput, PipelineResult + fase-input/output types
├── constants.ts                   ← THEME_DETECTOR_MIN_RELEVANCE + andere drempels
├── classify.ts                    ← gatekeeper LLM-call (board / project / niet-zakelijk)
├── identify-projects.ts           ← project-identification fase
├── detect-themes.ts               ← theme-detector call + filter op relevance
└── orchestrate-steps.ts           ← coördinatie naar tagger, link-themes, entity-resolution
```

**Naam-conventie:** `pipeline/gatekeeper/` (folder) ipv `gatekeeper-pipeline.ts` — consistent met `pipeline/summary/`, `pipeline/email/`, `pipeline/steps/`.

## Migratie-stappen

1. Lees `processMeeting` in detail; identificeer waar de fase-grenzen zitten (commentaren, async-blocks, conditional-skips)
2. Maak folder + types
3. Per fase een functie met expliciete input/output, geen shared mutable state
4. Orchestrator (`index.ts`): sequentiële calls + skip-logica + result-samenstelling
5. **Critical:** behoud bestaande skip-paden (board-meetings, niet-zakelijk, lege catalogus) — deze zijn de gatekeeper-essentie
6. Update import in `processMeeting` callers (likely `packages/ai/src/index.ts` of direct vanuit cockpit-actions)
7. Tests in `packages/ai/__tests__/pipeline/gatekeeper-pipeline.test.ts` of vergelijkbaar — assertions onveranderd, alleen mock-paden mogen aangepast

## Deliverables

- [ ] `pipeline/gatekeeper/` folder met 6-7 files
- [ ] Oude `gatekeeper-pipeline.ts` verwijderd
- [ ] Orchestrator < 120 regels
- [ ] Geen fase-functie > 100 regels
- [ ] Skip-paden expliciet getest (en blijven werken)
- [ ] Re-export uit `pipeline/index.ts` of via folder-resolution: `processMeeting` blijft importeerbaar als `from "@repo/ai/pipeline/gatekeeper-pipeline"` (of via package-export-map als die bestaat)
- [ ] Lint, type-check, test groen

## Acceptance criteria

- Orchestrator bevat alleen `if/await/return`, geen LLM-prompt-bouw of DB-mutaties
- Elke fase-functie testbaar in isolatie (input mock, output assertion)
- Bestaande end-to-end gatekeeper-tests groen zonder assertion-versoepeling
- Skip-paden voor board / niet-zakelijk / lege catalogus expliciet aanwezig in orchestrator-code

## Out of scope

- Pipeline-gedrag wijzigen (skip-logica, drempels, model-keuze)
- Theme-detector of tagger zelf opsplitsen (eigen sprints SRP-006, SRP-009)
- Parallelle uitvoering van fases waar het kan (optimalisatie, eigen sprint)
- Migratie naar agent-SDK orchestratie
